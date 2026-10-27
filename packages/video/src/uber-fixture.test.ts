import assert from 'node:assert/strict';
import { test } from 'node:test';
import { validateStoryboard } from '@aivideos/contracts';
import { fixtureStoryboard } from './fixture';
import { buildTimeline } from './timeline';
import { uberSource, uberStoryboard } from './uber-fixture';

test('Uber test has independent source references and a five-scene 30-second timeline', () => {
  assert.equal(validateStoryboard(uberStoryboard, [uberSource]).success, true);
  assert.equal(
    validateStoryboard(uberStoryboard, [{ sourceVersionId: 'unrelated_source', blocks: [] }])
      .success,
    false,
  );
  const timeline = buildTimeline(uberStoryboard);
  assert.equal(timeline.scenes.length, 5);
  assert.equal(timeline.durationInFrames, 900);
  assert.notEqual(uberStoryboard.projectId, fixtureStoryboard.projectId);
  assert.ok(
    uberStoryboard.scenes.every(
      (scene) => !fixtureStoryboard.scenes.some((original) => original.id === scene.id),
    ),
  );
});
