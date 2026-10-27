import { mkdir, readFile, readdir, stat } from 'node:fs/promises';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { buildTimeline, fixtureSource, fixtureStoryboard } from '@aivideos/video';
import { validateStoryboard } from '@aivideos/contracts';
import sharp from 'sharp';
import {
  inputHashes,
  mediaBinary,
  narratedMode,
  outputDir,
  renderMode,
  rootDir,
  runFile,
  sha256,
  writeReport,
} from './prototype-common';
import { loadNarratedInput } from './narrated-input';

interface Probe {
  streams: {
    codec_type: string;
    codec_name: string;
    width?: number;
    height?: number;
    avg_frame_rate?: string;
    nb_read_frames?: string;
    pix_fmt?: string;
  }[];
  format: { duration: string; format_name: string };
}

/** Compare decoded AAC with the complete source clip, allowing small codec/resampling delay. */
function waveformMatch(source: Buffer, exported: Buffer) {
  const count = Math.min(source.length, exported.length) / 2;
  let best = { correlation: 0, lagMs: 0 };
  for (let lag = -400; lag <= 400; lag++) {
    let dot = 0;
    let sourcePower = 0;
    let outputPower = 0;
    for (let sample = 800; sample < count - 800; sample += 4) {
      const a = source.readInt16LE(sample * 2);
      const b = exported.readInt16LE((sample + lag) * 2);
      dot += a * b;
      sourcePower += a * a;
      outputPower += b * b;
    }
    const correlation = dot / Math.sqrt(sourcePower * outputPower);
    if (correlation > best.correlation) best = { correlation, lagMs: lag / 8 };
  }
  return best;
}

function pcmVolume(samples: Buffer) {
  let squared = 0;
  let peak = 0;
  for (let offset = 0; offset < samples.length; offset += 2) {
    const value = samples.readInt16LE(offset) / 32768;
    squared += value * value;
    peak = Math.max(peak, Math.abs(value));
  }
  return {
    meanDb: 20 * Math.log10(Math.sqrt(squared / (samples.length / 2))),
    peakDb: 20 * Math.log10(peak),
  };
}

function wavSamples(wav: Buffer) {
  if (wav.toString('ascii', 0, 4) !== 'RIFF' || wav.toString('ascii', 8, 12) !== 'WAVE')
    throw new Error('Expected decoded PCM WAV.');
  for (let offset = 12; offset + 8 <= wav.length;) {
    const size = wav.readUInt32LE(offset + 4);
    const start = offset + 8;
    if (wav.toString('ascii', offset, offset + 4) === 'data')
      return wav.subarray(start, Math.min(start + size, wav.length));
    offset = start + size + (size % 2);
  }
  throw new Error('Decoded audio has no PCM samples.');
}

