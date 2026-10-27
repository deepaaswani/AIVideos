import { validateCredentials, type AuthFormState, type AuthMode } from './validation';

type AuthResult = { session: boolean; error: { code?: string; status?: number } | null };
export type AuthGateway = {
  isEmailConfirmationDisabled: () => Promise<boolean>;
  signIn: (credentials: { email: string; password: string }) => Promise<AuthResult>;
  signUp: (credentials: { name: string; email: string; password: string }) => Promise<AuthResult>;
};
export type AuthOutcome = { ok: true } | { ok: false; state: AuthFormState };

export async function runAuthFlow(
  mode: AuthMode,
  form: FormData,
  gateway: AuthGateway,
): Promise<AuthOutcome> {
  const input = validateCredentials(mode, form);
  const values = { name: input.name, email: input.email };
  if (!input.valid)
    return {
      ok: false,
      state: { message: 'Please check the highlighted fields.', errors: input.errors, values },
    };
  try {
    // Check before signup: never initiate confirmation mail when immediate signup is required.
    if (mode === 'signup' && !(await gateway.isEmailConfirmationDisabled())) {
      return {
        ok: false,
        state: {
          message: 'Account creation is temporarily unavailable. Please try again shortly.',
          values,
        },
      };
    }
    const result =
      mode === 'signup'
        ? await gateway.signUp({ name: input.name, email: input.email, password: input.password })
        : await gateway.signIn({ email: input.email, password: input.password });
    if (!result.error && result.session) return { ok: true };
    let message =
      mode === 'login'
        ? 'We couldn’t sign you in. Check your email and password and try again.'
        : 'We couldn’t create your account. Try signing in if you already have one.';
    if (result.error?.status === 429 || result.error?.code === 'over_request_rate_limit') {
      message = 'Too many attempts. Please wait a moment before trying again.';
    } else if (result.error?.code === 'weak_password') {
      message = 'Choose a stronger password and try again.';
    } else if (result.error?.code === 'signup_disabled') {
      message = 'Account creation is temporarily unavailable. Please try again shortly.';
    } else if (mode === 'signup' && !result.error && !result.session) {
      message = 'Your account could not be signed in yet. Please try logging in.';
    }
    return { ok: false, state: { message, values } };
  } catch {
    return {
      ok: false,
      state: { message: 'We couldn’t reach the sign-in service. Please try again.', values },
    };
  }
}
