import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { IdeaWorkspace } from '@/components/idea/idea-workspace';
import { IdeaError } from '@/lib/idea/errors';
import { getIdeaCapabilities, loadIdeaProject } from '@/lib/idea/repository';
import { getAuthContext } from '@/lib/supabase/server';
export const metadata: Metadata = { title: 'Your idea & script | Video Studio' };
export default async function StudioPage({ params }: { params: Promise<{ projectId: string }> }) {
  const { projectId } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(projectId)) notFound();
  const { user, supabase } = await getAuthContext();
  if (!user || !supabase)
    redirect(`/login?next=${encodeURIComponent(`/projects/${projectId}/studio`)}`);
  let loaded: Awaited<ReturnType<typeof loadIdeaProject>> | null = null;
  let access: Awaited<ReturnType<typeof getIdeaCapabilities>> | null = null;
  try {
    const context = { user, supabase };
    const [project, capabilities] = await Promise.all([
      loadIdeaProject(context, projectId),
      getIdeaCapabilities(context),
    ]);
    loaded = project;
    access = capabilities;
  } catch (error) {
    if (error instanceof IdeaError && error.status === 404) notFound();
  }
  if (!loaded || !access)
    return (
      <main style={{ padding: 40 }}>
        <h1>Your saved draft couldn’t be loaded.</h1>
        <p>Please try again in a moment.</p>
        <Link href="/dashboard">Return to dashboard</Link>
      </main>
    );
  return (
    <IdeaWorkspace
      project={loaded}
      newProjectId={projectId}
      capabilities={access}
      email={user.email ?? ''}
    />
  );
}
