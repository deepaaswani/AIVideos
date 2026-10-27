import assert from 'node:assert/strict';
import { test } from 'node:test';
import { randomUUID } from 'node:crypto';
import {
  canonicalIdeaJson,
  emptyIdeaDraft,
  validateIdeaDraft,
  validateIdeaResult,
  VIDEO_THEMES,
  type IdeaProject,
  type ScriptSection,
} from '@aivideos/contracts/idea';
import {
  DraftSession,
  StudioRequestError,
  type DraftWriter,
} from '../apps/web/src/lib/idea/draft-session';
import { generateIdeaContent } from '../apps/web/src/lib/idea/gemini';
import { articleUrl, isPublicArticleAddress } from '../apps/web/src/lib/idea/article';
import { safeAuthDestination } from '../apps/web/src/lib/auth/validation';

const sections: [ScriptSection] = [
  {
    id: 'opening',
    title: 'Start small',
    narration: 'Start with one small action.',
    visualSuggestion: 'One block moves forward.',
    sourceRefs: [],
  },
];
function project(draft = emptyIdeaDraft(), revisionNumber = 1): IdeaProject {
  return {
    id: randomUUID(),
    revisionId: randomUUID(),
    revisionNumber,
    updatedAt: new Date().toISOString(),
    draft,
    scriptApproved: false,
    scriptStale: false,
    latestOperation: null,
    ideas: [],
  };
}
test('draft contract allows all four themes and rejects forged fields, duplicate sections and unsupported citations', () => {
  for (const theme of VIDEO_THEMES)
    assert.equal(validateIdeaDraft({ ...emptyIdeaDraft(), themeId: theme.id }).success, true);
  assert.equal(
    validateIdeaDraft({ ...emptyIdeaDraft(), workspaceId: randomUUID() }).success,
    false,
  );
  assert.equal(
    validateIdeaDraft({ ...emptyIdeaDraft(), sections: [sections[0], sections[0]] }).success,
    false,
  );
  assert.equal(
    validateIdeaResult(
      'script',
      { sections: [{ ...sections[0], sourceRefs: ['invented-source'] }], reviewNotes: [] },
      'notes',
    ).success,
    false,
  );
  assert.equal(
    validateIdeaResult(
      'script',
      { sections: [{ ...sections[0], sourceRefs: ['source-1'] }], reviewNotes: [] },
      'topic',
    ).success,
    false,
  );
  assert.equal(
    validateIdeaDraft({
      ...emptyIdeaDraft(),
      sections: [{ ...sections[0], narration: 'word '.repeat(421) }],
    }).success,
    false,
  );
});
test('autosave serializes overlapping edits and uses the acknowledged revision for the next write', async () => {
  const initial = project();
  const writes: Parameters<DraftWriter>[0][] = [];
  let release: ((value: IdeaProject) => void) | undefined;
  const session = new DraftSession(initial.id, initial, (request) => {
    writes.push(request);
    return writes.length === 1
      ? new Promise((resolve) => {
          release = resolve;
        })
      : Promise.resolve({
          ...initial,
          revisionId: 'third',
          draft: request.draft,
          revisionNumber: 3,
        });
  });
  session.edit({ ...initial.draft, title: 'First edit' });
  const saving = session.flush();
  session.edit({ ...initial.draft, title: 'Second edit' });
  assert.equal(session.flush(), saving);
  release?.({ ...initial, revisionId: 'second', draft: writes[0]!.draft, revisionNumber: 2 });
  await saving;
  assert.equal(writes.length, 2);
  assert.equal(writes[1]!.revisionId, 'second');
  assert.equal(writes[1]!.draft.title, 'Second edit');
  assert.equal(session.isDirty(), false);
});
test('an ambiguous save retries the same mutation and snapshot before sending later edits', async () => {
  const initial = project(),
    writes: Parameters<DraftWriter>[0][] = [];
  let fail = true;
  const session = new DraftSession(initial.id, initial, async (request) => {
    writes.push(structuredClone(request));
    if (fail) {
      fail = false;
      throw new StudioRequestError('NETWORK_ERROR', 'Disconnected');
    }
    return { ...initial, revisionId: randomUUID(), draft: request.draft };
  });
  session.edit({ ...initial.draft, title: 'Saved once' });
  await assert.rejects(session.flush());
  session.edit({ ...initial.draft, title: 'Later edit' });
  await session.flush();
  assert.equal(writes.length, 3);
  assert.equal(canonicalIdeaJson(writes[0]), canonicalIdeaJson(writes[1]));
  assert.notEqual(writes[1]!.mutationId, writes[2]!.mutationId);
});
test('a conflict preserves local content and prevents silent follow-up writes', async () => {
  const initial = project();
  let calls = 0;
  const session = new DraftSession(initial.id, initial, async () => {
    calls++;
    throw new StudioRequestError('REVISION_CONFLICT', 'Changed elsewhere', 409);
  });
  session.edit({ ...initial.draft, title: 'My local text' });
  await assert.rejects(session.flush());
  await assert.rejects(session.flush());
  assert.equal(calls, 1);
  assert.equal(session.getSnapshot().draft.title, 'My local text');
  assert.equal(session.getSnapshot().status, 'conflict');
});
function provider(result: unknown, status = 200) {
  return async () =>
    new Response(
      JSON.stringify({
        status: 'completed',
        steps: [
          { type: 'model_output', content: [{ type: 'text', text: JSON.stringify(result) }] },
        ],
      }),
      { status },
    );
}
const options = {
  draft: emptyIdeaDraft(),
  kind: 'script' as const,
  instruction: '',
  sectionId: null,
  key: 'test-key',
  model: 'gemini-3.5-flash-lite',
};
test('Gemini parses only model text, validates it and adds a factual-review reminder for topic scripts', async () => {
  const result = await generateIdeaContent({
    ...options,
    fetcher: provider({ sections, reviewNotes: [] }),
  });
  assert.ok('sections' in result);
  assert.equal(result.reviewNotes.length, 1);
  await assert.rejects(
    generateIdeaContent({
      ...options,
      fetcher: provider({
        sections: [{ ...sections[0], sourceRefs: ['source-1'] }],
        reviewNotes: [],
      }),
    }),
    /INVALID_AI_RESULT/,
  );
});
test('provider interruptions do not automatically retry and never expose provider response text', async () => {
  let calls = 0;
  await assert.rejects(
    generateIdeaContent({
      ...options,
      fetcher: async () => {
        calls++;
        throw new Error('secret provider token');
      },
    }),
    /OUTCOME_UNCERTAIN/,
  );
  assert.equal(calls, 1);
  await assert.rejects(
    generateIdeaContent({
      ...options,
      fetcher: async () => new Response('secret raw response', { status: 400 }),
    }),
    (error) => error instanceof Error && error.message === 'PROVIDER_REJECTED',
  );
});
test('a section rewrite cannot alter a different section', async () => {
  const second = { ...sections[0], id: 'close', title: 'Close' };
  const draft = { ...emptyIdeaDraft(), sections: [...sections, second] };
  await assert.rejects(
    generateIdeaContent({
      ...options,
      draft,
      kind: 'rewrite',
      instruction: 'Shorter',
      sectionId: 'opening',
      fetcher: provider({
        sections: [sections[0], { ...second, narration: 'Unexpected change' }],
        reviewNotes: [],
      }),
    }),
    /INVALID_AI_RESULT/,
  );
});
test('article import rejects private, loopback, metadata, alternate IP and non-HTTPS targets', () => {
  for (const address of [
    '127.0.0.1',
    '10.0.0.1',
    '169.254.169.254',
    '172.16.0.2',
    '192.168.1.1',
    '100.64.0.1',
    '198.18.0.1',
    '0.0.0.0',
    '::1',
    '::ffff:127.0.0.1',
    '224.0.0.1',
  ])
    assert.equal(isPublicArticleAddress(address), false, address);
  assert.equal(isPublicArticleAddress('8.8.8.8'), true);
  for (const url of [
    'http://example.com',
    'https://localhost',
    'https://user:password@example.com',
    'https://example.com:8080',
  ])
    assert.throws(() => articleUrl(url));
  assert.equal(articleUrl('https://example.com/article#title').href, 'https://example.com/article');
});
test('login returns only to exact supported project routes', () => {
  const path = `/projects/${randomUUID()}/studio`;
  assert.equal(safeAuthDestination(path), path);
  assert.equal(safeAuthDestination('/projects/new'), '/projects/new');
  assert.equal(safeAuthDestination('/projects/not-a-project/admin'), '/dashboard');
  assert.equal(safeAuthDestination('/projects/new/../../login'), '/dashboard');
});
