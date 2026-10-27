'use client';

import { useActionState, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { login, signup } from '@/app/auth/actions';
import type { AuthFormState, AuthMode } from '@/lib/auth/validation';
import styles from './auth.module.css';

const initialState: AuthFormState = {};

export function AuthForm({
  mode,
  next,
  configured,
}: {
  mode: AuthMode;
  next: string;
  configured: boolean;
}) {
  const isSignup = mode === 'signup';
  const [state, action, pending] = useActionState(isSignup ? signup : login, initialState);
  const [showPassword, setShowPassword] = useState(false);
  const messageRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (state.message) messageRef.current?.focus();
  }, [state]);
  const suffix = `?next=${encodeURIComponent(next)}`;
  return (
    <div className={styles.formPanel}>
      <nav className={styles.authTabs} aria-label="Account access">
        <Link href={`/login${suffix}`} aria-current={!isSignup ? 'page' : undefined}>
          Log in
        </Link>
        <Link href={`/signup${suffix}`} aria-current={isSignup ? 'page' : undefined}>
          Sign up
        </Link>
      </nav>
      <div className={styles.formHeading}>
        <p className={styles.smallLabel}>
          {isSignup ? 'Your story begins here' : 'Back to your ideas'}
        </p>
        <h2>{isSignup ? 'Make yourself at home.' : 'Welcome back.'}</h2>
        <p>
          {isSignup
            ? 'Create your personal Video Studio account.'
            : 'Log in and pick up where you left off.'}
        </p>
      </div>
      {!configured && (
        <div className={styles.message} role="status">
          Sign-in is temporarily unavailable. Please try again shortly.
        </div>
      )}
      {state.message && (
        <div ref={messageRef} className={styles.message} role="alert" tabIndex={-1}>
          {state.message}
        </div>
      )}
      <form action={action} className={styles.form} aria-busy={pending}>
        <input type="hidden" name="next" value={next} />
        <fieldset disabled={pending || !configured}>
          <legend className={styles.srOnly}>
            {isSignup ? 'Create your account' : 'Your login details'}
          </legend>
          {isSignup && (
            <div className={styles.field}>
              <label htmlFor="name">Your name</label>
              <input
                id="name"
                name="name"
                autoComplete="name"
                placeholder="Your name"
                defaultValue={state.values?.name}
                required
                maxLength={120}
                aria-invalid={!!state.errors?.name}
                aria-describedby={state.errors?.name ? 'name-error' : undefined}
              />
              {state.errors?.name && (
                <p id="name-error" className={styles.fieldError}>
                  {state.errors.name}
                </p>
              )}
            </div>
          )}
          <div className={styles.field}>
            <label htmlFor="email">Email address</label>
            <input
              id="email"
              name="email"
              type="email"
              inputMode="email"
              autoComplete="username"
              autoCapitalize="none"
              spellCheck={false}
              placeholder="you@example.com"
              defaultValue={state.values?.email}
              required
              maxLength={254}
              aria-invalid={!!state.errors?.email}
              aria-describedby={state.errors?.email ? 'email-error' : undefined}
            />
            {state.errors?.email && (
              <p id="email-error" className={styles.fieldError}>
                {state.errors.email}
              </p>
            )}
          </div>
          <div className={styles.field}>
            <label htmlFor="password">Password</label>
            <div className={styles.passwordField}>
              <input
                id="password"
                name="password"
                type={showPassword ? 'text' : 'password'}
                autoComplete={isSignup ? 'new-password' : 'current-password'}
                placeholder={isSignup ? 'Create a password' : 'Enter your password'}
                required
                minLength={isSignup ? 8 : undefined}
                maxLength={1024}
                aria-invalid={!!state.errors?.password}
                aria-describedby={
                  [isSignup ? 'password-hint' : '', state.errors?.password ? 'password-error' : '']
                    .filter(Boolean)
                    .join(' ') || undefined
                }
              />
              <button
                type="button"
                className={styles.reveal}
                aria-label={showPassword ? 'Hide password' : 'Show password'}
                aria-pressed={showPassword}
                onClick={() => setShowPassword((value) => !value)}
              >
                {showPassword ? 'Hide' : 'Show'}
              </button>
            </div>
            {isSignup && (
              <p id="password-hint" className={styles.hint}>
                Use at least 8 characters.
              </p>
            )}
            {state.errors?.password && (
              <p id="password-error" className={styles.fieldError}>
                {state.errors.password}
              </p>
            )}
          </div>
          <button type="submit" className={styles.primaryButton} disabled={pending || !configured}>
            {pending
              ? isSignup
                ? 'Creating your account…'
                : 'Logging you in…'
              : isSignup
                ? 'Create account'
                : 'Log in'}
            <span aria-hidden="true">→</span>
          </button>
        </fieldset>
      </form>
      <p className={styles.switchPrompt}>
        {isSignup ? 'Already have an account?' : 'New to Video Studio?'}{' '}
        <Link href={`${isSignup ? '/login' : '/signup'}${suffix}`}>
          {isSignup ? 'Log in' : 'Create an account'}
        </Link>
      </p>
      <p className={styles.personalNote}>
        <svg
          aria-hidden="true"
          width="15"
          height="17"
          viewBox="0 0 15 17"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.3"
        >
          <rect x="2" y="7" width="11" height="8" rx="2" />
          <path d="M4.5 7V5a3 3 0 0 1 6 0v2M7.5 10v2" />
        </svg>
        Your own account. Your own creative space.
      </p>
    </div>
  );
}
