import 'server-only';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { getSupabaseConfig } from './config';

export async function createSupabaseServerClient(writeCookies = false) {
  const config = getSupabaseConfig();
  if (!config) return null;
  const cookieStore = await cookies();
  return createServerClient(config.url, config.key, {
    cookies: {
      getAll: () => cookieStore.getAll(),
      setAll: writeCookies
        ? (cookiesToSet) => {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options),
            );
          }
        : undefined,
    },
  });
}

export async function emailConfirmationIsDisabled() {
  const config = getSupabaseConfig();
  if (!config) return false;
  const response = await fetch(`${config.url}/auth/v1/settings`, {
    headers: { apikey: config.key },
    cache: 'no-store',
    signal: AbortSignal.timeout(10000),
  });
  if (!response.ok) return false;
  const settings: unknown = await response.json();
  return (
    typeof settings === 'object' &&
    settings !== null &&
    'mailer_autoconfirm' in settings &&
    settings.mailer_autoconfirm === true
  );
}

export async function getAuthContext() {
  const supabase = await createSupabaseServerClient();
  if (!supabase) return { supabase: null, user: null };
  try {
    const { data, error } = await supabase.auth.getUser();
    return { supabase, user: error ? null : data.user };
  } catch {
    return { supabase, user: null };
  }
}
