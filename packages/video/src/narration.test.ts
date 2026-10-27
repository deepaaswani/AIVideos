import assert from 'node:assert/strict';
import { test } from 'node:test';
import { fixtureStoryboard } from './fixture';
import { validateNarrationManifest, type NarrationManifest } from './narration';
import { buildTimeline } from './timeline';

function narration(durations: number[]): NarrationManifest {
  return {
    version: 1,
    clips: durations.map((durationSeconds, index) => ({
      sceneId: fixtureStoryboard.scenes[index]!.id,
      textSha256: 'a'.repeat(64),
      audioSha256: 'b'.repeat(64),
      audioSrc: `/prototype/narration/${String(index).repeat(64)}.mp3`,
      durationSeconds,
    })),
  };
}

test('measured speech borrows available hold frames while keeping the target duration', () => {
  const audio = narration([5.4, 5.6, 6.2, 6, 4.1]);
  const timeline = buildTimeline(fixtureStoryboard, audio);
  assert.equal(timeline.durationInFrames, 900);
  assert.equal(timeline.timingIssue, null);
  assert.ok(timeline.scenes[0]!.durationInFrames > 150);
  for (const [index, entry] of timeline.scenes.entries()) {
    assert.ok(entry.durationInFrames >= Math.ceil(audio.clips[index]!.durationSeconds * 30) + 9);
    if (index > 0) assert.equal(entry.from, timeline.scenes[index - 1]!.endFrameExclusive);
  }
});

test('long narration extends the export and explicitly reports the timing issue', () => {
  const audio = narration([7, 7, 7, 7, 7]);
  const timeline = buildTimeline(fixtureStoryboard, audio);
  assert.equal(timeline.durationInFrames, 1095);
  assert.match(timeline.timingIssue!, /36\.500 seconds.*27–33/);
  assert.ok(timeline.scenes.every((scene) => scene.durationInFrames === 219));
});

test('short narration preserves authored visual holds rather than shortening the video', () => {
  const timeline = buildTimeline(fixtureStoryboard, narration([1, 1, 1, 1, 1]));
  assert.equal(timeline.durationInFrames, 900);
  assert.deepEqual(
    timeline.scenes.map((scene) => scene.durationInFrames),
    [150, 180, 210, 210, 150],
  );
});

test('narration rejects missing, reordered, unsafe, or unmeasured scene audio', () => {
  assert.throws(() => validateNarrationManifest(fixtureStoryboard, {}), /Invalid narration/);
  const missing = narration([1, 1, 1, 1]);
  assert.throws(() => buildTimeline(fixtureStoryboard, missing), /exactly one clip/);
  const swapped = narration([1, 1, 1, 1, 1]);
  [swapped.clips[0], swapped.clips[1]] = [swapped.clips[1]!, swapped.clips[0]!];
  assert.throws(() => buildTimeline(fixtureStoryboard, swapped), /out-of-order/);
  for (const duration of [0, -1, Number.NaN, Number.POSITIVE_INFINITY]) {
    const invalid = narration([duration, 1, 1, 1, 1]);
    assert.throws(() => buildTimeline(fixtureStoryboard, invalid), /Invalid/);
  }
  const unsafe = narration([1, 1, 1, 1, 1]);
  unsafe.clips[0]!.audioSrc = 'https://provider.invalid/secret-voice';
  assert.throws(() => buildTimeline(fixtureStoryboard, unsafe), /Invalid/);
});

test('sanitized video metadata excludes arbitrary provider fields', () => {
  const input = {
    ...narration([1, 1, 1, 1, 1]),
    providerSecret: 'must-not-propagate',
  };
  assert.equal('providerSecret' in validateNarrationManifest(fixtureStoryboard, input), false);
});
