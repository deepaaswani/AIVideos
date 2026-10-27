import { createHash } from 'node:crypto';
import { execFile } from 'node:child_process';
import { readFile, writeFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { promisify } from 'node:util';
import { RenderInternals } from '@remotion/renderer';

export const rootDir = fileURLToPath(new URL('../', import.meta.url));
export const narratedMode = process.argv.includes('--narrated');
export const renderMode = narratedMode ? 'narrated-authored-fixture' : 'silent-authored-fixture';
export const outputDir = resolve(
  rootDir,
  narratedMode ? 'prototype-results/narrated' : 'prototype-results/p0',
);
export const runFile = promisify(execFile);

export function mediaBinary(type: 'ffmpeg' | 'ffprobe') {
  // Isolate the pinned renderer version's platform-binary resolver here.
  return RenderInternals.getExecutablePath({
    type,
    indent: false,
    logLevel: 'error',
    binariesDirectory: null,
  });
}

export function browserExecutable() {
  const configured = process.env.REMOTION_BROWSER_EXECUTABLE;
  if (configured) {
    if (!existsSync(configured)) throw new Error('REMOTION_BROWSER_EXECUTABLE does not exist.');
    return configured;
  }
  return [
    'C:/Program Files/Google/Chrome/Application/chrome.exe',
    'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
    '/usr/bin/google-chrome',
    '/usr/bin/chromium',
    '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  ].find(existsSync);
}

export async function sha256(path: string) {
  return createHash('sha256')
    .update(await readFile(path))
    .digest('hex');
}

export async function inputHashes() {
  const paths = [
    'package-lock.json',
    'packages/contracts/src/index.ts',
    'packages/contracts/src/storyboard.generated.ts',
    'docs/step-1/contracts/storyboard.schema.json',
    'docs/step-1/fixtures/storyboard.fixture.json',
    'docs/step-1/fixtures/source.fixture.json',
    'packages/video/src/StoryboardVideo.tsx',
    'packages/video/src/templates.tsx',
    'packages/video/src/timeline.ts',
    'packages/video/src/narration.ts',
    'packages/video/src/font.ts',
    'packages/video/src/fixture.ts',
    'packages/video/src/remotion-entry.tsx',
    'scripts/prototype-common.ts',
    'scripts/prototype-render.ts',
    'scripts/prototype-inspect.ts',
    'scripts/narrated-input.ts',
    'packages/video/public/prototype/fonts/inter-latin-600-normal.woff2',
  ];
  if (narratedMode) {
    paths.push('prototype-results/narrated/narration.json');
    const manifest = JSON.parse(
      await readFile(resolve(rootDir, 'prototype-results/narrated/narration.json'), 'utf8'),
    ) as { clips: { audioSrc: string }[] };
    for (const clip of manifest.clips) {
      if (!/^\/prototype\/narration\/[a-f0-9]{64}\.mp3$/.test(clip.audioSrc))
        throw new Error('Invalid narration asset path.');
      paths.push(`packages/video/public${clip.audioSrc}`);
    }
  }
  return Object.fromEntries(
    await Promise.all(paths.map(async (path) => [path, await sha256(resolve(rootDir, path))])),
  );
}

export async function writeReport(name: string, value: unknown) {
  await writeFile(resolve(outputDir, name), `${JSON.stringify(value, null, 2)}\n`);
}
