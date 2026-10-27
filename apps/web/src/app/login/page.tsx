import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { AuthShell } from '@/components/auth/auth-shell';
import { AuthForm } from '@/components/auth/auth-form';
import { safeAuthDestination } from '@/lib/auth/validation';
import { getAuthContext } from '@/lib/supabase/server';

export const metadata: Metadata = { title: 'Log in | Video Studio' };

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string | string[] }>;
}) {
  const next = safeAuthDestination((await searchParams).next);
  const { user, supabase } = await getAuthContext();
  if (user) redirect(next);
  return (
    <AuthShell mode="login">
      <AuthForm mode="login" next={next} configured={!!supabase} />
    </AuthShell>
  );
}
