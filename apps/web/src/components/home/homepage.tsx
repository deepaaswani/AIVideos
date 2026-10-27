'use client';

import { useEffect, useRef, useState } from 'react';
import dynamic from 'next/dynamic';
import Link from 'next/link';
import type { NarrationManifest } from '@aivideos/video';
import { BinarySearchDemo, RamDemo, WaterCycleDemo } from './motion-demos';
import { Icon } from './icons';
import styles from './homepage.module.css';

const StudioExample = dynamic(() => import('./home-example-player'), {
  ssr: false,
  loading: () => (
    <p className={styles.loading} role="status">
      Loading the studio example…
    </p>
  ),
});

type Example = 'binary' | 'ram' | 'water' | 'narrated';
const studioUrl = '/prototype?mode=narrated';
const accountUrl = '/projects/new';
const exampleTitles: Record<Example, string> = {
  binary: 'How binary search works',
  ram: 'RAM versus storage',
  water: 'The water cycle',
  narrated: 'A clear plan, in 30 seconds',
};
const steps = [
  {
    icon: 'bulb',
    title: 'Bring an idea',
    text: 'Start with a question, a few notes, or a script. Build on what you already know.',
  },
  {
    icon: 'script',
    title: 'Review your storyboard',
    text: 'See how the words and visuals come together, one clear scene at a time.',
  },
  {
    icon: 'film',
    title: 'Create your video',
    text: 'Bring the story to life with motion, a natural voice, and considered pacing.',
  },
  {
    icon: 'upload',
    title: 'Make it yours',
    text: 'Review the finished story, then export a vertical MP4 ready to share.',
  },
];
const examples = [
  {
    id: 'binary' as const,
    category: 'Algorithms & data',
    icon: 'grid',
    title: 'How binary search works',
    text: 'A sorted list. A smart comparison. See how each step cuts the search space in half.',
    tag: 'CS fundamentals',
  },
  {
    id: 'ram' as const,
    category: 'Computer architecture',
    icon: 'cpu',
    title: 'RAM versus storage',
    text: 'A workbench and a bookshelf make two different kinds of computer memory feel familiar.',
    tag: 'Everyday computing',
  },
  {
    id: 'water' as const,
    category: 'Earth science',
    icon: 'drops',
    title: 'The water cycle',
    text: 'Follow a drop from water to cloud to rain. A small journey that keeps the world moving.',
    tag: 'Natural systems',
  },
];
const features = [
  {
    id: 'script',
    icon: 'script',
    title: 'Words that sound like you',
    text: 'Give every sentence a purpose. Try a small edit in the demo.',
  },
  {
    id: 'storyboard',
    icon: 'grid',
    title: 'A story you can see',
    text: 'Follow the visual beats before the final frame. Choose a scene.',
  },
  {
    id: 'voice',
    icon: 'mic',
    title: 'A natural human voice',
    text: 'Hear the measured narration in our working studio example.',
  },
  {
    id: 'captions',
    icon: 'captions',
    title: 'Clarity in every word',
    text: 'Word-aligned captions are next on the studio roadmap.',
  },
] as const;
type Feature = (typeof features)[number]['id'];

