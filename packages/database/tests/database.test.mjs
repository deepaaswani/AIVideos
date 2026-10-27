import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { after, afterEach, before, beforeEach, test } from 'node:test';
import { createTestDatabase } from '../scripts/migrations.mjs';

let db, owner, outsider;
const draft = (extra = {}) => ({
  title: 'A clear explanation',
  inputType: 'notes',
  inputText: 'A large task becomes easier when its first action is small and specific.',
  sourceUrl: '',
  sourceConfirmed: false,
  sourceRetrievedAt: null,
  audience: 'Creators',
  objective: 'Explain a clear next action',
  selectedIdea: '',
  tone: 'clear',
  durationSeconds: 60,
  themeId: 'sapphire-clay',
  sections: [],
  reviewNotes: [],
  ...extra,
});
const section = (extra = {}) => ({
  id: 'hook',
  title: 'Start small',
  narration: 'Name one useful result and choose the smallest action that moves you toward it.',
  visualSuggestion: 'A large clay block separates into smaller steps.',
  sourceRefs: ['source-1'],
  ...extra,
});
before(async () => {
  ({ db } = await createTestDatabase());
});
after(async () => {
  await db?.close();
});
beforeEach(async () => {
  await db.exec('begin');
  owner = randomUUID();
  outsider = randomUUID();
  await db.query('insert into auth.users(id,email) values($1,$2),($3,$4)', [
    owner,
    'owner@example.test',
    outsider,
    'other@example.test',
  ]);
  await db.query('select app.configure_idea_pilot($1)', ['owner@example.test']);
});
afterEach(async () => {
  await db.exec('rollback');
});
async function as(user) {
  await db.exec('reset role');
  await db.query("select set_config('request.jwt.claim.sub',$1,true)", [user]);
  await db.exec('set local role authenticated');
}
async function rpc(sql, params = []) {
  return (await db.query(sql, params)).rows[0].value;
}
async function save(id, revision, input, mutation = randomUUID()) {
  return rpc('select app.save_idea_draft($1,$2,$3,$4) as value', [id, revision, mutation, input]);
}
async function reject(action, pattern) {
  await db.exec('savepoint expected_error');
  await assert.rejects(action, pattern);
  await db.exec('rollback to savepoint expected_error');
  await db.exec('release savepoint expected_error');
}
async function begin(
  project,
  kind = 'script',
  id = randomUUID(),
  instruction = '',
  sectionId = null,
) {
  return rpc('select app.begin_idea_generation($1,$2,$3,$4,$5,$6,$7) as value', [
    project.id,
    project.revisionId,
    id,
    kind,
    instruction,
    'gemini-3.5-flash-lite',
    sectionId,
  ]);
}

