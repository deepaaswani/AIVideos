import assert from 'node:assert/strict';
import { test } from 'node:test';
import sourceFixture from '../../../docs/step-1/fixtures/source.fixture.json';
import storyboardFixture from '../../../docs/step-1/fixtures/storyboard.fixture.json';
import { validateStoryboard } from './index';

type Fixture = typeof storyboardFixture;

test('accepts the authored storyboard and source without modifying them', () => {
  const candidate = structuredClone(storyboardFixture);
  const result = validateStoryboard(candidate, [sourceFixture]);

  assert.equal(result.success, true);
  if (result.success) {
    assert.equal(result.data, candidate);
    assert.equal(result.data.scenes.length, 5);
  }
  assert.deepEqual(candidate, storyboardFixture);
});

const malformedCases: [string, (board: Fixture) => void][] = [
  ['unknown template', (board) => (board.scenes[0]!.template = 'execute_code')],
  ['executable field', (board) => Object.assign(board.scenes[0]!, { renderCode: 'not allowed' })],
  ['wrong output dimensions', (board) => (board.output.width = 1920)],
  ['missing narration', (board) => Reflect.deleteProperty(board.scenes[0]!, 'narration')],
  ['unknown source block', (board) => (board.scenes[0]!.sourceRefs[0]!.blockId = 'missing')],
  [
    'undeclared source version',
    (board) => (board.scenes[0]!.sourceRefs[0]!.sourceVersionId = 'missing'),
  ],
  ['duplicate scene ID', (board) => (board.scenes[1]!.id = board.scenes[0]!.id)],
  [
    'duration outside target tolerance',
    (board) => {
      for (const scene of board.scenes) scene.estimatedDurationMs = 12000;
    },
  ],
  [
    'process highlight outside available items',
    (board) => (board.scenes[3]!.visualItems = ['Only one item']),
  ],
  ['unexplained review flag', (board) => (board.scenes[0]!.needsReview = true)],
  ['missing source references', (board) => (board.scenes[0]!.sourceRefs = [])],
  ['blank narration', (board) => (board.scenes[0]!.narration = ' ')],
  ['blank title', (board) => (board.scenes[0]!.onScreenTitle = ' ')],
  ['title with process items', (board) => (board.scenes[0]!.visualItems = ['Unexpected item'])],
  ['recap without items', (board) => (board.scenes[4]!.visualItems = [])],
  [
    'declared source absent from supplied sources',
    (board) => board.sourceVersionIds.push('missing'),
  ],
];

for (const [name, mutate] of malformedCases) {
  test(`rejects ${name}`, () => {
    const candidate = structuredClone(storyboardFixture);
    mutate(candidate);
    const result = validateStoryboard(candidate, [sourceFixture]);

    assert.equal(result.success, false);
    if (!result.success) assert.ok(result.errors.length > 0);
  });
}

test('rejects non-object input and cannot coerce invalid primitive fields', () => {
  for (const candidate of [null, [], 'storyboard', 42]) {
    assert.equal(validateStoryboard(candidate).success, false);
  }
  const candidate = {
    ...storyboardFixture,
    targetDurationSeconds: '30',
  };
  assert.equal(validateStoryboard(candidate).success, false);
  assert.equal(candidate.targetDurationSeconds, '30');
});

test('checks source block existence only when source indexes are supplied', () => {
  const candidate = structuredClone(storyboardFixture);
  candidate.scenes[0]!.sourceRefs[0]!.blockId = 'not_yet_loaded';

  assert.equal(validateStoryboard(candidate).success, true);
  assert.equal(validateStoryboard(candidate, [sourceFixture]).success, false);
});

test('rejects duplicate IDs in the supplied source index', () => {
  const source = structuredClone(sourceFixture);
  source.blocks.push(source.blocks[0]!);
  assert.equal(validateStoryboard(storyboardFixture, [source]).success, false);
  assert.equal(
    validateStoryboard(storyboardFixture, [sourceFixture, sourceFixture]).success,
    false,
  );
});