export default function Homepage({
  className,
  narration,
}: {
  className: string;
  narration?: NarrationManifest;
}) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [example, setExample] = useState<Example | null>(null);
  const [feature, setFeature] = useState<Feature>('script');
  const [scene, setScene] = useState(1);
  const [script, setScript] = useState(
    '14 is greater than 11. So we keep the right half and compare again.',
  );
  const dialogRef = useRef<HTMLDialogElement>(null);
  const openerRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (!example) return;
    const dialog = dialogRef.current;
    if (dialog && !dialog.open) dialog.showModal();
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = previous;
    };
  }, [example]);

  useEffect(() => {
    if (!menuOpen) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setMenuOpen(false);
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [menuOpen]);

  function openExample(value: Example, opener: HTMLElement) {
    openerRef.current = opener;
    setExample(value);
  }
  function closeExample() {
    dialogRef.current?.close();
  }
  function onDialogClose() {
    setExample(null);
    requestAnimationFrame(() => openerRef.current?.focus());
  }

  return (
    <main className={`${styles.page} ${className}`} data-homepage>
      <a className={styles.skipLink} href="#main-content">
        Skip to content
      </a>
      <header className={styles.header}>
        <div className={styles.headerInner}>
          <button
            className={styles.menuButton}
            type="button"
            aria-label={menuOpen ? 'Close navigation' : 'Open navigation'}
            aria-expanded={menuOpen}
            aria-controls="home-navigation"
            onClick={() => setMenuOpen(!menuOpen)}
          >
            <Icon name={menuOpen ? 'close' : 'menu'} />
          </button>
          <Link href="/" className={styles.brand} aria-label="Video Studio home">
            <span className={styles.brandMark}>
              vs
              <span />
            </span>
            <span>
              Video Studio<small>Ideas, brought to life.</small>
            </span>
          </Link>
          <nav
            id="home-navigation"
            className={`${styles.navigation} ${menuOpen ? styles.navigationOpen : ''}`}
            aria-label="Main navigation"
          >
            <a href="#how-it-works" onClick={() => setMenuOpen(false)}>
              How it works
            </a>
            <a href="#examples" onClick={() => setMenuOpen(false)}>
              Examples
            </a>
            <a href="#inside" onClick={() => setMenuOpen(false)}>
              Inside the studio
            </a>
            <Link href="/login" onClick={() => setMenuOpen(false)}>
              Log in
            </Link>
          </nav>
          <Link
            href={accountUrl}
            className={`${styles.button} ${styles.headerCta}`}
            data-primary-cta
          >
            Create video <Icon name="arrow" size={16} />
          </Link>
          <Link
            href={accountUrl}
            className={styles.mobileCreate}
            aria-label="Open the video studio"
          >
            <Icon name="northeast" size={18} />
          </Link>
        </div>
      </header>

      <section className={styles.hero} id="main-content" aria-labelledby="hero-title">
        <div className={`${styles.container} ${styles.heroInner}`}>
          <div className={styles.heroCopy}>
            <span className={`${styles.eyebrow} ${styles.heroEyebrow}`}>
              <Icon name="spark" size={13} /> An early look at Video Studio
            </span>
            <h1 id="hero-title">
              From brief to
              <br className={styles.heroBreak} /> brilliant video.
            </h1>
            <p>
              Turn your ideas and notes into a clear story, a natural voice, and an animated video
              worth sharing.
            </p>
            <div className={styles.heroActions}>
              <Link
                href={accountUrl}
                className={`${styles.button} ${styles.ivoryButton}`}
                data-primary-cta
              >
                Create video <Icon name="northeast" size={18} />
              </Link>
              <button
                className={`${styles.button} ${styles.clayButton}`}
                type="button"
                data-example="narrated"
                onClick={(event) => openExample('narrated', event.currentTarget)}
              >
                <Icon name="play" size={14} /> Watch an example
              </button>
            </div>
            <div className={styles.capabilities}>
              <span>
                <Icon name="check" size={15} /> Structured storyboards
              </span>
              <span>
                <Icon name="check" size={15} /> Natural narration
              </span>
              <span>
                <Icon name="check" size={15} /> 1080p MP4
              </span>
            </div>
          </div>
          <div className={styles.heroPlayer}>
            <BinarySearchDemo />
            <span className={styles.playerFootnote}>A little motion. A clearer explanation.</span>
          </div>
        </div>
      </section>

      <section
        className={`${styles.section} ${styles.workflow}`}
        id="how-it-works"
        aria-labelledby="workflow-title"
      >
        <div className={styles.container}>
          <span className={styles.eyebrow}>
            <Icon name="bulb" size={13} /> The workflow
          </span>
          <h2 id="workflow-title">Four steps. One story worth sharing.</h2>
          <p className={styles.sectionIntro}>
            From a spark of an idea to a lesson that lands. Keep your story in focus at every step.
          </p>
          <ol className={styles.workflowGrid}>
            {steps.map((step, index) => (
              <li key={step.title}>
                <span className={styles.stepIcon}>
                  <Icon name={step.icon} size={23} />
                </span>
                <span className={styles.stepNumber}>0{index + 1}</span>
                <div className={styles.stepCopy}>
                  <span className={styles.stepLabel}>Step 0{index + 1}</span>
                  <h3>{step.title}</h3>
                  <p>{step.text}</p>
                </div>
                <div className={styles.stepProgress} aria-hidden="true">
                  <span style={{ width: `${(index + 1) * 25}%` }} />
                </div>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <section
        className={`${styles.section} ${styles.examples}`}
        id="examples"
        aria-labelledby="examples-title"
      >
        <div className={styles.container}>
          <div className={styles.sectionHeading}>
            <div>
              <span className={styles.eyebrow}>
                <Icon name="film" size={13} /> Curated demonstrations
              </span>
              <h2 id="examples-title">Make the “aha” visible.</h2>
              <p className={styles.sectionIntro}>
                From abstract concepts to everyday systems. A little motion makes a big difference.
              </p>
            </div>
            <span className={styles.liveLabel}>
              <span /> Interactive motion demos
            </span>
          </div>
          <div className={styles.exampleGrid}>
            {examples.map((item) => (
              <article className={styles.exampleCard} key={item.id}>
                <button
                  className={styles.exampleArt}
                  type="button"
                  aria-label={`Preview ${item.title}`}
                  onClick={(event) => openExample(item.id, event.currentTarget)}
                >
                  <div aria-hidden="true">
                    {item.id === 'binary' ? (
                      <BinarySearchDemo compact />
                    ) : item.id === 'ram' ? (
                      <RamDemo compact />
                    ) : (
                      <WaterCycleDemo compact />
                    )}
                  </div>
                  <span className={styles.artBadge}>
                    <Icon name="play" size={10} /> Motion demo
                  </span>
                  <span className={styles.artIcon}>
                    <Icon name={item.icon} size={17} />
                  </span>
                </button>
                <div className={styles.exampleCopy}>
                  <span className={styles.exampleCategory}>{item.category}</span>
                  <h3>{item.title}</h3>
                  <p>{item.text}</p>
                  <span className={styles.topicTag}>{item.tag}</span>
                  <button
                    className={styles.previewButton}
                    type="button"
                    data-example={item.id}
                    onClick={(event) => openExample(item.id, event.currentTarget)}
                  >
                    Preview the story <Icon name="arrow" size={15} />
                  </button>
                </div>
              </article>
            ))}
          </div>
          <p className={styles.exampleNote}>
            Want to hear the difference?{' '}
            <button
              type="button"
              data-example="narrated"
              onClick={(event) => openExample('narrated', event.currentTarget)}
            >
              Watch our narrated studio example <Icon name="arrow" size={14} />
            </button>
          </p>
        </div>
      </section>

      <section
        className={`${styles.section} ${styles.authoring}`}
        id="inside"
        aria-labelledby="authoring-title"
      >
        <div className={`${styles.container} ${styles.authoringGrid}`}>
          <div className={styles.authoringCopy}>
            <span className={styles.eyebrow}>
              <Icon name="grid" size={13} /> Full authorship
            </span>
            <h2 id="authoring-title">Words, motion, and a little timing.</h2>
            <p className={styles.sectionIntro}>
              Good stories deserve a thoughtful workspace. Explore the small decisions behind a
              clear explanation.
            </p>
            <div className={styles.featureTabs} role="tablist" aria-label="Explore studio features">
              {features.map((item, index) => (
                <button
                  key={item.id}
                  id={`feature-${item.id}`}
                  className={`${styles.featureTab} ${feature === item.id ? styles.activeFeature : ''}`}
                  type="button"
                  role="tab"
                  aria-selected={feature === item.id}
                  aria-controls="authoring-panel"
                  tabIndex={feature === item.id ? 0 : -1}
                  data-authoring-tab
                  onClick={() => setFeature(item.id)}
                  onKeyDown={(event) => {
                    let next = index;
                    if (['ArrowRight', 'ArrowDown'].includes(event.key))
                      next = (index + 1) % features.length;
                    else if (['ArrowLeft', 'ArrowUp'].includes(event.key))
                      next = (index + features.length - 1) % features.length;
                    else if (event.key === 'Home') next = 0;
                    else if (event.key === 'End') next = features.length - 1;
                    else return;
                    event.preventDefault();
                    setFeature(features[next]!.id);
                    document
                      .querySelectorAll<HTMLButtonElement>('[data-authoring-tab]')
                      [next]?.focus();
                  }}
                >
                  <span className={styles.featureIcon}>
                    <Icon name={item.icon} size={19} />
                  </span>
                  <span>
                    <strong>{item.title}</strong>
                    <small>{item.text}</small>
                  </span>
                  {item.id === 'captions' && <em>Next</em>}
                </button>
              ))}
            </div>
          </div>
          <div
            className={styles.workbench}
            role="tabpanel"
            id="authoring-panel"
            aria-labelledby={`feature-${feature}`}
            tabIndex={0}
          >
            <div className={styles.workbenchHeader}>
              <span>
                <span className={styles.blueDot} /> Workbench · Scene {scene + 1}
              </span>
              <span className={styles.draftPill}>Demo draft</span>
              <span aria-hidden="true">•••</span>
            </div>
            <div className={styles.workbenchBody}>
              <div className={styles.scriptPanel}>
                <div className={styles.panelLabel}>
                  {feature === 'voice'
                    ? 'Natural narration'
                    : feature === 'captions'
                      ? 'Caption preview'
                      : 'Voiceover script'}
                  <span>Scene 2 / 4</span>
                </div>
                {feature === 'script' ? (
                  <>
                    <label className={styles.srOnly} htmlFor="demo-script">
                      Edit the demo script
                    </label>
                    <textarea
                      id="demo-script"
                      value={script}
                      onChange={(event) => setScript(event.target.value)}
                      maxLength={180}
                    />
                    <span className={styles.localNote}>
                      Try an edit. This demo stays on this page.
                    </span>
                  </>
                ) : feature === 'storyboard' ? (
                  <div className={styles.sceneChoices}>
                    {['Introduce the list', 'Compare the middle', 'Keep the right half'].map(
                      (label, index) => (
                        <button
                          type="button"
                          key={label}
                          aria-pressed={scene === index}
                          onClick={() => setScene(index)}
                        >
                          <span>0{index + 1}</span>
                          {label}
                        </button>
                      ),
                    )}
                  </div>
                ) : feature === 'voice' ? (
                  <div className={styles.panelMessage}>
                    <Icon name="mic" size={27} />
                    <p>
                      A clear voice.
                      <br />A considered pace.
                    </p>
                    <button
                      type="button"
                      onClick={(event) => openExample('narrated', event.currentTarget)}
                    >
                      Listen to the example <Icon name="play" size={12} />
                    </button>
                  </div>
                ) : (
                  <div className={styles.panelMessage}>
                    <Icon name="captions" size={27} />
                    <p>
                      Captions are
                      <br />
                      coming next.
                    </p>
                    <span>Word-aligned captions are not yet available.</span>
                  </div>
                )}
                <div className={styles.panelBottom}>
                  <Icon name={feature === 'captions' ? 'captions' : 'mic'} size={14} />
                  <span>
                    {feature === 'captions' ? 'On-screen text, for now' : 'Your words. Your story.'}
                  </span>
                </div>
              </div>
              <div className={styles.visualPanel}>
                <div className={styles.panelLabel}>
                  Visual canvas<span>Binary search</span>
                </div>
                <div className={styles.miniCanvas}>
                  <span className={styles.miniBadge}>Target: 14</span>
                  <div className={styles.miniNumbers}>
                    {[2, 5, 8, 11, 13, 14, 21].map((value) => (
                      <span
                        className={
                          value === (scene === 2 ? 14 : 11) ? styles.selectedNumber : undefined
                        }
                        key={value}
                      >
                        {value}
                      </span>
                    ))}
                  </div>
                  <p>
                    {feature === 'script'
                      ? script
                      : scene === 0
                        ? 'Start with a sorted list.'
                        : scene === 1
                          ? 'Compare the middle value.'
                          : '14 is in the right half.'}
                  </p>
                </div>
                <span className={styles.canvasNote}>A visual beat for every idea.</span>
              </div>
            </div>
            <div className={styles.timeline}>
              <div className={styles.panelLabel}>
                A little timing<span>18 seconds · 4 scenes</span>
              </div>
              <div className={styles.timelineTrack}>
                <span>Introduce</span>
                <span>Compare</span>
                <span>Find</span>
              </div>
              <div className={styles.audioTrack}>
                <Icon name="mic" size={10} />
                <span>Your story, at its own pace</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className={styles.closing} aria-labelledby="closing-title">
        <div className={styles.closingInner}>
          <span className={`${styles.eyebrow} ${styles.heroEyebrow}`}>
            <Icon name="spark" size={13} /> Start creating
          </span>
          <h2 id="closing-title">
            Give your next idea
            <br />a little motion.
          </h2>
          <p>
            Make room for the story only you can tell.
            <br />
            Take a first look inside Video Studio.
          </p>
          <Link
            href={accountUrl}
            className={`${styles.button} ${styles.ivoryButton}`}
            data-primary-cta
          >
            Create video <Icon name="northeast" size={18} />
          </Link>
          <span className={styles.closingNote}>
            Explore an example, then make space for your own ideas.
          </span>
        </div>
      </section>

      <footer className={styles.footer}>
        <div className={`${styles.container} ${styles.footerInner}`}>
          <Link href="/" className={styles.brand}>
            <span className={styles.brandMark}>
              vs
              <span />
            </span>
            <span>Video Studio</span>
          </Link>
          <span className={styles.copyright}>Made for curious minds. © 2026 Video Studio.</span>
          <nav aria-label="Footer navigation">
            <a href="#how-it-works">How it works</a>
            <a href="#examples">Examples</a>
            <Link href={accountUrl}>
              Open studio <Icon name="northeast" size={12} />
            </Link>
          </nav>
        </div>
      </footer>
      <nav className={styles.bottomNav} aria-label="Mobile quick navigation">
        <Link href={accountUrl}>
          <Icon name="film" size={20} />
          <span>Studio</span>
        </Link>
        <a href="#examples">
          <Icon name="grid" size={20} />
          <span>Examples</span>
        </a>
        <a href="#how-it-works">
          <Icon name="script" size={20} />
          <span>Workflow</span>
        </a>
        <a href="#inside">
          <Icon name="bulb" size={20} />
          <span>Explore</span>
        </a>
      </nav>

      <dialog
        ref={dialogRef}
        className={styles.exampleDialog}
        onClose={onDialogClose}
        onCancel={(event) => {
          event.preventDefault();
          closeExample();
        }}
        onClick={(event) => {
          if (event.target === event.currentTarget) closeExample();
        }}
        aria-labelledby="example-dialog-title"
        data-example-dialog
      >
        {example && (
          <div className={styles.dialogContent}>
            <div className={styles.dialogHeader}>
              <div>
                <span className={styles.eyebrow}>
                  {example === 'narrated'
                    ? narration
                      ? 'Narrated studio example'
                      : 'Silent studio example'
                    : 'Interactive motion demo · silent'}
                </span>
                <h2 id="example-dialog-title">{exampleTitles[example]}</h2>
              </div>
              <button
                className={styles.dialogClose}
                type="button"
                aria-label="Close example"
                onClick={closeExample}
              >
                <Icon name="close" size={21} />
              </button>
            </div>
            <div className={example === 'narrated' ? styles.narratedExample : styles.dialogDemo}>
              {example === 'binary' ? (
                <BinarySearchDemo />
              ) : example === 'ram' ? (
                <RamDemo />
              ) : example === 'water' ? (
                <WaterCycleDemo />
              ) : (
                <StudioExample narration={narration} />
              )}
            </div>
            {example === 'narrated' ? (
              <p className={styles.dialogNote}>
                A five-scene, 30-second authored example.{' '}
                {narration
                  ? 'Natural narration is included. Captions are coming next.'
                  : 'Narration is unavailable here; this example is labelled silent.'}{' '}
                <Link href={studioUrl}>
                  Open in the studio <Icon name="northeast" size={12} />
                </Link>
              </p>
            ) : (
              <p className={styles.dialogNote}>
                A small, interactive explanation made for this homepage.{' '}
                <Link href={studioUrl}>
                  Explore the working studio prototype <Icon name="northeast" size={12} />
                </Link>
              </p>
            )}
          </div>
        )}
      </dialog>
    </main>
  );
}
