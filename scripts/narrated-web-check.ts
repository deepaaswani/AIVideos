import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { openBrowser } from '@remotion/renderer';
import { buildTimeline, fixtureStoryboard, type NarrationManifest } from '@aivideos/video';
import { browserExecutable, rootDir } from './prototype-common';

const outputDir = resolve(rootDir, 'prototype-results/narrated');
const url = new URL(
  '/prototype?mode=narrated',
  process.env.PROTOTYPE_BASE_URL ?? 'http://127.0.0.1:3100',
);
const sleep = (ms: number) => new Promise((done) => setTimeout(done, ms));
const expectUnavailable = process.argv.includes('--expect-unavailable');
let reportWritten = false;
type BrowserPage = Awaited<ReturnType<Awaited<ReturnType<typeof openBrowser>>['newPage']>>;

async function waitForSceneAudio(
  page: BrowserPage,
  expected: { from: number; end: number; minimumFrame: number; audioSrc: string },
) {
  const deadline = Date.now() + 15_000;
  while (Date.now() < deadline) {
    const ready = await page.evaluate((entry) => {
      const expectedScene = entry as {
        from: number;
        end: number;
        minimumFrame: number;
        audioSrc: string;
      };
      const frame = Number(
        document.querySelector<HTMLElement>('[data-current-frame]')?.dataset.currentFrame,
      );
      const active = document.querySelector<HTMLElement>('button[aria-current="step"]');
      const audio = Array.from(document.querySelectorAll<HTMLAudioElement>('audio')).find(
        (element) => element.currentSrc.endsWith(expectedScene.audioSrc),
      );
      return (
        Number(active?.dataset.sceneFrom) === expectedScene.from &&
        frame >= expectedScene.minimumFrame &&
        frame < expectedScene.end &&
        Boolean(
          audio &&
          audio.readyState >= 2 &&
          !audio.error &&
          !audio.paused &&
          audio.currentTime > 0.1,
        )
      );
    }, expected);
    if (ready) return true;
    await sleep(100);
  }
  return false;
}

async function writeReport(value: unknown) {
  await mkdir(outputDir, { recursive: true });
  await writeFile(
    resolve(outputDir, expectUnavailable ? 'unavailable-web-check.json' : 'web-check.json'),
    `${JSON.stringify(value, null, 2)}\n`,
  );
}

