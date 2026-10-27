import type { Metadata } from 'next';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { AuthShell } from '@/components/auth/auth-shell';
import styles from '@/components/auth/auth.module.css';
import { getAuthContext } from '@/lib/supabase/server';
import { signOut } from '@/app/auth/actions';

export const metadata: Metadata = { title: 'Your studio | Video Studio' };

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ notice?: string }>;
}) {
  const { user, supabase } = await getAuthContext();
  if (!user || !supabase) redirect('/login?next=%2Fdashboard');
  const { notice } = await searchParams;
  const workspace = await supabase.schema('app').rpc('ensure_personal_workspace');
  const workspaceId = typeof workspace.data === 'string' ? workspace.data : null;
  const result = workspaceId
    ? await supabase
        .schema('app')
        .from('projects')
        .select('id,title')
        .eq('workspace_id', workspaceId)
        .eq('lifecycle', 'active')
        .order('updated_at', { ascending: false })
        .limit(12)
    : null;
  const available = !workspace.error && !!workspaceId && !!result && !result.error;
  const projects =
    available && Array.isArray(result?.data)
      ? result.data.filter(
          (project): project is { id: string; title: string } =>
            typeof project.id === 'string' && typeof project.title === 'string',
        )
      : [];
  const name =
    typeof user.user_metadata.display_name === 'string'
      ? user.user_metadata.display_name.split(' ')[0]
      : null;
  return (
    <AuthShell mode="welcome">
      <header className={styles.memberHeader}>
        <div>
          <p className={styles.smallLabel}>Your personal studio</p>
          <h2>{name ? `Hello, ${name}.` : 'Welcome in.'}</h2>
          <p className={styles.memberEmail}>{user.email}</p>
        </div>
        <form action={signOut}>
          <button className={styles.signOut} type="submit">
            Log out
          </button>
        </form>
      </header>
      {notice === 'signout_failed' && (
        <div className={styles.message} role="alert">
          We couldn’t log you out. Please try again.
        </div>
      )}
      {!available && (
        <div className={styles.message} role="status">
          We couldn’t load your studio.{' '}
          <Link href="/dashboard" prefetch={false}>
            Refresh to try again.
          </Link>
        </div>
      )}
      <section className={styles.welcomeCard} aria-labelledby="welcome-title">
        <div className={styles.welcomeIcon} aria-hidden="true">
          ▷
        </div>
        <h3 id="welcome-title">
          {projects.length ? 'A little more motion.' : 'Make room for your next idea.'}
        </h3>
        <p>
          Turn your next idea into a clear explainer. Start a new brief or continue a saved draft.
        </p>
        {!!projects.length && (
          <ul className={styles.projectList}>
            {projects.map((project) => (
              <li key={project.id}>
                <Link href={`/projects/${project.id}/studio`}>{project.title} →</Link>
                <span>Saved project</span>
              </li>
            ))}
          </ul>
        )}
        <Link className={styles.primaryButton} href="/projects/new">
          Create a video <span aria-hidden="true">→</span>
        </Link>
      </section>
      <p className={styles.personalNote}>Your account and projects belong to you.</p>
    </AuthShell>
  );
}
