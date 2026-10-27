import assert from 'node:assert/strict';
import { test } from 'node:test';
import { validateStoryboard } from '@aivideos/contracts';
import { fixtureSource, fixtureStoryboard } from './fixture';
import { buildTimeline, calculateSceneTimings } from './timeline';

test('the authored fixture maps to 900 contiguous frames at 1080×1920 / 30 fps', () => {
  const timeline = buildTimeline(fixtureStoryboard);
  assert.equal(timeline.width, 1080);
  assert.equal(timeline.height, 1920);
  assert.equal(timeline.fps, 30);
  assert.equal(timeline.durationInFrames, 900);
  assert.deepEqual(
    timeline.scenes.map(({ from, durationInFrames, endFrameExclusive }) => ({
      from,
      durationInFrames,
      endFrameExclusive,
    })),
    [
      { from: 0, durationInFrames: 150, endFrameExclusive: 150 },
      { from: 150, durationInFrames: 180, endFrameExclusive: 330 },
      { from: 330, durationInFrames: 210, endFrameExclusive: 540 },
      { from: 540, durationInFrames: 210, endFrameExclusive: 750 },
      { from: 750, durationInFrames: 150, endFrameExclusive: 900 },
    ],
  );
  assert.deepEqual(
    timeline.scenes.map(({ scene }) => scene.id),
    fixtureStoryboard.scenes.map((scene) => scene.id),
  );
});

test('fractional-frame durations round cumulative boundaries instead of each scene', () => {
  const timeline = calculateSceneTimings([1010, 1010, 1010, 1010, 1010], 30);
  assert.deepEqual(
    timeline.map((scene) => scene.durationInFrames),
    [30, 31, 30, 30, 31],
  );
  assert.equal(timeline.at(-1)?.endFrameExclusive, 152);
  assert.equal(timeline[0]?.from, 0);
  for (let index = 1; index < timeline.length; index++) {
    assert.equal(timeline[index]?.from, timeline[index - 1]?.endFrameExclusive);
  }
});

test('timeline boundaries are exclusive and a one-frame scene is retained', () => {
  assert.deepEqual(calculateSceneTimings([1000 / 30, 1000 / 30], 30), [
    { from: 0, durationInFrames: 1, endFrameExclusive: 1 },
    { from: 1, durationInFrames: 1, endFrameExclusive: 2 },
  ]);
});

test('rejects impossible timing inputs instead of creating zero-length or unsafe sequences', () => {
  for (const fps of [0, -1, 29.97, Number.NaN, Number.POSITIVE_INFINITY]) {
    assert.throws(() => calculateSceneTimings([1000], fps), /FPS/);
  }
  assert.throws(() => calculateSceneTimings([], 30), /at least one scene/);
  for (const duration of [0, -1, Number.NaN, Number.POSITIVE_INFINITY]) {
    assert.throws(() => calculateSceneTimings([duration], 30), /finite positive/);
  }
  assert.throws(() => calculateSceneTimings([1], 30), /at least one/);
  assert.throws(() => calculateSceneTimings([Number.MAX_VALUE], 30), /safe integer/);
});

test('fixture source references resolve and a changed block is rejected', () => {
  assert.equal(validateStoryboard(fixtureStoryboard, [fixtureSource]).success, true);
  const changed = structuredClone(fixtureStoryboard);
  changed.scenes[0].sourceRefs[0].blockId = 'fabricated_block';
  assert.equal(validateStoryboard(changed, [fixtureSource]).success, false);
});
