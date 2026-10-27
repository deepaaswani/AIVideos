'use client';

import dynamic from 'next/dynamic';
import Link from 'next/link';
import type { NarrationManifest } from '@aivideos/video';
import styles from './prototype.module.css';

const PrototypePlayer = dynamic(() => import('./prototype-player'), {
  ssr: false,
  loading: () => (
    <div className={styles.loading} role="status">
      Loading the storyboard preview…
    </div>
  ),
});

export default function PrototypePreview({
  mode,
  narration,
  narrationError,
}: {
  mode: 'silent' | 'narrated';
  narration?: NarrationManifest;
  narrationError?: string;
}) {
  const narrated = mode === 'narrated';
  return (
    <main className={styles.page}>
      <nav className={styles.navigation} aria-label="Prototype navigation">
        <Link href="/" className={styles.brand}>
          <span className={styles.mark} aria-hidden="true">
            V
          </span>
          Video Studio
        </Link>
        <span className={styles.stage}>{narrated ? 'Narration prototype' : 'P0 prototype'}</span>
      </nav>

      <div className={styles.heading}>
        <p className={styles.eyebrow}>
          {narrated
            ? narration
              ? 'Measured narration'
              : 'Narration unavailable'
            : 'Controlled visual render'}
        </p>
        <h1>One source. Five clear scenes.</h1>
        <p>
          {narrated
            ? narration
              ? 'Preview the same five authored scenes with the configured male voice and measured scene audio. Opening this page makes no paid generation requests.'
              : 'This mode uses the configured male voice for the same five authored scenes. Narration is currently unavailable. Opening this page makes no paid generation requests.'
            : 'Preview the authored planning fixture with reusable motion templates. This P0 visual test is intentionally silent.'}
        </p>
        <nav className={styles.modeNavigation} aria-label="Preview mode">
          <Link href="/prototype" aria-current={!narrated ? 'page' : undefined}>
            Silent P0
          </Link>
          <Link href="/prototype?mode=narrated" aria-current={narrated ? 'page' : undefined}>
            Narrated
          </Link>
          <Link href="/prototype/uber">Uber test</Link>
        </nav>
      </div>

      {narrated && !narration ? (
        <p className={styles.narrationError} role="alert">
          {narrationError ?? 'Narration is unavailable. Generate the five scene clips locally.'}
        </p>
      ) : (
        <PrototypePlayer key={mode} narration={narration} />
      )}

      <section className={styles.export} aria-labelledby="export-title">
        <div>
          <p className={styles.eyebrow}>Render locally</p>
          <h2 id="export-title">Export the same composition.</h2>
          <p>
            Run the command from the repository root. Rendering runs outside the web request and
            writes generated artifacts to the ignored output directory.
          </p>
        </div>
        <code>{narrated ? 'npm run prototype:render:narrated' : 'npm run prototype:render'}</code>
      </section>

      <p className={styles.boundary}>
        {narrated
          ? 'Narration uses locally cached ElevenLabs audio and measured timing. Synchronized captions and SRT are pending. This preview does not establish the full prototype’s acceptance gates.'
          : 'P0 uses authored sample data and estimated scene timings. Choose Narrated for locally generated speech. Synchronized captions and SRT are pending. This preview does not establish the full prototype’s acceptance gates.'}
      </p>
    </main>
  );
}
