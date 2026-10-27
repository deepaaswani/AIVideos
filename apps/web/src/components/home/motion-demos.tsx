'use client';

import { useEffect, useId, useRef, useState, type CSSProperties } from 'react';
import styles from './motion-demos.module.css';

type DemoProps = { compact?: boolean };

function PlayIcon({ paused }: { paused: boolean }) {
  return paused ? (
    <svg viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
      <path d="M6 3.8a.7.7 0 0 1 1.05-.6l9 6.2a.72.72 0 0 1 0 1.2l-9 6.2A.7.7 0 0 1 6 16.2Z" />
    </svg>
  ) : (
    <svg viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
      <rect x="5" y="4" width="3.5" height="12" rx="1" />
      <rect x="11.5" y="4" width="3.5" height="12" rx="1" />
    </svg>
  );
}

function RestartIcon() {
  return (
    <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden="true">
      <path
        d="M5 5a6.5 6.5 0 1 1-1.45 6.7M5 1.8V6H.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function clock(seconds: number) {
  return `0:${String(Math.floor(seconds)).padStart(2, '0')}`;
}

function useDemoClock(duration: number) {
  const [elapsed, setElapsed] = useState(0);
  const [playing, setPlaying] = useState(false);
  const elapsedRef = useRef(0);

  useEffect(() => {
    if (!playing) return;
    const startedAt = performance.now() - elapsedRef.current * 1000;
    const interval = window.setInterval(() => {
      const next = Math.min(duration, (performance.now() - startedAt) / 1000);
      elapsedRef.current = next;
      setElapsed(next);
      if (next >= duration) setPlaying(false);
    }, 80);
    return () => window.clearInterval(interval);
  }, [duration, playing]);

  function seek(seconds: number) {
    setPlaying(false);
    const next = Math.max(0, Math.min(duration, seconds));
    elapsedRef.current = next;
    setElapsed(next);
  }

  function toggle() {
    if (elapsedRef.current >= duration) seek(0);
    setPlaying((value) => !value);
  }

  function restart() {
    setPlaying(false);
    seek(0);
  }

  return { elapsed, playing, seek, toggle, restart };
}

const numbers = [2, 5, 8, 11, 13, 14, 21];
const searchScenes = [
  { label: 'Start with a sorted list.', detail: 'We are looking for the number 14.' },
  { label: 'Check the middle: 11.', detail: '14 is larger, so look to the right.' },
  { label: 'Keep only the right half.', detail: 'Three candidates. One more comparison.' },
  { label: 'There it is. We found 14.', detail: 'Seven numbers. Just two comparisons.' },
];

function NumberLine({ scene }: { scene: number }) {
  return (
    <div className={styles.numberLine} aria-label="Sorted numbers: 2, 5, 8, 11, 13, 14, 21">
      {numbers.map((number, index) => (
        <span
          className={styles.number}
          key={number}
          data-muted={scene >= 2 && index < 4 ? 'true' : undefined}
          data-middle={scene === 1 && index === 3 ? 'true' : undefined}
          data-found={scene >= 3 && number === 14 ? 'true' : undefined}
        >
          {number}
        </span>
      ))}
    </div>
  );
}

export function BinarySearchDemo({ compact = false }: DemoProps) {
  const { elapsed, playing, seek, toggle, restart } = useDemoClock(18);
  const scene = Math.min(3, Math.floor(elapsed / 4.5));
  const current = searchScenes[scene]!;

  if (compact) {
    return (
      <div
        className={`${styles.thumbnail} ${styles.binaryThumbnail}`}
        aria-label="Binary search motion illustration"
      >
        <div className={styles.thumbnailTop}>
          <span>18s motion demo</span>
          <span aria-hidden="true">[ ]</span>
        </div>
        <NumberLine scene={3} />
        <span className={styles.thumbnailCaption}>
          A little less searching. A little more finding.
        </span>
      </div>
    );
  }

  return (
    <section
      className={styles.demoShell}
      aria-label="Binary search motion demo"
      data-demo="binary-search"
      data-playing={String(playing)}
      data-elapsed={elapsed.toFixed(2)}
    >
      <div className={styles.screen}>
        <div className={styles.screenTop}>
          <span>Algorithms</span>
          <span className={styles.sceneChip}>
            <i />
            Scene {scene + 1}/4
          </span>
        </div>
        <div className={styles.demoTitle}>
          <h3>How binary search works</h3>
          <span className={styles.target}>Target: find 14</span>
        </div>
        <div className={styles.searchLesson}>
          <div className={styles.searchBracket} data-scene={scene} aria-hidden="true">
            <span />
            <span />
          </div>
          <NumberLine scene={scene} />
          <div className={styles.searchCaption} aria-live="polite" aria-atomic="true">
            <strong>{current.label}</strong>
            <span>{current.detail}</span>
          </div>
        </div>
        <div className={styles.signal} data-active={String(playing)} aria-hidden="true">
          {[8, 14, 23, 13, 29, 18, 10].map((height, index) => (
            <i key={index} style={{ height, animationDelay: `${index * -0.13}s` }} />
          ))}
        </div>
      </div>
      <div className={styles.playerControls}>
        <input
          type="range"
          min="0"
          max="18"
          step="0.1"
          value={elapsed}
          onChange={(event) => seek(Number(event.target.value))}
          aria-label="Binary search timeline"
          aria-valuetext={`${clock(elapsed)} of 0:18`}
          style={{ '--progress': `${(elapsed / 18) * 100}%` } as CSSProperties}
        />
        <div className={styles.controlRow}>
          <div className={styles.transport}>
            <button
              className={styles.playButton}
              onClick={toggle}
              type="button"
              aria-label={playing ? 'Pause binary search demo' : 'Play binary search demo'}
            >
              <PlayIcon paused={!playing} />
            </button>
            <button
              className={styles.resetButton}
              onClick={restart}
              type="button"
              aria-label="Restart binary search demo"
            >
              <RestartIcon />
            </button>
          </div>
          <output className={styles.time} aria-label="Binary search playback time">
            {clock(elapsed)} / 0:18
          </output>
          <span className={styles.silentLabel}>Silent motion demo</span>
        </div>
      </div>
    </section>
  );
}

function WorkspaceIllustration() {
  const id = useId().replaceAll(':', '');
  return (
    <svg className={styles.workspaceArt} viewBox="0 0 360 200" fill="none" aria-hidden="true">
      <defs>
        <linearGradient
          id={`${id}desk`}
          x1="50"
          y1="95"
          x2="275"
          y2="180"
          gradientUnits="userSpaceOnUse"
        >
          <stop stopColor="#F4DFCB" />
          <stop offset="1" stopColor="#D5BCA7" />
        </linearGradient>
        <linearGradient
          id={`${id}screen`}
          x1="104"
          y1="45"
          x2="176"
          y2="119"
          gradientUnits="userSpaceOnUse"
        >
          <stop stopColor="#7CA7BC" />
          <stop offset="1" stopColor="#245573" />
        </linearGradient>
        <filter id={`${id}shadow`} x="-40%" y="-40%" width="180%" height="200%">
          <feDropShadow dx="0" dy="8" stdDeviation="7" floodColor="#274D63" floodOpacity=".13" />
        </filter>
      </defs>
      <ellipse cx="180" cy="169" rx="138" ry="18" fill="#D9D2CA" opacity=".5" />
      <g filter={`url(#${id}shadow)`}>
        <path d="M41 132 177 98 266 133 130 172Z" fill={`url(#${id}desk)`} />
        <path d="m41 132 89 36v8l-89-36Z" fill="#CBB5A0" />
        <path d="m130 168 136-35v8l-136 36Z" fill="#B8A28D" />
        <path d="m58 145 10 4v27l-10-4Zm164 5 10-3v29l-10 3Z" fill="#B8A28D" />
        <path
          d="M95 60a7 7 0 0 1 5-7l77-20a5 5 0 0 1 7 5v64a8 8 0 0 1-6 8l-76 20a5 5 0 0 1-7-5Z"
          fill="#E9EDF0"
        />
        <path d="m102 60 75-20v61l-75 20Z" fill={`url(#${id}screen)`} />
        <path d="m131 118 17-5v17l-17 5Z" fill="#E3E6E8" />
        <path d="m119 138 31-8 15 5-31 8Z" fill="#F8F6EF" />
        <path d="m113 70 20-5v17l-20 5Z" fill="#F6E7D2" />
        <path d="m139 63 26-7v4l-26 7Zm0 8 22-6v4l-22 6Z" fill="#B7D9E4" />
        <path d="m113 94 48-13v4l-48 13Zm0 8 35-9v4l-35 9Z" fill="#83B9CC" />
        <path d="m111 145 47-12 26 10-48 13Z" fill="#F8F6EF" />
        <path d="m118 144 33-8m-25 12 33-8m-24 11 33-8" stroke="#B7CBD3" strokeWidth="2" />
        <path d="M264 65 303 52l18 7v104l-39 14-18-7Z" fill="#CFDCE3" />
        <path d="m282 72 39-13v104l-39 14Z" fill="#E6EAEB" />
        {[0, 1, 2].map((row) => (
          <g key={row}>
            <path
              d={`m288 ${82 + row * 27} 26-9v19l-26 9Z`}
              fill={row === 0 ? '#547C98' : '#B7CAD6'}
            />
            <path
              d={`m299 ${86 + row * 27} 7-2`}
              stroke="#F9F5ED"
              strokeWidth="2.8"
              strokeLinecap="round"
            />
          </g>
        ))}
        <path d="m54 95 23-6 7 4-23 6Z" fill="#91AD98" />
        <path d="m54 95 7 4v28l-7-4Z" fill="#78957D" />
        <path d="m61 99 23-6v28l-23 6Z" fill="#A5BCA7" />
        <path
          d="m65 85 2-15m0 9-8-9m8 4 8-10"
          stroke="#8EAA91"
          strokeWidth="5"
          strokeLinecap="round"
        />
      </g>
    </svg>
  );
}

export function RamDemo({ compact = false }: DemoProps) {
  const [running, setRunning] = useState(false);
  if (compact)
    return (
      <div
        className={`${styles.thumbnail} ${styles.ramThumbnail}`}
        aria-label="A desk and filing cabinet illustrate memory and storage"
      >
        <WorkspaceIllustration />
        <span className={styles.artBadge}>RAM is your desk. Storage is your shelf.</span>
      </div>
    );
  return (
    <section
      className={styles.scienceDemo}
      data-demo="ram"
      data-ram-running={String(running)}
      aria-label="RAM and storage interactive demo"
    >
      <span className={styles.demoEyebrow}>Computer architecture · interactive demo</span>
      <h3>A workspace, and a place to keep things.</h3>
      <div className={styles.memoryComparison}>
        <div className={styles.memoryPanel}>
          <div className={styles.memoryHeading}>
            <span>01</span>
            <strong>RAM</strong>
            <small>The working desk</small>
          </div>
          <div className={styles.workingDesk} data-filled={String(running)}>
            {running ? (
              <>
                <span>Editor tabs</span>
                <span>Video preview</span>
                <span>Undo history</span>
              </>
            ) : (
              <span className={styles.emptyDesk}>Ready for an app</span>
            )}
          </div>
          <small>Temporary working memory</small>
        </div>
        <div className={styles.memoryPanel}>
          <div className={styles.memoryHeading}>
            <span>02</span>
            <strong>SSD</strong>
            <small>The storage shelf</small>
          </div>
          <div className={styles.storageShelf}>
            <span>Saved notes</span>
            <span>Project files</span>
            <span>Exported video</span>
          </div>
          <small>Files stay after a restart</small>
        </div>
      </div>
      <p className={styles.explanation} aria-live="polite">
        {running
          ? 'The app uses RAM to work on your files. Restarting clears this workspace; the saved files on the SSD remain.'
          : 'Your saved files are still on the SSD. Run an app to bring its working data into RAM.'}
      </p>
      <div className={styles.actionRow}>
        <button type="button" onClick={() => setRunning(true)}>
          Run an app <span aria-hidden="true">↗</span>
        </button>
        <button type="button" onClick={() => setRunning(false)} className={styles.secondaryAction}>
          Restart computer <RestartIcon />
        </button>
      </div>
    </section>
  );
}

const waterStages = [
  {
    name: 'Evaporation',
    description:
      'The sun warms surface water. Some liquid water becomes water vapor and rises into the air.',
  },
  {
    name: 'Condensation',
    description: 'Water vapor cools and condenses into tiny droplets, forming clouds.',
  },
  {
    name: 'Rain',
    description:
      'Droplets grow and fall as precipitation. Water collects and flows back, continuing the cycle.',
  },
];

function WaterIllustration({ stage = 0 }: { stage?: number }) {
  const id = useId().replaceAll(':', '');
  return (
    <svg
      className={styles.waterArt}
      viewBox="0 0 400 230"
      fill="none"
      role="img"
      aria-label="Sun, clouds, rain and a lake show the water cycle"
    >
      <defs>
        <linearGradient
          id={`${id}water`}
          x1="86"
          y1="135"
          x2="262"
          y2="220"
          gradientUnits="userSpaceOnUse"
        >
          <stop stopColor="#83BAC6" />
          <stop offset="1" stopColor="#3B7D99" />
        </linearGradient>
        <linearGradient
          id={`${id}land`}
          x1="140"
          y1="124"
          x2="341"
          y2="206"
          gradientUnits="userSpaceOnUse"
        >
          <stop stopColor="#BCD1B9" />
          <stop offset="1" stopColor="#8CA68A" />
        </linearGradient>
        <filter id={`${id}soft`} x="-40%" y="-40%" width="180%" height="200%">
          <feDropShadow dx="0" dy="8" stdDeviation="6" floodColor="#285572" floodOpacity=".12" />
        </filter>
      </defs>
      <ellipse cx="204" cy="204" rx="147" ry="16" fill="#D6CFC5" opacity=".45" />
      <g filter={`url(#${id}soft)`}>
        <path d="m43 160 165-55 150 53-166 61Z" fill="#D0B399" />
        <path d="m43 160 149 50v12L43 172Z" fill="#BA9E83" />
        <path d="m192 210 166-52v13l-166 56Z" fill="#A68C73" />
        <path d="m49 158 151-49 151 49-158 52Z" fill={`url(#${id}water)`} />
        <path d="m195 111 24 9 27 26-13 17 30 13 86-18-84-30Z" fill={`url(#${id}land)`} />
        <path d="m246 141 17-27 20 24 20 7-14 13Z" fill="#B6B5AB" />
        <path d="m254 128 9-14 9 12-9-2Z" fill="#F8F6F0" />
        <path
          d="m100 164 39-13m-15 26 40-13m-10 27 45-15"
          stroke="#B9D8DC"
          strokeWidth="2.8"
          strokeLinecap="round"
        />
        <circle cx="89" cy="59" r="21" fill="#E3BB70" />
        <circle cx="83" cy="53" r="13" fill="#F0D49C" opacity=".7" />
        <g className={styles.cloud} data-selected={stage === 1 ? 'true' : undefined}>
          <path
            d="M206 64c-4-16 18-25 29-13 2-24 34-28 44-7 16-11 38 3 34 21 24 2 24 29 3 31h-96c-27 0-35-29-14-32Z"
            fill="#F5F3ED"
          />
          <path d="M207 82h108" stroke="#DDDCD5" strokeWidth="10" strokeLinecap="round" />
        </g>
        <g
          className={styles.evaporation}
          data-selected={stage === 0 ? 'true' : undefined}
          stroke="#E1F2ED"
          strokeWidth="4"
          strokeLinecap="round"
        >
          <path d="M123 130c-13-15 9-22-1-37m20 29c-13-15 9-22-1-37m20 29c-13-15 9-22-1-37" />
          <path d="m116 99 6-6 6 6m7-8 6-6 6 6m7-8 6-6 6 6" strokeWidth="2.5" />
        </g>
        <g
          className={styles.rain}
          data-selected={stage === 2 ? 'true' : undefined}
          stroke="#5B8AA7"
          strokeWidth="3"
          strokeLinecap="round"
        >
          <path d="m240 108-5 11m25-11-5 11m25-11-5 11m25-11-5 11m-49 7-5 11m25-11-5 11m25-11-5 11" />
        </g>
        <path
          d="m292 154-16 10-25 5-16 18-29 7"
          stroke="#A5CCD2"
          strokeWidth="5"
          strokeLinecap="round"
        />
      </g>
    </svg>
  );
}

export function WaterCycleDemo({ compact = false }: DemoProps) {
  const [stage, setStage] = useState(0);
  const [playing, setPlaying] = useState(false);
  useEffect(() => {
    if (!playing) return;
    const interval = window.setInterval(() => setStage((value) => (value + 1) % 3), 3200);
    return () => window.clearInterval(interval);
  }, [playing]);
  if (compact)
    return (
      <div className={`${styles.thumbnail} ${styles.waterThumbnail}`}>
        <WaterIllustration stage={2} />
        <span className={styles.artBadge}>Evaporation → Condensation → Rain</span>
      </div>
    );
  return (
    <section
      className={styles.scienceDemo}
      data-demo="water-cycle"
      data-stage={stage}
      aria-label="Water cycle interactive demo"
    >
      <span className={styles.demoEyebrow}>Earth science · interactive demo</span>
      <h3>Water takes the scenic route.</h3>
      <div className={styles.fullWaterArt}>
        <WaterIllustration stage={stage} />
      </div>
      <div className={styles.waterStages}>
        {waterStages.map((item, index) => (
          <button
            key={item.name}
            type="button"
            aria-label={item.name}
            aria-pressed={stage === index}
            onClick={() => {
              setStage(index);
              setPlaying(false);
            }}
          >
            <span>{String(index + 1).padStart(2, '0')}</span>
            {item.name}
          </button>
        ))}
      </div>
      <p className={styles.explanation} aria-live="polite">
        {waterStages[stage]!.description}
      </p>
      <div className={styles.actionRow}>
        <button
          type="button"
          onClick={() => setPlaying((value) => !value)}
          aria-label={playing ? 'Pause water cycle demo' : 'Play water cycle demo'}
        >
          <PlayIcon paused={!playing} />
          {playing ? 'Pause the cycle' : 'Watch the cycle'}
        </button>
        <span className={styles.motionNote}>A silent motion demo</span>
      </div>
    </section>
  );
}
