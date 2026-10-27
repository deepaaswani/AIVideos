'use client';

import { Player } from '@remotion/player';
import {
  StoryboardVideo,
  buildTimeline,
  fixtureStoryboard,
  type NarrationManifest,
} from '@aivideos/video';

export default function HomeExamplePlayer({ narration }: { narration?: NarrationManifest }) {
  const timeline = buildTimeline(fixtureStoryboard, narration);
  return (
    <Player
      component={StoryboardVideo}
      inputProps={{ storyboard: fixtureStoryboard, narration }}
      durationInFrames={timeline.durationInFrames}
      compositionWidth={timeline.width}
      compositionHeight={timeline.height}
      fps={timeline.fps}
      controls
      showVolumeControls={Boolean(narration)}
      initiallyMuted={!narration}
      moveToBeginningWhenEnded={false}
      spaceKeyToPlayOrPause
      style={{ width: '100%', aspectRatio: '9 / 16' }}
      errorFallback={() => (
        <p role="alert">This example could not play. Try opening the studio preview.</p>
      )}
    />
  );
}