async function performInspection() {
  await writeReport('validation.json', { status: 'pending', mode: renderMode });
  const validation = validateStoryboard(fixtureStoryboard, [fixtureSource]);
  if (!validation.success) throw new Error(validation.errors.join('; '));
  const manifest = JSON.parse(
    await readFile(resolve(outputDir, 'input-manifest.json'), 'utf8'),
  ) as { inputHashes: Record<string, string> };
  const runtime = JSON.parse(
    await readFile(resolve(outputDir, 'runtime-manifest.json'), 'utf8'),
  ) as { status: string };
  if (runtime.status !== 'exported')
    throw new Error('A complete successful export is required before inspection.');
  const currentHashes = await inputHashes();
  for (const [path, hash] of Object.entries(currentHashes)) {
    if (manifest.inputHashes[path] !== hash) throw new Error(`Export inputs are stale: ${path}`);
  }
  const videoPath = resolve(outputDir, 'output.mp4');
  const probe = await runFile(
    mediaBinary('ffprobe'),
    ['-v', 'error', '-count_frames', '-show_streams', '-show_format', '-of', 'json', videoPath],
    { maxBuffer: 10 * 1024 * 1024 },
  );
  const metadata = JSON.parse(probe.stdout) as Probe;
  const videos = metadata.streams.filter((stream) => stream.codec_type === 'video');
  const audios = metadata.streams.filter((stream) => stream.codec_type === 'audio');
  const video = videos[0];
  const narration = narratedMode ? await loadNarratedInput() : undefined;
  const timeline = buildTimeline(fixtureStoryboard, narration);
  const duration = Number(metadata.format.duration);
  const [fpsNumerator, fpsDenominator] = (video?.avg_frame_rate ?? '').split('/').map(Number);
  const fps = (fpsNumerator ?? NaN) / (fpsDenominator ?? NaN);
  const checks = {
    sourcesValid: true,
    currentInputHashesMatch: true,
    oneH264Video: videos.length === 1 && video?.codec_name === 'h264',
    mp4Container: metadata.format.format_name.split(',').includes('mp4'),
    dimensions1080x1920: video?.width === 1080 && video.height === 1920,
    fps30: fps === 30,
    yuv420p: video?.pix_fmt === 'yuv420p',
    expectedFrameCount: Number(video?.nb_read_frames) === timeline.durationInFrames,
    expectedDuration: Math.abs(duration - timeline.durationInFrames / timeline.fps) < 0.08,
    audioMode: narration
      ? audios.length === 1 && audios[0]?.codec_name === 'aac'
      : audios.length === 0,
  };
  await writeReport('encoding-report.json', metadata);
  // Decode every video frame; error-on-corruption rather than only opening the file.
  await runFile(
    mediaBinary('ffmpeg'),
    [
      '-v',
      'error',
      '-xerror',
      '-i',
      videoPath,
      '-map',
      '0:v:0',
      ...(narration ? ['-map', '0:a:0'] : []),
      '-c:v',
      'rawvideo',
      '-f',
      'null',
      '-',
    ],
    { maxBuffer: 10 * 1024 * 1024 },
  );
  const sceneAudio = [];
  if (narration) {
    await mkdir(resolve(outputDir, 'decoded-audio'), { recursive: true });
    for (const [index, entry] of timeline.scenes.entries()) {
      const clip = narration.clips[index]!;
      const fits =
        timeline.narrationLeadInFrames / timeline.fps + clip.durationSeconds <=
        entry.durationInFrames / timeline.fps;
      const referencePcm = resolve(outputDir, `decoded-audio/${index + 1}-source.wav`);
      const exportedPcm = resolve(outputDir, `decoded-audio/${index + 1}-export.wav`);
      for (const [input, output, seek] of [
        [resolve(rootDir, `packages/video/public${clip.audioSrc}`), referencePcm, '0'],
        [
          videoPath,
          exportedPcm,
          String((entry.from + timeline.narrationLeadInFrames) / timeline.fps),
        ],
      ]) {
        await runFile(mediaBinary('ffmpeg'), [
          '-v',
          'error',
          '-y',
          '-i',
          input!,
          '-ss',
          seek!,
          '-t',
          String(clip.durationSeconds),
          '-vn',
          '-ac',
          '1',
          '-ar',
          '8000',
          '-f',
          'wav',
          '-c:a',
          'pcm_s16le',
          output!,
        ]);
      }
      const exportedSamples = wavSamples(await readFile(exportedPcm));
      const referenceSamples = wavSamples(await readFile(referencePcm));
      const sampleCoverage = exportedSamples.length >= referenceSamples.length - 320;
      const match = waveformMatch(referenceSamples, exportedSamples);
      const { meanDb, peakDb } = pcmVolume(exportedSamples);
      sceneAudio.push({
        sceneId: entry.scene.id,
        measuredClipSeconds: clip.durationSeconds,
        meanDb,
        peakDb,
        fits,
        sampleCoverage,
        sourceSamples: referenceSamples.length / 2,
        exportSamples: exportedSamples.length / 2,
        audible: meanDb > -50 && peakDb > -35,
        ...match,
      });
    }
    Object.assign(checks, {
      everySceneHasAudibleAudio: sceneAudio.every((scene) => scene.audible),
      noSpeechTruncation: sceneAudio.every((scene) => scene.fits),
      fullClipSampleCoverage: sceneAudio.every((scene) => scene.sampleCoverage),
      everySceneMatchesSourceAudio: sceneAudio.every((scene) => scene.correlation > 0.9),
    });
  }
  const previews = JSON.parse(
    await readFile(resolve(outputDir, 'preview-frames.json'), 'utf8'),
  ) as {
    stills: { frame: number; sceneId: string }[];
  };
  await mkdir(resolve(outputDir, 'decoded'), { recursive: true });
  const decodedTiles = [];
  for (const [index, { frame }] of previews.stills.entries()) {
    const imagePath = resolve(outputDir, `decoded/scene-${index + 1}.png`);
    await runFile(mediaBinary('ffmpeg'), [
      '-v',
      'error',
      '-y',
      '-ss',
      String(frame / timeline.fps),
      '-i',
      videoPath,
      '-frames:v',
      '1',
      '-c:v',
      'png',
      imagePath,
    ]);
    decodedTiles.push(await sharp(imagePath).resize(270, 480).png().toBuffer());
  }
  await sharp({
    create: { width: 270 * decodedTiles.length, height: 480, channels: 3, background: '#F8FAFC' },
  })
    .composite(decodedTiles.map((input, index) => ({ input, left: index * 270, top: 0 })))
    .png()
    .toFile(resolve(outputDir, 'decoded-contact-sheet.png'));
  const transitionTiles = [];
  const transitions = [];
  for (const [index, entry] of timeline.scenes.entries()) {
    if (index === 0) continue;
    for (const frame of [entry.from - 1, entry.from + 12]) {
      const path = resolve(outputDir, `decoded/transition-${index}-${frame}.png`);
      await runFile(mediaBinary('ffmpeg'), [
        '-v',
        'error',
        '-y',
        '-ss',
        String(frame / timeline.fps),
        '-i',
        videoPath,
        '-frames:v',
        '1',
        '-c:v',
        'png',
        path,
      ]);
      transitionTiles.push(await sharp(path).resize(180, 320).png().toBuffer());
      transitions.push({
        frame,
        nextScene: entry.scene.id,
        filename: `decoded/transition-${index}-${frame}.png`,
      });
    }
  }
  await sharp({
    create: {
      width: 180 * transitionTiles.length,
      height: 320,
      channels: 3,
      background: '#F8FAFC',
    },
  })
    .composite(transitionTiles.map((input, index) => ({ input, left: index * 180, top: 0 })))
    .png()
    .toFile(resolve(outputDir, 'decoded-transition-contact-sheet.png'));
  const files = [
    'output.mp4',
    'thumbnail.jpg',
    'contact-sheet.png',
    'stress-contact-sheet.png',
    'decoded-contact-sheet.png',
    'decoded-transition-contact-sheet.png',
    ...transitions.map((transition) => transition.filename),
    ...previews.stills.map((_, index) => `decoded/scene-${index + 1}.png`),
    ...(await readdir(resolve(outputDir, 'frames')))
      .filter((file) => file.endsWith('.png'))
      .map((file) => `frames/${file}`),
    ...(await readdir(resolve(outputDir, 'stress')))
      .filter((file) => file.endsWith('.png'))
      .map((file) => `stress/${file}`),
  ];
  const artifacts = await Promise.all(
    files.map(async (filename) => ({
      filename,
      bytes: (await stat(resolve(outputDir, filename))).size,
      sha256: await sha256(resolve(outputDir, filename)),
    })),
  );
  const passed = Object.values(checks).every(Boolean);
  await writeReport('validation.json', {
    checkedAt: new Date().toISOString(),
    mode: renderMode,
    status: passed ? 'passed-automated-media-checks' : 'failed',
    checks: { ...checks, fullyDecoded: true },
    artifacts,
    sceneAudio,
    transitions,
    timing: {
      seconds: timeline.durationInFrames / timeline.fps,
      targetSeconds: [27, 33],
      issue: timeline.timingIssue,
    },
    humanVisualReview: 'Not established by this automated script. Record inspection separately.',
    pending: [
      narration ? 'Caption alignment and SRT' : 'P1 narration and caption alignment',
      'Physical mobile devices',
      'Durable jobs and access control',
      'Ten-run performance and cost benchmark',
    ],
  });
  if (!passed)
    throw new Error(
      `Media inspection failed: ${Object.entries(checks)
        .filter(([, value]) => !value)
        .map(([key]) => key)
        .join(', ')}`,
    );
  console.log(
    `Media inspection passed: H.264 MP4, 1080x1920, 30 fps, ${timeline.durationInFrames} frames / ${timeline.durationInFrames / timeline.fps} seconds, ${narration ? 'audible AAC narration in every scene' : 'no audio stream'}, full decode.`,
  );
}

export async function inspectPrototype() {
  try {
    await performInspection();
  } catch (error: unknown) {
    await writeReport('validation.json', {
      checkedAt: new Date().toISOString(),
      mode: renderMode,
      status: 'failed',
      reason: error instanceof Error ? error.message : String(error),
    }).catch(() => undefined);
    throw error;
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  inspectPrototype().catch((error: unknown) => {
    console.error(error);
    process.exitCode = 1;
  });
}
