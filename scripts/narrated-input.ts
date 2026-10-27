import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { fixtureStoryboard, validateNarrationManifest } from '@aivideos/video';
import { mediaBinary, rootDir, runFile, sha256 } from './prototype-common';

/** Offline only: reject absent, stale, altered or incorrectly measured audio. */
export async function loadNarratedInput() {
  let raw: unknown;
  try {
    raw = JSON.parse(
      await readFile(resolve(rootDir, 'prototype-results/narrated/narration.json'), 'utf8'),
    );
  } catch {
    throw new Error('Narration is unavailable. Run npm run narration:generate explicitly first.');
  }
  const narration = validateNarrationManifest(fixtureStoryboard, raw);
  for (const [index, clip] of narration.clips.entries()) {
    const scene = fixtureStoryboard.scenes[index]!;
    const textHash = createHash('sha256').update(scene.narration).digest('hex');
    if (clip.textSha256 !== textHash) throw new Error(`Stale narration text for ${scene.id}.`);
    const path = resolve(rootDir, `packages/video/public${clip.audioSrc}`);
    if ((await sha256(path)) !== clip.audioSha256)
      throw new Error(`Narration audio hash mismatch for ${scene.id}.`);
    const probe = await runFile(mediaBinary('ffprobe'), [
      '-v',
      'error',
      '-show_format',
      '-of',
      'json',
      path,
    ]);
    const duration = Number(
      (JSON.parse(probe.stdout) as { format: { duration: string } }).format.duration,
    );
    if (!Number.isFinite(duration) || Math.abs(duration - clip.durationSeconds) > 0.02) {
      throw new Error(`Narration duration mismatch for ${scene.id}.`);
    }
  }
  return narration;
}