async function checkUnavailable() {
  await mkdir(outputDir, { recursive: true });
  const browser = await openBrowser('chrome', {
    browserExecutable: browserExecutable(),
    logLevel: 'warn',
  });
  const errors: string[] = [];
  const networkOrigins = new Set<string>();
  const results = [];
  try {
    for (const [pageIndex, viewport] of [
      { width: 1440, height: 1000, deviceScaleFactor: 1 },
      { width: 390, height: 844, deviceScaleFactor: 1 },
    ].entries()) {
      const page = await browser.newPage({
        context: () => null,
        logLevel: 'warn',
        indent: false,
        pageIndex,
        onBrowserLog: null,
        onLog: () => undefined,
      });
      page.on('error', (error) => errors.push(error.message));
      page._client().on('Network.requestWillBeSent', (event: unknown) => {
        const requestUrl = (event as { request?: { url?: string } })?.request?.url;
        if (!requestUrl) return;
        const origin = new URL(requestUrl).origin;
        if (origin !== 'null') networkOrigins.add(origin);
      });
      await page.setViewport(viewport);
      const response = await page.goto({ url: url.href, timeout: 30_000 });
      if (!response || ![200, 304].includes(response.status())) {
        throw new Error(
          `Unavailable narrated preview returned HTTP ${response?.status() ?? 'no response'}.`,
        );
      }
      let alertReady = false;
      for (let attempt = 0; attempt < 50; attempt++) {
        alertReady = await page.evaluate(() => Boolean(document.querySelector('[role="alert"]')));
        if (alertReady) break;
        await sleep(100);
      }
      // Allow hydration and any prefetches to finish before checking for a substitute player.
      await sleep(500);
      const state = await page.evaluate(() => {
        const silentLink = Array.from(document.querySelectorAll<HTMLAnchorElement>('a')).find(
          (link) => link.textContent?.trim() === 'Silent P0',
        );
        return {
          alert: document.querySelector('[role="alert"]')?.textContent?.trim() ?? null,
          playerCount: document.querySelectorAll('[data-narration-mode]').length,
          audioCount: document.querySelectorAll('audio').length,
          playControlCount: document.querySelectorAll('button[aria-label="Play video"]').length,
          silentSubstitute:
            Boolean(document.querySelector('[data-narration-mode="silent"]')) ||
            document.body.textContent?.includes('Silent fixture preview') === true,
          silentNavigation: silentLink?.getAttribute('href') === '/prototype',
          narratedModeSelected:
            document
              .querySelector('a[href="/prototype?mode=narrated"]')
              ?.getAttribute('aria-current') === 'page',
          horizontalOverflow: document.documentElement.scrollWidth > innerWidth + 1,
        };
      });
      const passed =
        alertReady &&
        /unavailable|not (?:been )?generated/i.test(state.alert ?? '') &&
        state.playerCount === 0 &&
        state.audioCount === 0 &&
        state.playControlCount === 0 &&
        !state.silentSubstitute &&
        state.silentNavigation &&
        state.narratedModeSelected &&
        !state.horizontalOverflow;
      const screenshot = await page._client().send('Page.captureScreenshot', {
        format: 'png',
        captureBeyondViewport: false,
      });
      const filename = `unavailable-web-${viewport.width}x${viewport.height}.png`;
      await writeFile(resolve(outputDir, filename), Buffer.from(screenshot.value.data, 'base64'));
      results.push({ viewport, screenshot: filename, passed, ...state });
      await page.close();
    }
  } finally {
    await browser.close({ silent: true });
  }
  const noProviderRequests = Array.from(networkOrigins).every((origin) => origin === url.origin);
  const passed =
    results.every((result) => result.passed) && noProviderRequests && errors.length === 0;
  await writeReport({
    checkedAt: new Date().toISOString(),
    status: passed ? 'passed' : 'failed',
    url: url.href,
    scope:
      'Production narrated preview unavailable state after provider rejection; no narration manifest, generation or substitute audio used.',
    noProviderRequests,
    networkOrigins: Array.from(networkOrigins),
    errors,
    results,
  });
  reportWritten = true;
  if (!passed)
    throw new Error(
      'Unavailable narration checks failed; inspect prototype-results/narrated/unavailable-web-check.json.',
    );
  console.log(
    'Unavailable narrated preview passed desktop/mobile checks: accurate alert, no player/audio substitution, Silent P0 navigation and no provider requests.',
  );
}

