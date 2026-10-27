import { useMemo, useState } from 'react';
import { validateStoryboard, type Storyboard } from '@aivideos/contracts';
import { AbsoluteFill, Audio, interpolate, Sequence, staticFile, useCurrentFrame } from 'remotion';
import type { NarrationManifest } from './narration';
import { useLocalFont } from './font';
import { Process, Recap, Title } from './templates';
import { buildTimeline } from './timeline';

export type VideoProps = { storyboard: Storyboard; narration?: NarrationManifest };

const templates = { title: Title, process: Process, recap: Recap };

function NarrationAudio({ src }: { src: string }) {
  const [failed, setFailed] = useState(false);
  if (failed)
    throw new Error('Narration audio could not be played. No silent audio was substituted.');
  return <Audio src={src} pauseWhenBuffering onError={() => setFailed(true)} />;
}

function SceneContent({
  scene,
  storyboard,
  index,
  durationInFrames,
}: {
  scene: Storyboard['scenes'][number];
  storyboard: Storyboard;
  index: number;
  durationInFrames: number;
}) {
  const frame = useCurrentFrame();
  const Template = templates[scene.template];
  const fade = interpolate(
    frame,
    [0, 9, durationInFrames - 10, durationInFrames - 1],
    [0, 1, 1, 0.25],
    {
      extrapolateLeft: 'clamp',
      extrapolateRight: 'clamp',
    },
  );

  return (
    <AbsoluteFill>
      <div
        style={{
          position: 'absolute',
          left: 88,
          right: 88,
          top: 248,
          bottom: 276,
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          opacity: fade,
        }}
        data-template={scene.template}
        data-layout-box
      >
        <div
          style={{
            margin: '0 0 42px',
            fontSize: 24,
            color: storyboard.brand.primaryColor,
            letterSpacing: '0.15em',
            textTransform: 'uppercase',
          }}
        >
          {scene.template === 'title'
            ? 'The idea'
            : scene.template === 'recap'
              ? 'The takeaway'
              : `Step ${(scene.highlightIndex ?? 0) + 1}`}
        </div>
        <Template scene={scene} brand={storyboard.brand} />
      </div>
      <div
        style={{
          position: 'absolute',
          left: 88,
          right: 88,
          bottom: 206,
          display: 'flex',
          gap: 14,
        }}
      >
        {storyboard.scenes.map((item, position) => (
          <div
            key={item.id}
            style={{
              height: 6,
              flex: 1,
              borderRadius: 8,
              backgroundColor:
                position <= index
                  ? storyboard.brand.primaryColor
                  : `${storyboard.brand.textColor}1a`,
            }}
          />
        ))}
      </div>
    </AbsoluteFill>
  );
}

/** Shared controlled composition; omission of narration preserves the silent P0 fixture. */
export function StoryboardVideo({ storyboard, narration }: VideoProps) {
  useLocalFont();
  const timeline = useMemo(() => {
    const validation = validateStoryboard(storyboard);
    if (!validation.success) {
      throw new Error(`Invalid storyboard: ${validation.errors.join('; ')}`);
    }
    return buildTimeline(validation.data, narration);
  }, [storyboard, narration]);

  return (
    <AbsoluteFill
      style={{
        backgroundColor: storyboard.brand.backgroundColor,
        color: storyboard.brand.textColor,
        fontFamily: 'P0Sans, Arial, sans-serif',
        fontWeight: 600,
      }}
    >
      <div
        style={{
          position: 'absolute',
          top: 92,
          left: 88,
          right: 88,
          display: 'flex',
          alignItems: 'center',
          gap: 20,
          fontSize: 26,
          lineHeight: 1.3,
        }}
      >
        <div
          style={{
            height: 22,
            width: 22,
            flexShrink: 0,
            borderRadius: 7,
            backgroundColor: storyboard.brand.primaryColor,
          }}
        />
        <span data-layout-text data-text style={{ overflowWrap: 'anywhere' }}>
          {storyboard.brand.displayName}
        </span>
      </div>
      {timeline.scenes.map(({ scene, from, durationInFrames }, index) => (
        <Sequence key={scene.id} from={from} durationInFrames={durationInFrames} name={scene.id}>
          <SceneContent
            scene={scene}
            storyboard={storyboard}
            index={index}
            durationInFrames={durationInFrames}
          />
          {narration ? (
            <Sequence from={timeline.narrationLeadInFrames} layout="none">
              <NarrationAudio src={staticFile(narration.clips[index]!.audioSrc.slice(1))} />
            </Sequence>
          ) : null}
        </Sequence>
      ))}
      <div
        style={{
          position: 'absolute',
          left: 88,
          right: 88,
          bottom: 112,
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          gap: 20,
          color: `${storyboard.brand.textColor}aa`,
          fontSize: narration ? 18 : 21,
          letterSpacing: '0.07em',
        }}
      >
        <span>{narration ? 'NARRATED FIXTURE · CAPTIONS PENDING' : 'P0 · SILENT VISUAL TEST'}</span>
        <span>AUTHORED FIXTURE</span>
      </div>
    </AbsoluteFill>
  );
}