test('all application tables have RLS and private pilot state cannot be read by a customer', async () => {
  const rows = await db.query(
    "select relname from pg_class c join pg_namespace n on n.oid=c.relnamespace where n.nspname='app' and c.relkind='r' and not c.relrowsecurity",
  );
  assert.equal(rows.rows.length, 0);
  await as(owner);
  await reject(() => db.query('select * from private.idea_pilot_access'), /permission denied/);
});
test('repeat onboarding yields one workspace and no free allowance', async () => {
  await as(owner);
  const a = await rpc('select app.ensure_personal_workspace() as value');
  const b = await rpc('select app.ensure_personal_workspace() as value');
  assert.equal(a, b);
  const accounts = await db.query('select state from app.credit_accounts');
  assert.deepEqual(accounts.rows, [{ state: 'unfunded' }]);
});
test('a new project snapshots the draft and a replay does not create another revision', async () => {
  await as(owner);
  const id = randomUUID(),
    mutation = randomUUID();
  const a = await save(id, null, draft(), mutation);
  const b = await save(id, null, draft(), mutation);
  assert.equal(a.revisionId, b.revisionId);
  assert.equal(a.revisionNumber, 1);
  assert.deepEqual(a.draft, draft());
  assert.equal(a.scriptApproved, false);
});
test('mutation identities cannot be reused with different content', async () => {
  await as(owner);
  const id = randomUUID(),
    mutation = randomUUID();
  await save(id, null, draft(), mutation);
  await reject(
    () => save(id, null, draft({ title: 'Different' }), mutation),
    /IDEMPOTENCY_MISMATCH/,
  );
});
test('replaying an acknowledged save cannot adopt a newer concurrent head as its own baseline', async () => {
  await as(owner);
  const id = randomUUID(),
    mutation = randomUUID();
  const original = draft();
  const first = await save(id, null, original, mutation);
  await save(id, first.revisionId, draft({ title: 'Saved by another tab' }));
  await reject(() => save(id, null, original, mutation), /REVISION_CONFLICT/);
});
test('stale saves cannot overwrite another device', async () => {
  await as(owner);
  const a = await save(randomUUID(), null, draft());
  const b = await save(a.id, a.revisionId, draft({ title: 'New title' }));
  await reject(
    () => save(a.id, a.revisionId, draft({ title: 'Stale title' })),
    /REVISION_CONFLICT/,
  );
  const loaded = await rpc('select app.load_idea_project($1) as value', [a.id]);
  assert.equal(loaded.draft.title, 'New title');
  assert.equal(loaded.revisionId, b.revisionId);
});
test('foreign project IDs cannot be loaded, overwritten, generated or approved', async () => {
  await as(owner);
  const a = await save(randomUUID(), null, draft());
  await as(outsider);
  await reject(
    () => rpc('select app.load_idea_project($1) as value', [a.id]),
    /RESOURCE_NOT_FOUND/,
  );
  await reject(() => save(a.id, a.revisionId, draft()), /RESOURCE_NOT_FOUND/);
  await reject(() => begin(a), /PILOT_ACCESS_REQUIRED/);
  await reject(
    () => rpc('select app.approve_idea_script($1,$2,true) as value', [a.id, a.revisionId]),
    /RESOURCE_NOT_FOUND/,
  );
  assert.equal((await db.query('select id from app.projects')).rows.length, 0);
});
test('client-supplied ownership and unsupported themes are rejected', async () => {
  await as(owner);
  await reject(
    () => save(randomUUID(), null, draft({ workspaceId: randomUUID() })),
    /INVALID_DRAFT/,
  );
  await reject(
    () => save(randomUUID(), null, draft({ themeId: 'unreviewed-theme' })),
    /INVALID_DRAFT/,
  );
});
test('generation claims are unique and repeated transport requests do not authorize another call', async () => {
  await as(owner);
  const project = await save(randomUUID(), null, draft());
  const id = randomUUID();
  const a = await begin(project, 'script', id);
  const b = await begin(project, 'script', id);
  assert.equal(a.claimed, true);
  assert.equal(b.claimed, false);
  await reject(() => begin(project, 'ideas', id), /IDEMPOTENCY_MISMATCH/);
  await reject(() => begin(project), /GENERATION_IN_PROGRESS/);
});
test('pilot access is bound to auth ID and cannot be changed by user metadata or customer RPC', async () => {
  await as(outsider);
  assert.equal((await rpc('select app.idea_capabilities() as value')).allowed, false);
  await reject(
    () => rpc('select app.configure_idea_pilot($1) as value', ['other@example.test']),
    /permission denied/,
  );
  await db.exec('reset role');
  await db.query(
    "update auth.users set raw_user_meta_data='{" +
      '"role":"admin","pilot":true' +
      "}'::jsonb where id=$1",
    [outsider],
  );
  await as(outsider);
  const p = await save(randomUUID(), null, draft());
  await reject(() => begin(p), /PILOT_ACCESS_REQUIRED/);
});
test('daily limits survive failed attempts and operation replay remains readable', async () => {
  await db.query('select app.configure_idea_pilot($1,1)', ['owner@example.test']);
  await as(owner);
  const p = await save(randomUUID(), null, draft());
  const op = await begin(p);
  await rpc('select app.fail_idea_generation($1,$2,false) as value', [
    op.operation.id,
    'PROVIDER_REJECTED',
  ]);
  await reject(() => begin(p), /DAILY_GENERATION_LIMIT/);
  assert.equal((await begin(p, 'script', op.operation.id)).claimed, false);
  assert.equal((await rpc('select app.idea_capabilities() as value')).remaining, 0);
});
test('successful script result saves a new immutable script and exact approval is idempotent', async () => {
  await as(owner);
  const p = await save(randomUUID(), null, draft());
  const op = await begin(p);
  const result = {
    sections: [section()],
    reviewNotes: ['Review the explanation before approving.'],
  };
  const done = await rpc('select app.finish_idea_generation($1,$2) as value', [
    op.operation.id,
    result,
  ]);
  assert.equal(done.operation.state, 'succeeded');
  assert.equal(done.operation.applied, true);
  assert.equal(done.project.revisionNumber, 2);
  assert.deepEqual(done.project.draft.sections, result.sections);
  const again = await rpc('select app.finish_idea_generation($1,$2) as value', [
    op.operation.id,
    result,
  ]);
  assert.equal(again.project.revisionId, done.project.revisionId);
  await reject(
    () =>
      rpc('select app.approve_idea_script($1,$2,false) as value', [p.id, done.project.revisionId]),
    /CONTENT_REVIEW_REQUIRED/,
  );
  const approved = await rpc('select app.approve_idea_script($1,$2,true) as value', [
    p.id,
    done.project.revisionId,
  ]);
  assert.equal(approved.scriptApproved, true);
  await rpc('select app.approve_idea_script($1,$2,true) as value', [p.id, done.project.revisionId]);
  assert.equal((await db.query('select id from app.approvals')).rows.length, 1);
  await reject(() => db.query("update app.script_versions set sections='[]'"), /permission denied/);
});
test('an AI result cannot overwrite a newer autosave, and its result is retained', async () => {
  await as(owner);
  const p = await save(randomUUID(), null, draft());
  const op = await begin(p);
  const newer = await save(p.id, p.revisionId, draft({ objective: 'A different explanation' }));
  const done = await rpc('select app.finish_idea_generation($1,$2) as value', [
    op.operation.id,
    { sections: [section()], reviewNotes: [] },
  ]);
  assert.equal(done.operation.applied, false);
  assert.equal(done.project.revisionId, newer.revisionId);
  assert.equal(done.operation.result.sections.length, 1);
});
test('source revisions stay attached to a reused script and changing the source invalidates approval', async () => {
  await as(owner);
  const first = await save(randomUUID(), null, draft({ sections: [section()] }));
  const approved = await rpc('select app.approve_idea_script($1,$2,true) as value', [
    first.id,
    first.revisionId,
  ]);
  assert.equal(approved.scriptApproved, true);
  const newer = await save(first.id, first.revisionId, {
    ...first.draft,
    inputText: 'A completely new source text about organizing a different activity.',
  });
  assert.equal(newer.scriptStale, true);
  assert.equal(newer.scriptApproved, false);
  const refs = await db.query('select id from app.revision_sources where revision_id=$1', [
    newer.revisionId,
  ]);
  assert.equal(refs.rows.length, 2);
  await reject(
    () => rpc('select app.approve_idea_script($1,$2,true) as value', [first.id, newer.revisionId]),
    /SCRIPT_STALE/,
  );
});
test('theme changes are saved without invoking or reserving an AI operation', async () => {
  await as(owner);
  const p = await save(randomUUID(), null, draft());
  const updated = await save(p.id, p.revisionId, draft({ themeId: 'midnight' }));
  assert.equal(updated.draft.themeId, 'midnight');
  assert.equal((await db.query('select id from app.idea_ai_operations')).rows.length, 0);
});
test('unconfirmed URL content is saved but cannot be used for generation', async () => {
  await as(owner);
  const p = await save(
    randomUUID(),
    null,
    draft({
      inputType: 'url',
      sourceUrl: 'https://example.test/article',
      sourceRetrievedAt: '2026-10-28T12:00:00.000Z',
    }),
  );
  await reject(() => begin(p), /SOURCE_UNCONFIRMED/);
});
test('malformed model output and forged source references are rejected', async () => {
  await as(owner);
  const p = await save(randomUUID(), null, draft());
  const op = await begin(p);
  await reject(
    () =>
      rpc('select app.finish_idea_generation($1,$2) as value', [
        op.operation.id,
        { sections: [section({ sourceRefs: ['another-account-block'] })], reviewNotes: [] },
      ]),
    /INVALID_SOURCE_REFERENCE/,
  );
});
test('unknown outcomes remain uncertain without an automatic retry', async () => {
  await as(owner);
  const p = await save(randomUUID(), null, draft());
  const op = await begin(p);
  const failed = await rpc('select app.fail_idea_generation($1,$2,true) as value', [
    op.operation.id,
    'OUTCOME_UNCERTAIN',
  ]);
  assert.equal(failed.state, 'uncertain');
  assert.equal((await begin(p, 'script', op.operation.id)).claimed, false);
});
test('an active request cannot be dismissed before its interruption threshold', async () => {
  await as(owner);
  const p = await save(randomUUID(), null, draft());
  const op = await begin(p);
  await reject(
    () => rpc('select app.resolve_interrupted_idea_request($1) as value', [op.operation.id]),
    /REQUEST_STILL_RUNNING/,
  );
});
