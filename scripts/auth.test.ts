import assert from 'node:assert/strict';
import { test } from 'node:test';
import { runAuthFlow, type AuthGateway } from '../apps/web/src/lib/auth/flows';
import { safeAuthDestination, validateCredentials } from '../apps/web/src/lib/auth/validation';

function form(values: Record<string, string> = {}) {
  const data = new FormData();
  for (const [key, value] of Object.entries({
    name: 'Test Creator',
    email: 'creator@example.test',
    password: 'a-good-test-password',
    ...values,
  }))
    data.set(key, value);
  return data;
}

function gateway(overrides: Partial<AuthGateway> = {}): AuthGateway {
  return {
    isEmailConfirmationDisabled: async () => true,
    signIn: async () => ({ session: true, error: null }),
    signUp: async () => ({ session: true, error: null }),
    ...overrides,
  };
}

test('redirect destinations reject external URLs, control characters and auth-page loops', () => {
  for (const value of [
    'https://evil.test',
    '//evil.test',
    '/\\evil.test',
    '/dashboard/../../login',
    '/login',
    '/signup',
    '/dashboard-evil',
    '/dashboard\nX-Header:value',
    '/%2f%2fevil.test',
    undefined,
    ['/prototype'],
  ]) {
    assert.equal(safeAuthDestination(value), '/dashboard');
  }
  assert.equal(safeAuthDestination('/prototype?mode=narrated'), '/prototype?mode=narrated');
  assert.equal(safeAuthDestination('/dashboard?view=recent'), '/dashboard?view=recent');
});

test('signup validates names and passwords before invoking the provider', async () => {
  let calls = 0;
  const result = await runAuthFlow(
    'signup',
    form({ name: '', email: 'not-an-email', password: 'short' }),
    gateway({
      signUp: async () => {
        calls++;
        return { session: true, error: null };
      },
    }),
  );
  assert.equal(calls, 0);
  assert.equal(result.ok, false);
  if (!result.ok) {
    assert.ok(result.state.errors?.name);
    assert.ok(result.state.errors?.email);
    assert.ok(result.state.errors?.password);
    assert.equal(JSON.stringify(result).includes('short'), false);
  }
});

test('password byte bounds preserve exact input and login accepts existing shorter passwords', () => {
  assert.equal(validateCredentials('signup', form({ password: 'é'.repeat(36) })).valid, true);
  assert.equal(validateCredentials('signup', form({ password: 'é'.repeat(37) })).valid, false);
  const login = validateCredentials('login', form({ password: ' abcde ' }));
  assert.equal(login.valid, true);
  assert.equal(login.password, ' abcde ');
});

test('confirmation-enabled signup is blocked before an account or email can be created', async () => {
  let calls = 0;
  const result = await runAuthFlow(
    'signup',
    form(),
    gateway({
      isEmailConfirmationDisabled: async () => false,
      signUp: async () => {
        calls++;
        return { session: true, error: null };
      },
    }),
  );
  assert.equal(result.ok, false);
  assert.equal(calls, 0);
});

test('failed confirmation preflight never falls through to signup', async () => {
  let calls = 0;
  const result = await runAuthFlow(
    'signup',
    form(),
    gateway({
      isEmailConfirmationDisabled: async () => {
        throw new Error('Network unavailable');
      },
      signUp: async () => {
        calls++;
        return { session: true, error: null };
      },
    }),
  );
  assert.equal(result.ok, false);
  assert.equal(calls, 0);
});

test('immediate signup passes only intended profile metadata and requires a real session', async () => {
  let received: unknown;
  const result = await runAuthFlow(
    'signup',
    form({ email: ' Creator@Example.Test ' }),
    gateway({
      signUp: async (input) => {
        received = input;
        return { session: true, error: null };
      },
    }),
  );
  assert.equal(result.ok, true);
  assert.deepEqual(received, {
    name: 'Test Creator',
    email: 'creator@example.test',
    password: 'a-good-test-password',
  });
  const noSession = await runAuthFlow(
    'signup',
    form(),
    gateway({ signUp: async () => ({ session: false, error: null }) }),
  );
  assert.equal(noSession.ok, false);
});

test('login does not depend on signup settings and never reports provider errors as success', async () => {
  const result = await runAuthFlow(
    'login',
    form(),
    gateway({
      isEmailConfirmationDisabled: async () => {
        throw new Error('Should not be called');
      },
      signIn: async () => ({ session: false, error: { code: 'invalid_credentials', status: 400 } }),
    }),
  );
  assert.equal(result.ok, false);
  if (!result.ok) assert.match(result.state.message ?? '', /email and password/);
  assert.deepEqual(await runAuthFlow('login', form(), gateway()), { ok: true });
});

test('provider failures never echo passwords or raw error messages', async () => {
  const result = await runAuthFlow(
    'login',
    form(),
    gateway({
      signIn: async () => {
        throw new Error('a-good-test-password and private provider details');
      },
    }),
  );
  assert.equal(result.ok, false);
  assert.equal(JSON.stringify(result).includes('a-good-test-password'), false);
  assert.equal(JSON.stringify(result).includes('private provider details'), false);
});

test('rate limits return a retry message instead of revealing account existence', async () => {
  const result = await runAuthFlow(
    'login',
    form(),
    gateway({ signIn: async () => ({ session: false, error: { status: 429 } }) }),
  );
  assert.equal(result.ok, false);
  if (!result.ok) assert.match(result.state.message ?? '', /Too many attempts/);
});
