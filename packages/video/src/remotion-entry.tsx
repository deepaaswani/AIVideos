import { Composition, registerRoot } from 'remotion';
import { validateStoryboard } from '@aivideos/contracts';
import { COMPOSITION_ID, fixtureStoryboard } from './fixture';
import { StoryboardVideo, type VideoProps } from './StoryboardVideo';
import { buildTimeline } from './timeline';

const fixtureTimeline = buildTimeline(fixtureStoryboard);

function RemotionRoot() {
  return (
    <Composition
      id={COMPOSITION_ID}
      component={StoryboardVideo}
      width={fixtureTimeline.width}
      height={fixtureTimeline.height}
      fps={fixtureTimeline.fps}
      durationInFrames={fixtureTimeline.durationInFrames}
      defaultProps={{ storyboard: fixtureStoryboard }}
      calculateMetadata={({ props }: { props: VideoProps }) => {
        const validation = validateStoryboard(props.storyboard);
        if (!validation.success) {
          throw new Error(`Invalid storyboard: ${validation.errors.join('; ')}`);
        }
        const timeline = buildTimeline(validation.data, props.narration);
        return {
          width: timeline.width,
          height: timeline.height,
          fps: timeline.fps,
          durationInFrames: timeline.durationInFrames,
        };
      }}
    />
  );
}

registerRoot(RemotionRoot);
