'use client';

import dynamic from 'next/dynamic';
import Link from 'next/link';
import type { Storyboard } from '@aivideos/contracts';
import styles from '../prototype.module.css';

const PrototypePlayer = dynamic(() => import('../prototype-player'), {
  ssr: false,
  loading: () => (
    <div className={styles.loading} role="status">
      Loading the Uber-style storyboard preview…
    </div>
  ),
});

export default function UberPreview({ storyboard }: { storyboard: Storyboard }) {
  return (
    <main className={styles.page}>
      <nav className={styles.navigation} aria-label="Prototype navigation">
        <Link href="/" className={styles.brand}>
          <span className={styles.mark} aria-hidden="true">
            V
          </span>
          Video Studio
        </Link>
        <span className={styles.stage}>Uber test prototype</span>
      </nav>

      <div className={styles.heading}>
        <p className={styles.eyebrow}>System design · silent test</p>
        <h1>How a ride becomes a trip.</h1>
        <p>
          Explore a simplified Uber-style ride-hailing architecture in five authored scenes. This
          separate 30-second fixture uses estimated timing and is intentionally silent.
        </p>
        <nav className={styles.modeNavigation} aria-label="Preview mode">
          <Link href="/prototype">Silent P0</Link>
          <Link href="/prototype?mode=narrated">Narrated</Link>
          <Link href="/prototype/uber" aria-current="page">
            Uber test
          </Link>
        </nav>
      </div>

      <PrototypePlayer storyboard={storyboard} />

      <section className={styles.export} aria-labelledby="fixture-title">
        <div>
          <p className={styles.eyebrow}>Independent authored fixture</p>
          <h2 id="fixture-title">A separate system-design test.</h2>
          <p>
            The original planning prototype and its narrated export remain available through the
            links above. This test has its own storyboard and source packet.
          </p>
        </div>
      </section>

      <p className={styles.boundary}>
        This educational design is informed by public Uber engineering posts; it is not a verified
        map of Uber’s current production architecture. Narration, synchronized captions and SRT have
        not been generated for this test. Opening this preview makes no paid generation requests.
      </p>
    </main>
  );
}
