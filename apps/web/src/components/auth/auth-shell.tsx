import type { ReactNode } from 'react';
import Link from 'next/link';
import localFont from 'next/font/local';
import styles from './auth.module.css';

const inter = localFont({
  src: [
    { path: '../../app/fonts/inter-latin-400-normal.woff2', weight: '400', style: 'normal' },
    { path: '../../app/fonts/inter-latin-500-normal.woff2', weight: '500', style: 'normal' },
    { path: '../../app/fonts/inter-latin-600-normal.woff2', weight: '600', style: 'normal' },
    { path: '../../app/fonts/inter-latin-700-normal.woff2', weight: '700', style: 'normal' },
  ],
  variable: '--font-auth',
  display: 'swap',
});

export function AuthShell({
  mode,
  children,
}: {
  mode: 'login' | 'signup' | 'welcome';
  children: ReactNode;
}) {
  return (
    <main className={`${styles.page} ${inter.variable}`}>
      <a className={styles.skipLink} href="#account-content">
        Skip to account
      </a>
      <section className={styles.story} aria-label="Video Studio">
        <Link href="/" className={styles.brand} aria-label="Video Studio home">
          <span className={styles.brandMark}>vs</span> Video Studio
        </Link>
        <div className={styles.storyContent}>
          <p className={styles.eyebrow}>A little thought. A little motion.</p>
          <h1>
            {mode === 'login' ? (
              <>
                Your next story
                <br /> starts here.
              </>
            ) : (
              <>
                Good ideas deserve
                <br /> to be seen.
              </>
            )}
          </h1>
          <p className={styles.storyCopy}>
            Bring your knowledge. Give it a voice.
            <br /> Make something worth watching.
          </p>
          <div className={styles.illustration} aria-hidden="true">
            <div className={styles.noteCard}>
              <span className={styles.noteDot} />
              <i />
              <i />
              <i />
            </div>
            <div className={styles.sceneCard}>
              <span />
              <span />
              <span />
            </div>
            <div className={styles.videoCard}>
              <div className={styles.videoScreen}>
                <div className={styles.orbit} />
                <div className={styles.play}>
                  <svg width="33" height="38" viewBox="0 0 33 38" fill="currentColor">
                    <path d="M5 3a2 2 0 0 1 3-1l23 15a2 2 0 0 1 0 4L8 36a2 2 0 0 1-3-1Z" />
                  </svg>
                </div>
                <div className={styles.captionLines}>
                  <i />
                  <i />
                </div>
              </div>
              <div className={styles.videoTimeline}>
                <span />
              </div>
            </div>
            <span className={styles.ideaLabel}>An idea, brought to life.</span>
          </div>
          <div className={styles.journey}>
            <span>01 / Idea</span>
            <i />
            <span>02 / Storyboard</span>
            <i />
            <span>03 / Video</span>
          </div>
        </div>
        <p className={styles.storyFooter}>From brief to brilliant video.</p>
      </section>
      <section
        className={styles.account}
        id="account-content"
        aria-label={
          mode === 'welcome' ? 'Your account' : mode === 'login' ? 'Log in' : 'Create an account'
        }
      >
        <Link href="/" className={styles.backLink}>
          <span aria-hidden="true">←</span> Back to home
        </Link>
        <div className={styles.accountInner}>{children}</div>
        <p className={styles.accountFooter}>A space for your ideas to take shape.</p>
      </section>
    </main>
  );
}