async function main() {
  if (expectUnavailable) return checkUnavailable();
  const narration = JSON.parse(
    await readFile(resolve(outputDir, 'narration.json'), 'utf8'),
  ) as NarrationManifest;
  const timeline = buildTimeline(fixtureStoryboard, narration);
  const browser = await openBrowser('chrome', {
    browserExecutable: browserExecutable(),
    logLevel: 'warn',
  });
  const errors: string[] = [];
  const networkOrigins = new Set<string>();
  const results = [];
  try {
    for (const [pageIndex, viewport] of [
      { width: 1440, height: 1000, deviceScaleFactor: 1 },
      { width: 390, height: 844, deviceScaleFactor: 1 },
      { width: 320, height: 740, deviceScaleFactor: 1 },
    ].entries()) {
      const page = await browser.newPage({
        context: () => null,
        logLevel: 'warn',
        indent: false,
        pageIndex,
        onBrowserLog: null,
        onLog: () => undefined,
      });
      page.on('error', (error) => errors.push(error.message));
      page._client().on('Network.requestWillBeSent', (event: unknown) => {
        const requestUrl = (event as { request?: { url?: string } })?.request?.url;
        if (!requestUrl) return;
        const origin = new URL(requestUrl).origin;
        if (origin !== 'null') networkOrigins.add(origin);
      });
      await page.setViewport(viewport);
      const response = await page.goto({ url: url.href, timeout: 30_000 });
      if (!response || ![200, 304].includes(response.status())) {
        throw new Error(`Narrated preview returned HTTP ${response?.status() ?? 'no response'}.`);
      }
      let ready = false;
      for (let attempt = 0; attempt < 100; attempt++) {
        ready = await page.evaluate(() => {
          return (
            Boolean(document.querySelector('[data-narration-mode="narrated"]')) &&
            document.querySelectorAll('button[aria-label^="Jump to scene "]').length === 5 &&
            Boolean(document.querySelector('[data-template]')) &&
            document.fonts.check('600 32px P0Sans')
          );
        });
        if (ready) break;
        await sleep(150);
      }
      if (!ready)
        throw new Error('Narrated preview did not become ready. Check the narration cache.');
      const navigation = [];
      for (const [index, entry] of timeline.scenes.entries()) {
        const clip = narration.clips[index]!;
        await page.evaluate((sceneIndex) => {
          document
            .querySelectorAll<HTMLButtonElement>('button[aria-label^="Jump to scene "]')
            [Number(sceneIndex)]?.click();
        }, index);
        // Narrated navigation starts at the scene boundary so its first words are preserved.
        // Let playback cross the audio lead-in before inspecting the mounted media element.
        await page.evaluate(() =>
          document.querySelector<HTMLButtonElement>('button[aria-label="Play video"]')?.click(),
        );
        const playbackReady = await waitForSceneAudio(page, {
          from: entry.from,
          end: entry.endFrameExclusive,
          minimumFrame: entry.from + Math.max(9, timeline.narrationLeadInFrames + 3),
          audioSrc: clip.audioSrc,
        });
        await page.evaluate(() =>
          document.querySelector<HTMLButtonElement>('button[aria-label="Pause video"]')?.click(),
        );
        await sleep(100);
        const state = await page.evaluate(() => {
          const wrapper = document.querySelector<HTMLElement>('[data-current-frame]');
          const active = document.querySelector<HTMLElement>('button[aria-current="step"]');
          const audio = Array.from(document.querySelectorAll<HTMLAudioElement>('audio')).filter(
            (element) => element.currentSrc.includes('/prototype/narration/'),
          );
          return {
            frame: Number(wrapper?.dataset.currentFrame),
            activeLabel: active?.getAttribute('aria-label'),
            from: Number(active?.dataset.sceneFrom),
            end: Number(active?.dataset.sceneEnd),
            titleVisible: Array.from(document.querySelectorAll('[data-text]')).map(
              (element) => element.textContent,
            ),
            audio: audio.map((element) => ({
              src: new URL(element.currentSrc).pathname,
              readyState: element.readyState,
              duration: element.duration,
              error: element.error?.code ?? null,
            })),
            horizontalOverflow: document.documentElement.scrollWidth > innerWidth + 1,
            alert: document.querySelector('[role="alert"]')?.textContent ?? null,
          };
        });
        const passed =
          playbackReady &&
          state.frame >= entry.from &&
          state.frame < entry.endFrameExclusive &&
          state.from === entry.from &&
          state.end === entry.endFrameExclusive &&
          state.activeLabel === `Jump to scene ${index + 1}: ${entry.scene.onScreenTitle}` &&
          state.titleVisible.includes(entry.scene.onScreenTitle) &&
          state.audio.some(
            (audio) =>
              audio.src === clip.audioSrc &&
              audio.readyState >= 2 &&
              !audio.error &&
              Math.abs(audio.duration - clip.durationSeconds) < 0.2,
          ) &&
          !state.horizontalOverflow &&
          !state.alert;
        navigation.push({ sceneId: entry.scene.id, passed, playbackReady, ...state });
      }

      // Focus exposes the stock Remotion volume slider, including on narrow screens.
      await page.evaluate(() => {
        document.querySelector<HTMLButtonElement>('button[aria-label="Mute sound"]')?.focus();
      });
      await sleep(100);
      const volumeSet = await page.evaluate(() => {
        const slider = document.querySelector<HTMLInputElement>(
          'input[aria-label="Change volume"]',
        );
        if (!slider) return false;
        const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')?.set;
        setter?.call(slider, '0.35');
        slider.dispatchEvent(new Event('input', { bubbles: true }));
        slider.dispatchEvent(new Event('change', { bubbles: true }));
        return true;
      });
      await sleep(100);
      const volumeValue = await page.evaluate(
        () => document.querySelector<HTMLInputElement>('input[aria-label="Change volume"]')?.value,
      );
      const muted = await page
        .evaluate(() => {
          document.querySelector<HTMLButtonElement>('button[aria-label="Mute sound"]')?.click();
        })
        .then(async () => {
          await sleep(100);
          return page.evaluate(() =>
            Boolean(document.querySelector('button[aria-label="Unmute sound"]')),
          );
        });
      await page.evaluate(() => {
        document.querySelector<HTMLButtonElement>('button[aria-label="Unmute sound"]')?.click();
        document
          .querySelector<HTMLButtonElement>('button[aria-label^="Jump to scene 1:"]')
          ?.click();
      });
      await sleep(150);
      const beforePlayback = await page.evaluate(
        (firstClipSrc) => ({
          frame: Number(
            document.querySelector<HTMLElement>('[data-current-frame]')?.dataset.currentFrame,
          ),
          audioTime:
            Array.from(document.querySelectorAll<HTMLAudioElement>('audio')).find((audio) =>
              audio.currentSrc.endsWith(String(firstClipSrc)),
            )?.currentTime ?? 0,
        }),
        narration.clips[0]!.audioSrc,
      );
      await page.evaluate(() =>
        document.querySelector<HTMLButtonElement>('button[aria-label="Play video"]')?.click(),
      );
      await waitForSceneAudio(page, {
        from: timeline.scenes[0]!.from,
        end: timeline.scenes[0]!.endFrameExclusive,
        minimumFrame: Math.max(9, timeline.narrationLeadInFrames + 3),
        audioSrc: narration.clips[0]!.audioSrc,
      });
      const duringPlayback = await page.evaluate(
        (firstClipSrc) => ({
          frame: Number(
            document.querySelector<HTMLElement>('[data-current-frame]')?.dataset.currentFrame,
          ),
          audioTime:
            Array.from(document.querySelectorAll<HTMLAudioElement>('audio')).find((audio) =>
              audio.currentSrc.endsWith(String(firstClipSrc)),
            )?.currentTime ?? -1,
          playing: Boolean(document.querySelector('button[aria-label="Pause video"]')),
        }),
        narration.clips[0]!.audioSrc,
      );
      const boundaries: { scene: string | null; frame: number; activeAudio: string[] }[] = [];
      const playedAudio = new Set<string>();
      let maxSimultaneousClips = 0;
      if (pageIndex === 0) {
        // Exercise the actual scene transitions through the end, recording each first observed scene.
        const seen = new Set<string>();
        const deadline = Date.now() + (timeline.durationInFrames / timeline.fps + 10) * 1000;
        while (Date.now() < deadline) {
          const state = await page.evaluate(() => ({
            scene:
              document.querySelector('button[aria-current="step"]')?.getAttribute('aria-label') ??
              null,
            frame: Number(
              document.querySelector<HTMLElement>('[data-current-frame]')?.dataset.currentFrame,
            ),
            activeAudio: Array.from(document.querySelectorAll<HTMLAudioElement>('audio'))
              .filter(
                (audio) => !audio.paused && audio.currentSrc.includes('/prototype/narration/'),
              )
              .map((audio) => new URL(audio.currentSrc).pathname),
          }));
          if (state.scene && !seen.has(state.scene)) {
            seen.add(state.scene);
            boundaries.push(state);
          }
          for (const src of state.activeAudio) playedAudio.add(src);
          maxSimultaneousClips = Math.max(maxSimultaneousClips, state.activeAudio.length);
          if (state.frame >= timeline.durationInFrames - 2) break;
          await sleep(120);
        }
      }
      const pauseClicked = await page.evaluate(() => {
        const pause = document.querySelector<HTMLButtonElement>('button[aria-label="Pause video"]');
        pause?.click();
        return Boolean(pause);
      });
      const finalState = await page.evaluate(() => ({
        frame: Number(
          document.querySelector<HTMLElement>('[data-current-frame]')?.dataset.currentFrame,
        ),
        alert: document.querySelector('[role="alert"]')?.textContent ?? null,
        narrationStatus:
          document
            .querySelector('[data-narration-mode]')
            ?.textContent?.includes('Male voice narration') ?? false,
      }));
      await page.evaluate(() => {
        document
          .querySelector<HTMLButtonElement>('button[aria-label^="Jump to scene 1:"]')
          ?.click();
        window.scrollTo(0, 0);
      });
      await page.evaluate(() =>
        document.querySelector<HTMLButtonElement>('button[aria-label="Play video"]')?.click(),
      );
      await waitForSceneAudio(page, {
        from: timeline.scenes[0]!.from,
        end: timeline.scenes[0]!.endFrameExclusive,
        minimumFrame: Math.max(9, timeline.narrationLeadInFrames + 3),
        audioSrc: narration.clips[0]!.audioSrc,
      });
      await page.evaluate(() =>
        document.querySelector<HTMLButtonElement>('button[aria-label="Pause video"]')?.click(),
      );
      await sleep(100);
      const screenshot = await page
        ._client()
        .send('Page.captureScreenshot', { format: 'png', captureBeyondViewport: false });
      const filename = `web-${viewport.width}x${viewport.height}.png`;
      await writeFile(resolve(outputDir, filename), Buffer.from(screenshot.value.data, 'base64'));
      const playbackPassed =
        duringPlayback.playing &&
        duringPlayback.frame > beforePlayback.frame + 3 &&
        duringPlayback.audioTime > beforePlayback.audioTime + 0.1;
      const boundariesPassed =
        pageIndex !== 0 ||
        (boundaries.length === 5 &&
          narration.clips.every((clip) => playedAudio.has(clip.audioSrc)) &&
          maxSimultaneousClips <= 1 &&
          finalState.frame >= timeline.durationInFrames - 2);
      const passed =
        navigation.every((entry) => entry.passed) &&
        volumeSet &&
        volumeValue === '0.35' &&
        muted &&
        playbackPassed &&
        boundariesPassed &&
        !finalState.alert &&
        finalState.narrationStatus &&
        (pauseClicked || pageIndex === 0);
      results.push({
        viewport,
        screenshot: filename,
        navigation,
        volumeSet,
        volumeValue,
        muted,
        beforePlayback,
        duringPlayback,
        playbackPassed,
        boundaries,
        playedAudio: Array.from(playedAudio),
        maxSimultaneousClips,
        boundariesPassed,
        finalState,
        pauseClicked,
        passed,
      });
      await page.close();
    }
  } finally {
    await browser.close({ silent: true });
  }
  const noProviderRequests = Array.from(networkOrigins).every((origin) => origin === url.origin);
  const passed =
    results.every((entry) => entry.passed) && noProviderRequests && errors.length === 0;
  await writeReport({
    checkedAt: new Date().toISOString(),
    status: passed ? 'passed' : 'failed',
    url: url.href,
    scope:
      'Headless Chromium playback, audio media readiness, seeking, mute/volume and measured scene transitions. Browser output is muted by the renderer launcher; this is not human listening or physical-device verification.',
    networkOrigins: Array.from(networkOrigins),
    noProviderRequests,
    errors,
    results,
  });
  reportWritten = true;
  if (!passed)
    throw new Error(
      'Narrated browser checks failed; inspect prototype-results/narrated/web-check.json.',
    );
  console.log(
    'Narrated preview passed navigation, audio playback, volume/mute and scene-transition checks at all three viewport sizes; no provider requests.',
  );
}

main().catch(async (error: unknown) => {
  const reason = error instanceof Error ? error.message : String(error);
  console.error(reason);
  if (!reportWritten)
    await writeReport({ checkedAt: new Date().toISOString(), status: 'failed', reason }).catch(
      () => undefined,
    );
  process.exitCode = 1;
});
