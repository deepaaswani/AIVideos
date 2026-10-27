export type AuthMode = 'login' | 'signup';
export type AuthField = 'name' | 'email' | 'password';
export type AuthFormState = {
  message?: string;
  errors?: Partial<Record<AuthField, string>>;
  values?: { name: string; email: string };
};

export function safeAuthDestination(value: unknown): string {
  if (
    typeof value !== 'string' ||
    value.length > 2048 ||
    !value.startsWith('/') ||
    value.startsWith('//') ||
    /[\\\u0000-\u001f\u007f]/u.test(value)
  )
    return '/dashboard';
  try {
    const url = new URL(value, 'https://video-studio.invalid');
    if (url.origin !== 'https://video-studio.invalid') return '/dashboard';
    if (
      url.pathname !== '/projects/new' &&
      !/^\/projects\/[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}\/studio$/i.test(
        url.pathname,
      ) &&
      !['/dashboard', '/prototype'].some(
        (path) => url.pathname === path || url.pathname.startsWith(`${path}/`),
      )
    )
      return '/dashboard';
    return `${url.pathname}${url.search}${url.hash}`;
  } catch {
    return '/dashboard';
  }
}

export function validateCredentials(mode: AuthMode, form: FormData) {
  const text = (key: string) => (typeof form.get(key) === 'string' ? String(form.get(key)) : '');
  const name = text('name').trim();
  const email = text('email').trim().toLowerCase();
  const password = text('password');
  const errors: Partial<Record<AuthField, string>> = {};
  if (mode === 'signup' && (!name || name.length > 120))
    errors.name = 'Enter your name using 1–120 characters.';
  if (email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/u.test(email))
    errors.email = 'Enter a valid email address.';
  if (!password) errors.password = 'Enter your password.';
  else if (mode === 'signup' && password.length < 8) errors.password = 'Use at least 8 characters.';
  else if (mode === 'signup' && new TextEncoder().encode(password).length > 72)
    errors.password = 'Use a shorter password (up to 72 UTF-8 bytes).';
  else if (password.length > 1024) errors.password = 'Your password is too long.';
  return { name, email, password, errors, valid: Object.keys(errors).length === 0 };
}
