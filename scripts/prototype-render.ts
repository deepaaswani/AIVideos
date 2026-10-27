import { mkdir, readFile } from 'node:fs/promises';
import { cpus, totalmem } from 'node:os';
import { resolve } from 'node:path';
import { performance } from 'node:perf_hooks';
import { bundle } from '@remotion/bundler';
import { openBrowser, renderMedia, renderStill, selectComposition } from '@remotion/renderer';
import sharp from 'sharp';
import { validateStoryboard } from '@aivideos/contracts';
import { buildTimeline, COMPOSITION_ID, fixtureSource, fixtureStoryboard } from '@aivideos/video';
import {
  browserExecutable,
  inputHashes,
  narratedMode,
  outputDir,
  renderMode,
  rootDir,
  writeReport,
} from './prototype-common';
import { inspectPrototype } from './prototype-inspect';
import { loadNarratedInput } from './narrated-input';

async function contactSheet(paths: string[], name: string) {
  const width = 270;
  const height = 480;
  const tiles = await Promise.all(
    paths.map(async (path) => sharp(path).resize(width, height).png().toBuffer()),
  );
  await sharp({
    create: { width: width * paths.length, height, channels: 3, background: '#F8FAFC' },
  })
    .composite(tiles.map((input, index) => ({ input, left: index * width, top: 0 })))
    .png()
    .toFile(resolve(outputDir, name));
}

