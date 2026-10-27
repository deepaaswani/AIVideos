'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { Player, type PlayerRef } from '@remotion/player';
import type { Storyboard } from '@aivideos/contracts';
import {
  StoryboardVideo,
  buildTimeline,
  fixtureStoryboard,
  type NarrationManifest,
} from '@aivideos/video';
import styles from './prototype.module.css';

function timestamp(frame: number, fps: number) {
  const seconds = Math.floor(frame / fps);
  return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`;
}

export default function PrototypePlayer({
  narration,
  storyboard = fixtureStoryboard,
}: {
  narration?: NarrationManifest;
  storyboard?: Storyboard;
}) {
  const timeline = useMemo(() => buildTimeline(storyboard, narration), [storyboard, narration]);
  const playerRef = useRef<PlayerRef>(null);
  const [activeScene, setActiveScene] = useState(0);
  const [currentFrame, setCurrentFrame] = useState(narration ? 0 : 45);
  const [playing, setPlaying] = useState(false);
  const [playbackFailed, setPlaybackFailed] = useState(false);

  useEffect(() => {
    const player = playerRef.current;
    if (!player) return;

    const updateScene = () => {
      const frame = player.getCurrentFrame();
      setCurrentFrame(frame);
      const index = timeline.scenes.findIndex(
        (entry) => frame >= entry.from && frame < entry.endFrameExclusive,
      );
      if (index >= 0) setActiveScene(index);
    };

    const onPlay = () => setPlaying(true);
    const onPause = () => setPlaying(false);
    const onError = () => {
      setPlaying(false);
      setPlaybackFailed(true);
    };
    player.addEventListener('frameupdate', updateScene);
    player.addEventListener('play', onPlay);
    player.addEventListener('pause', onPause);
    player.addEventListener('ended', onPause);
    player.addEventListener('error', onError);
    return () => {
      player.removeEventListener('frameupdate', updateScene);
      player.removeEventListener('play', onPlay);
      player.removeEventListener('pause', onPause);
      player.removeEventListener('ended', onPause);
      player.removeEventListener('error', onError);
    };
  }, [timeline]);

  function seekToScene(index: number) {
    const entry = timeline.scenes[index];
    if (!entry) return;
    playerRef.current?.seekTo(
      entry.from + (narration ? 0 : Math.min(30, entry.durationInFrames - 1)),
    );
    setActiveScene(index);
  }

  return (
    <section
      className={styles.workspace}
      aria-label="Storyboard preview and scene navigation"
      data-narration-mode={narration ? 'narrated' : 'silent'}
      data-current-frame={currentFrame}
    >
      <div className={styles.previewPanel}>
        <div className={styles.previewLabel}>
          <span className={styles.silentDot} aria-hidden="true" />
          {narration ? 'Male voice narration · measured audio' : 'Silent fixture preview'}
        </div>
        <div className={styles.playerFrame}>
          <Player
            ref={playerRef}
            component={StoryboardVideo}
            inputProps={{ storyboard, narration }}
            durationInFrames={timeline.durationInFrames}
            compositionWidth={timeline.width}
            compositionHeight={timeline.height}
            fps={timeline.fps}
            initialFrame={narration ? 0 : 45}
            controls
            showVolumeControls={Boolean(narration)}
            initiallyMuted={!narration}
            moveToBeginningWhenEnded={!narration}
            spaceKeyToPlayOrPause
            style={{ width: '100%', aspectRatio: `${timeline.width} / ${timeline.height}` }}
            errorFallback={() => (
              <div className={styles.playerError} role="alert">
                {narration
                  ? 'Narration playback failed. Check the generated audio files and reload the page.'
                  : 'The preview could not load. Reload the page to try again.'}
              </div>
            )}
          />
        </div>
        <p className={styles.playerHint} role="status" data-narration-status>
          {narration
            ? playbackFailed
              ? 'Narration playback failed. Check the audio files and reload. Captions are pending.'
              : `Narration ${playing ? 'playing' : 'ready / paused'}. Use the volume control to adjust or mute speech. Captions are pending.`
            : 'Intentionally silent. Use the player controls or choose a scene to seek.'}
        </p>
        {timeline.timingIssue ? <p role="alert">{timeline.timingIssue}</p> : null}
      </div>

      <div className={styles.details}>
        <p className={styles.eyebrow}>Authored storyboard</p>
        <h2>{storyboard.title}</h2>
        <dl className={styles.metadata}>
          <div>
            <dt>Duration</dt>
            <dd>{Number((timeline.durationInFrames / timeline.fps).toFixed(3))} seconds</dd>
          </div>
          <div>
            <dt>Canvas</dt>
            <dd>
              {timeline.width} × {timeline.height}
            </dd>
          </div>
          <div>
            <dt>Frame rate</dt>
            <dd>{timeline.fps} fps</dd>
          </div>
        </dl>
        <div className={styles.sceneHeading}>
          <h3>Scene sequence</h3>
          <span>{timeline.scenes.length} scenes</span>
        </div>
        <ol className={styles.scenes}>
          {timeline.scenes.map((entry, index) => (
            <li key={entry.scene.id}>
              <button
                type="button"
                onClick={() => seekToScene(index)}
                aria-label={`Jump to scene ${index + 1}: ${entry.scene.onScreenTitle}`}
                aria-current={activeScene === index ? 'step' : undefined}
                data-scene-from={entry.from}
                data-scene-end={entry.endFrameExclusive}
                className={activeScene === index ? styles.activeScene : undefined}
              >
                <span className={styles.sceneNumber}>{String(index + 1).padStart(2, '0')}</span>
                <span className={styles.sceneText}>
                  <strong>{entry.scene.onScreenTitle}</strong>
                  <span>
                    {entry.scene.template} · {timestamp(entry.from, timeline.fps)}–
                    {timestamp(entry.endFrameExclusive, timeline.fps)}
                  </span>
                </span>
                <span className={styles.seekIcon} aria-hidden="true">
                  ↗
                </span>
              </button>
            </li>
          ))}
        </ol>
        <p className={styles.sourceNote}>
          Storyboard structure and source-block references are validated against the checked-in
          source fixture before previewing.
        </p>
      </div>
    </section>
  );
}
