import { mkdir, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { openBrowser } from '@remotion/renderer';
import { fixtureStoryboard as planningStoryboard } from '@aivideos/video';
import { uberStoryboard } from '@aivideos/video/data';
import { browserExecutable, rootDir } from './prototype-common';

const uberMode = process.argv.includes('--uber');
const fixtureStoryboard = uberMode ? uberStoryboard : planningStoryboard;
const outputDir = resolve(
  rootDir,
  uberMode ? 'prototype-results/uber-preview' : 'prototype-results/p0',
);
const url = uberMode ? 'http://127.0.0.1:3100/prototype/uber' : 'http://127.0.0.1:3100/prototype';
async function writeReport(name: string, value: unknown) {
  await writeFile(resolve(outputDir, name), `${JSON.stringify(value, null, 2)}\n`);
}
const viewports = [
  { width: 1440, height: 1000, deviceScaleFactor: 1 },
  { width: 390, height: 844, deviceScaleFactor: 1 },
  { width: 320, height: 740, deviceScaleFactor: 1 },
];
let reportWritten = false;

async function main() {
  await mkdir(outputDir, { recursive: true });
  const browser = await openBrowser('chrome', {
    browserExecutable: browserExecutable(),
    logLevel: 'warn',
  });
  const results = [];
  const errors: string[] = [];
  try {
    for (const [pageIndex, viewport] of viewports.entries()) {
      console.log(`Checking ${new URL(url).pathname} at ${viewport.width}×${viewport.height}...`);
      const page = await browser.newPage({
        context: () => null,
        logLevel: 'warn',
        indent: false,
        pageIndex,
        onBrowserLog: null,
        onLog: () => undefined,
      });
      page.on('error', (error) => errors.push(error.message));
      await page.setViewport(viewport);
      const response = await page.goto({
        url: `${url}?viewport=${viewport.width}`,
        timeout: 30_000,
      });
      if (!response || (response.status() !== 200 && response.status() !== 304)) {
        throw new Error(
          `Prototype navigation failed at width ${viewport.width}: HTTP ${response?.status() ?? 'no response'}.`,
        );
      }

      let ready = false;
      for (let attempt = 0; attempt < 100; attempt++) {
        ready = await page.evaluate(
          () =>
            document.querySelectorAll('button[aria-label^="Jump to scene "]').length === 5 &&
            Boolean(document.querySelector('[data-template]')) &&
            Array.from(document.fonts).some(
              (font) => font.family === 'P0Sans' && font.status === 'loaded',
            ) &&
            document.fonts.check('600 32px P0Sans'),
        );
        if (ready) break;
        await new Promise((done) => setTimeout(done, 150));
      }
      if (!ready)
        throw new Error(`Player or bundled font failed to load at width ${viewport.width}.`);
      const navigation = [];
      for (const [index, scene] of fixtureStoryboard.scenes.entries()) {
        await page.evaluate((sceneNumber) => {
          const buttons = document.querySelectorAll<HTMLButtonElement>(
            'button[aria-label^="Jump to scene "]',
          );
          buttons[Number(sceneNumber)]?.click();
        }, index);
        await new Promise((done) => setTimeout(done, 180));
        const measured = await page.evaluate(() => {
          const box = document.querySelector<HTMLElement>('[data-layout-box]');
          const boxRect = box?.getBoundingClientRect();
          const texts = Array.from(
            document.querySelectorAll<HTMLElement>('[data-layout-box] [data-text]'),
          );
          const bounds = texts.map((element) => {
            const bounds = element.getBoundingClientRect();
            const range = document.createRange();
            range.selectNodeContents(element);
            const textBounds = range.getBoundingClientRect();
            const styles = getComputedStyle(element);
            return {
              text: element.textContent,
              left: bounds.left,
              right: bounds.right,
              top: bounds.top,
              bottom: bounds.bottom,
              clientWidth: element.clientWidth,
              scrollWidth: element.scrollWidth,
              clientHeight: element.clientHeight,
              scrollHeight: element.scrollHeight,
              textLeft: textBounds.left,
              textRight: textBounds.right,
              textTop: textBounds.top,
              textBottom: textBounds.bottom,
              // Fonts can paint outside their line box with overflow:visible.
              // Check actual text bounds and clipping, rather than treating that as cropped text.
              clippedOverflow:
                (element.scrollWidth > element.clientWidth + 1 &&
                  ['hidden', 'clip', 'auto', 'scroll'].includes(styles.overflowX)) ||
                (element.scrollHeight > element.clientHeight + 1 &&
                  ['hidden', 'clip', 'auto', 'scroll'].includes(styles.overflowY)),
            };
          });
          const opacity = box ? Number(getComputedStyle(box).opacity) : 0;
          return {
            template: box?.dataset.template,
            activeLabel: document
              .querySelector('button[aria-current="step"]')
              ?.getAttribute('aria-label'),
            activeCount: document.querySelectorAll('button[aria-current="step"]').length,
            opacity,
            horizontalOverflow: document.documentElement.scrollWidth > innerWidth + 1,
            fontLoaded:
              Array.from(document.fonts).some(
                (font) => font.family === 'P0Sans' && font.status === 'loaded',
              ) && document.fonts.check('600 32px P0Sans'),
            box: boxRect
              ? {
                  left: boxRect.left,
                  right: boxRect.right,
                  top: boxRect.top,
                  bottom: boxRect.bottom,
                }
              : null,
            textBounds: bounds,
            textFits:
              Boolean(boxRect) &&
              bounds.every(
                (text) =>
                  !text.clippedOverflow &&
                  text.left >= boxRect!.left - 1 &&
                  text.right <= boxRect!.right + 1 &&
                  text.top >= boxRect!.top - 1 &&
                  text.bottom <= boxRect!.bottom + 1 &&
                  text.textLeft >= boxRect!.left - 1 &&
                  text.textRight <= boxRect!.right + 1 &&
                  text.textTop >= boxRect!.top - 1 &&
                  text.textBottom <= boxRect!.bottom + 1,
              ),
            textVisible: texts.every((element) => {
              const size = element.getBoundingClientRect();
              return (
                size.width > 0 &&
                size.height > 0 &&
                Number(getComputedStyle(element).opacity) >= 0.99
              );
            }),
            authoredTexts: texts.map((element) => element.textContent),
            playerAlert: document.querySelector('[role="alert"]')?.textContent ?? null,
          };
        });
        const passed =
          measured.template === scene.template &&
          measured.activeLabel === `Jump to scene ${index + 1}: ${scene.onScreenTitle}` &&
          measured.activeCount === 1 &&
          measured.authoredTexts.includes(scene.onScreenTitle) &&
          measured.opacity >= 0.99 &&
          measured.textVisible &&
          measured.textFits &&
          measured.fontLoaded &&
          !measured.horizontalOverflow &&
          !measured.playerAlert;
        navigation.push({
          scene: index + 1,
          expectedTemplate: scene.template,
          passed,
          ...measured,
        });
      }

      // Exercise the actual Player control and confirm the accessible pause state appears.
      const playClicked = await page.evaluate(() => {
        const play = document.querySelector<HTMLButtonElement>('button[aria-label="Play video"]');
        play?.click();
        return Boolean(play);
      });
      await new Promise((done) => setTimeout(done, 400));
      const pauseClicked = await page.evaluate(() => {
        const pause = document.querySelector<HTMLButtonElement>('button[aria-label="Pause video"]');
        pause?.click();
        return Boolean(pause);
      });
      await page.evaluate(() => {
        document
          .querySelector<HTMLButtonElement>('button[aria-label^="Jump to scene 1:"]')
          ?.click();
        window.scrollTo(0, 0);
      });
      await new Promise((done) => setTimeout(done, 150));
      const screenshot = await page._client().send('Page.captureScreenshot', {
        format: 'png',
        captureBeyondViewport: false,
      });
      const filename = `web-${viewport.width}x${viewport.height}.png`;
      await writeFile(resolve(outputDir, filename), Buffer.from(screenshot.value.data, 'base64'));
      results.push({
        viewport,
        screenshot: filename,
        navigation,
        playClicked,
        pauseClicked,
        passed: navigation.every((scene) => scene.passed) && playClicked && pauseClicked,
      });
      await page.close();
    }
  } finally {
    await browser.close({ silent: true });
  }
  const passed =
    results.length === viewports.length &&
    results.every((result) => result.passed) &&
    errors.length === 0;
  await writeReport('web-check.json', {
    checkedAt: new Date().toISOString(),
    url,
    status: passed ? 'passed' : 'failed',
    scope:
      'Headless Chromium browser at desktop and phone-sized viewports; not physical-device Safari/Android verification.',
    results,
    errors,
  });
  reportWritten = true;
  if (!passed) throw new Error(`Prototype web checks failed; inspect ${outputDir}/web-check.json.`);
  console.log('Prototype web checks passed for all five scenes at all three viewport sizes.');
}

main().catch(async (error: unknown) => {
  const reason = error instanceof Error ? error.message : String(error);
  console.error(reason);
  if (!reportWritten)
    await writeReport('web-check.json', {
      checkedAt: new Date().toISOString(),
      url,
      status: 'failed',
      reason,
    }).catch(() => undefined);
  process.exitCode = 1;
});