async function main() {
  const imagesOnly = process.argv.includes('--images-only');
  const validation = validateStoryboard(fixtureStoryboard, [fixtureSource]);
  if (!validation.success) throw new Error(validation.errors.join('; '));
  const narration = narratedMode ? await loadNarratedInput() : undefined;
  const timeline = buildTimeline(validation.data, narration);
  if (timeline.timingIssue) console.warn(timeline.timingIssue);
  const concurrency = Number(process.env.P0_CONCURRENCY ?? '2');
  if (!Number.isInteger(concurrency) || concurrency < 1 || concurrency > 8) {
    throw new Error('P0_CONCURRENCY must be an integer from 1 to 8.');
  }
  await mkdir(outputDir, { recursive: true });
  await mkdir(resolve(outputDir, 'frames'), { recursive: true });
  await mkdir(resolve(outputDir, 'stress'), { recursive: true });
  const startedAt = new Date().toISOString();
  const start = performance.now();
  await writeReport('validation.json', { status: 'pending', mode: renderMode });
  const rendererPackage = JSON.parse(
    await readFile(resolve(rootDir, 'node_modules/@remotion/renderer/package.json'), 'utf8'),
  ) as { version: string };
  await writeReport('input-manifest.json', {
    mode: renderMode,
    compositionId: COMPOSITION_ID,
    sourceReferencesValidated: true,
    inputHashes: await inputHashes(),
    storyboard: fixtureStoryboard,
    timeline,
    narration,
    note: narration
      ? 'Measured ElevenLabs narration; captions and SRT remain pending.'
      : 'Estimated authored scene timings; no measured narration, captions, or providers.',
  });
  const runtime = {
    startedAt,
    status: 'rendering',
    remotionVersion: rendererPackage.version,
    node: process.version,
    platform: process.platform,
    architecture: process.arch,
    cpu: cpus()[0]?.model,
    logicalCpus: cpus().length,
    memoryGiB: Math.round(totalmem() / 1024 ** 3),
    concurrency,
    providerCalls: 0,
    hostedProviderCostUsd: 0,
    computeCost: 'Local compute used; monetary allocation not measured.',
  };
  await writeReport('runtime-manifest.json', runtime);
  console.log(
    `Bundling the source-validated ${narration ? 'narrated' : 'silent P0'} composition...`,
  );
  const bundleStart = performance.now();
  const serveUrl = await bundle({
    entryPoint: resolve(rootDir, 'packages/video/src/remotion-entry.tsx'),
    publicDir: resolve(rootDir, 'packages/video/public'),
    outDir: resolve(outputDir, 'bundle'),
    enableCaching: true,
  });
  const bundleMs = performance.now() - bundleStart;
  const browser = await openBrowser('chrome', {
    browserExecutable: browserExecutable(),
    logLevel: 'warn',
  });
  try {
    const inputProps = { storyboard: fixtureStoryboard, narration };
    const composition = await selectComposition({
      serveUrl,
      id: COMPOSITION_ID,
      inputProps,
      puppeteerInstance: browser,
    });
    let lastProgress = -1;
    const renderStart = performance.now();
    if (!imagesOnly)
      await renderMedia({
        serveUrl,
        composition,
        inputProps,
        puppeteerInstance: browser,
        outputLocation: resolve(outputDir, 'output.mp4'),
        codec: 'h264',
        pixelFormat: 'yuv420p',
        colorSpace: 'bt709',
        imageFormat: 'png',
        crf: 18,
        muted: !narration,
        audioCodec: narration ? 'aac' : undefined,
        audioBitrate: narration ? '192k' : undefined,
        enforceAudioTrack: false,
        concurrency,
        overwrite: true,
        onProgress: ({ progress }) => {
          const step = Math.floor(progress * 10);
          if (step > lastProgress) {
            lastProgress = step;
            console.log(`Video render ${Math.min(step * 10, 100)}%`);
          }
        },
      });
    const renderMs = performance.now() - renderStart;
    const stillStart = performance.now();
    const frames: string[] = [];
    const stills = [];
    for (const [index, entry] of timeline.scenes.entries()) {
      const frame = entry.from + Math.min(45, entry.durationInFrames - 1);
      const filename = `frames/scene-${index + 1}-${entry.scene.template}.png`;
      const path = resolve(outputDir, filename);
      await renderStill({
        serveUrl,
        composition,
        inputProps,
        puppeteerInstance: browser,
        frame,
        imageFormat: 'png',
        output: path,
      });
      frames.push(path);
      stills.push({ filename, frame, sceneId: entry.scene.id });
    }
    await renderStill({
      serveUrl,
      composition,
      inputProps,
      puppeteerInstance: browser,
      frame: 60,
      imageFormat: 'jpeg',
      jpegQuality: 90,
      output: resolve(outputDir, 'thumbnail.jpg'),
    });
    await contactSheet(frames, 'contact-sheet.png');

    // Maximum permitted authored text lengths, including unbroken wide glyphs.
    const stressBoard = structuredClone(fixtureStoryboard);
    stressBoard.brand.displayName = 'W'.repeat(60);
    for (const scene of stressBoard.scenes) {
      scene.onScreenTitle = 'W'.repeat(54);
      scene.visualItems = scene.visualItems.map(() => 'W'.repeat(50)) as typeof scene.visualItems;
    }
    const stressValidation = validateStoryboard(stressBoard, [fixtureSource]);
    if (!stressValidation.success) throw new Error(stressValidation.errors.join('; '));
    const stressComposition = await selectComposition({
      serveUrl,
      id: COMPOSITION_ID,
      inputProps: { storyboard: stressBoard, narration },
      puppeteerInstance: browser,
    });
    const stressFrames: string[] = [];
    for (const index of [0, 1, 4]) {
      const entry = timeline.scenes[index]!;
      const path = resolve(outputDir, `stress/${entry.scene.template}.png`);
      await renderStill({
        serveUrl,
        composition: stressComposition,
        inputProps: { storyboard: stressBoard, narration },
        puppeteerInstance: browser,
        frame: entry.from + 60,
        imageFormat: 'png',
        output: path,
      });
      stressFrames.push(path);
    }
    await contactSheet(stressFrames, 'stress-contact-sheet.png');
    await writeReport('preview-frames.json', {
      stills,
      stress:
        'Schema-maximum title, brand and item lengths using wide unbroken W glyphs. Visual review still required.',
    });
    await writeReport('runtime-manifest.json', {
      ...runtime,
      status: imagesOnly ? 'images-only' : 'exported',
      finishedAt: new Date().toISOString(),
      bundleMs: Math.round(bundleMs),
      renderMs: Math.round(renderMs),
      previewImagesMs: Math.round(performance.now() - stillStart),
      totalExportMs: Math.round(performance.now() - start),
      benchmarkScope: 'One local run; not a ten-run benchmark or deployment performance claim.',
    });
  } finally {
    await browser.close({ silent: true });
  }
  if (imagesOnly) {
    console.log('Preview images exported; MP4 rendering and media inspection were skipped.');
    return;
  }
  await inspectPrototype();
  console.log(
    `${renderMode} exported to ${outputDir}. Inspect the MP4 and contact sheets before recording visual acceptance.`,
  );
}

main().catch(async (error: unknown) => {
  await writeReport('validation.json', {
    checkedAt: new Date().toISOString(),
    mode: renderMode,
    status: 'failed',
    reason: error instanceof Error ? error.message : String(error),
  }).catch(() => undefined);
  console.error(error);
  process.exitCode = 1;
});
