import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { IdeaWorkspace } from '@/components/idea/idea-workspace';
import { getAuthContext } from '@/lib/supabase/server';
import { getIdeaCapabilities } from '@/lib/idea/repository';
export const metadata: Metadata = { title: 'Create a video | Video Studio' };
export default async function NewProjectPage() {
  const { user, supabase } = await getAuthContext();
  if (!user || !supabase) redirect('/login?next=%2Fprojects%2Fnew');
  const capabilities = await getIdeaCapabilities({ user, supabase });
  return (
    <IdeaWorkspace
      project={null}
      newProjectId={crypto.randomUUID()}
      capabilities={capabilities}
      email={user.email ?? ''}
    />
  );
}
