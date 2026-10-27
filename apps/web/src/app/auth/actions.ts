'use server';

import { redirect } from 'next/navigation';
import { runAuthFlow, type AuthGateway } from '@/lib/auth/flows';
import { safeAuthDestination, type AuthFormState, type AuthMode } from '@/lib/auth/validation';
import { createSupabaseServerClient, emailConfirmationIsDisabled } from '@/lib/supabase/server';

async function submit(mode: AuthMode, form: FormData): Promise<AuthFormState> {
  const supabase = await createSupabaseServerClient(true);
  if (!supabase)
    return { message: 'Sign-in is temporarily unavailable. Please try again shortly.' };
  const gateway: AuthGateway = {
    isEmailConfirmationDisabled: emailConfirmationIsDisabled,
    async signIn(credentials) {
      const { data, error } = await supabase.auth.signInWithPassword(credentials);
      return { session: !!data.session, error };
    },
    async signUp({ name, email, password }) {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: { data: { display_name: name } },
      });
      return { session: !!data.session, error };
    },
  };
  const outcome = await runAuthFlow(mode, form, gateway);
  if (!outcome.ok) return outcome.state;
  redirect(safeAuthDestination(form.get('next')));
}

export async function login(_previous: AuthFormState, form: FormData): Promise<AuthFormState> {
  return submit('login', form);
}

export async function signup(_previous: AuthFormState, form: FormData): Promise<AuthFormState> {
  return submit('signup', form);
}

export async function signOut() {
  const supabase = await createSupabaseServerClient(true);
  if (supabase) {
    const { error } = await supabase.auth.signOut({ scope: 'local' });
    if (error) redirect('/dashboard?notice=signout_failed');
  }
  redirect('/login');
}
