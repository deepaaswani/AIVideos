import { copyFile, mkdir, writeFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { loadEnvFile } from 'node:process';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { validateStoryboard } from '@aivideos/contracts';
import {
  buildTimeline,
  fixtureSource,
  fixtureStoryboard,
  type NarrationManifest,
} from '@aivideos/video';
import { getOrGenerateScene, narrationSettings, preflightAudioDecoder } from './narration-cache';
import { rootDir } from './prototype-common';

const narratedDir = resolve(rootDir, 'prototype-results/narrated');
const cacheRoot = resolve(rootDir, 'prototype-results/narration/cache');

/** Explicit CLI only. Preview and render commands must never call this function. */
export async function generateNarration() {
  const environmentFile = resolve(rootDir, 'apps/web/.env.local');
  if (existsSync(environmentFile)) loadEnvFile(environmentFile);
  const voiceId = process.env.MALE_INDIAN_VOICE_KEY?.trim();
  const apiKey = process.env.ELEVENLABS_API_KEY?.trim();
  if (!voiceId) throw new Error('MALE_INDIAN_VOICE_KEY is missing; no provider request was made.');
  const validation = validateStoryboard(fixtureStoryboard, [fixtureSource]);
  if (!validation.success || fixtureStoryboard.scenes.length !== 5) {
    throw new Error('The source-validated five-scene authored fixture is required.');
  }
  await preflightAudioDecoder();
  await mkdir(narratedDir, { recursive: true });
  for (const directory of [
    'apps/web/public/prototype/narration',
    'packages/video/public/prototype/narration',
  ]) {
    await mkdir(resolve(rootDir, directory), { recursive: true });
  }
  let requestsMade = 0;
  let cacheHits = 0;
  const scenes: {
    sceneId: string;
    durationSeconds: number;
    reused: boolean;
    meanVolumeDb: number;
  }[] = [];
  const manifest: NarrationManifest = { version: 1, clips: [] };
  const report = (status: string, reason?: string) => ({
    generatedAt: new Date().toISOString(),
    status,
    provider: narrationSettings.provider,
    modelId: narrationSettings.modelId,
    outputFormat: narrationSettings.outputFormat,
    providerRequestsAttempted: requestsMade,
    cacheHits,
    authorizedSceneLimit: 5,
    charactersInAuthoredFixture: fixtureStoryboard.scenes.reduce(
      (sum, scene) => sum + scene.narration.length,
      0,
    ),
    automaticRetries: 0,
    scenes,
    ...(reason ? { reason } : {}),
    billing:
      'Requests may consume ElevenLabs credits. Monetary charge is not provided by this endpoint and is not inferred.',
    captions: 'Not implemented; no word alignment, burned captions or SRT.',
  });
  try {
    // Sequential and bounded: each of the five authored scenes can claim at most one request.
    for (const scene of fixtureStoryboard.scenes) {
      const result = await getOrGenerateScene({
        cacheRoot,
        sceneId: scene.id,
        text: scene.narration,
        voiceId,
        apiKey,
        onRequest: () => {
          requestsMade++;
        },
      });
      if (result.reused) cacheHits++;
      const filename = `${result.key}.mp3`;
      for (const directory of [
        'apps/web/public/prototype/narration',
        'packages/video/public/prototype/narration',
      ]) {
        await copyFile(result.audioPath, resolve(rootDir, directory, filename));
      }
      manifest.clips.push({
        sceneId: scene.id,
        textSha256: result.textSha256,
        audioSrc: `/prototype/narration/${filename}`,
        durationSeconds: result.durationSeconds,
        audioSha256: result.audioSha256,
      });
      scenes.push({
        sceneId: scene.id,
        durationSeconds: result.durationSeconds,
        reused: result.reused,
        meanVolumeDb: result.meanVolumeDb,
      });
      console.log(
        `${scene.id}: ${result.reused ? 'validated cache' : 'generated'}; ${result.durationSeconds.toFixed(3)} seconds.`,
      );
    }
    const timeline = buildTimeline(fixtureStoryboard, manifest);
    const durationSeconds = timeline.durationInFrames / timeline.fps;
    // Publish only a complete five-scene manifest. Existing manifests are never replaced with partial or fake audio.
    await writeFile(
      resolve(narratedDir, 'narration.json'),
      `${JSON.stringify(manifest, null, 2)}\n`,
    );
    await writeFile(
      resolve(narratedDir, 'generation-report.json'),
      `${JSON.stringify({ ...report('complete'), durationSeconds, timingIssue: timeline.timingIssue }, null, 2)}\n`,
    );
    console.log(
      `Narration ready: ${requestsMade} provider requests attempted; ${cacheHits} validated cache hits; measured timeline ${durationSeconds.toFixed(3)} seconds.`,
    );
    if (timeline.timingIssue) console.warn(`Timing issue: ${timeline.timingIssue}`);
    return manifest;
  } catch (error) {
    const reason = error instanceof Error ? error.message : 'Narration generation failed.';
    await writeFile(
      resolve(narratedDir, 'generation-report.json'),
      `${JSON.stringify(report('failed', reason), null, 2)}\n`,
    );
    console.error(
      `Generation stopped: ${requestsMade} provider requests attempted; ${cacheHits} validated cache hits. No automatic retry.`,
    );
    throw error;
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  generateNarration().catch((error: unknown) => {
    // Never print fetch errors, request objects, URLs, environment values or raw provider bodies.
    console.error(error instanceof Error ? error.message : 'Narration generation failed.');
    process.exitCode = 1;
  });
}
