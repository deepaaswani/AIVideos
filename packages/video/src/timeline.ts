import type { Storyboard } from '@aivideos/contracts';
import {
  NARRATION_LEAD_SECONDS,
  NARRATION_TAIL_SECONDS,
  validateNarrationManifest,
  type NarrationManifest,
} from './narration';

export interface SceneTiming {
  from: number;
  durationInFrames: number;
  endFrameExclusive: number;
}

/** Round cumulative boundaries, so rounding cannot introduce gaps or drift. */
export function calculateSceneTimings(durationsMs: readonly number[], fps: number): SceneTiming[] {
  if (!Number.isSafeInteger(fps) || fps <= 0) {
    throw new Error('FPS must be a positive safe integer.');
  }
  if (durationsMs.length === 0) {
    throw new Error('A timeline needs at least one scene.');
  }

  let elapsedMs = 0;
  let from = 0;
  return durationsMs.map((durationMs) => {
    if (!Number.isFinite(durationMs) || durationMs <= 0) {
      throw new Error('Scene durations must be finite positive milliseconds.');
    }
    elapsedMs += durationMs;
    const endFrameExclusive = Math.round((elapsedMs * fps) / 1000);
    if (!Number.isSafeInteger(endFrameExclusive) || endFrameExclusive <= from) {
      throw new Error('Each scene must occupy at least one safe integer frame.');
    }
    const timing = {
      from,
      durationInFrames: endFrameExclusive - from,
      endFrameExclusive,
    };
    from = endFrameExclusive;
    return timing;
  });
}

export function buildTimeline(storyboard: Storyboard, narration?: NarrationManifest) {
  const { width, height, fps } = storyboard.output;
  let timings = calculateSceneTimings(
    storyboard.scenes.map((scene) => scene.estimatedDurationMs),
    fps,
  );
  const narrationLeadInFrames = Math.ceil(NARRATION_LEAD_SECONDS * fps);
  if (narration) {
    const validated = validateNarrationManifest(storyboard, narration);
    const minimums = validated.clips.map(
      (clip) =>
        narrationLeadInFrames +
        Math.ceil(clip.durationSeconds * fps) +
        Math.ceil(NARRATION_TAIL_SECONDS * fps),
    );
    const frames = timings.map((timing, index) =>
      Math.max(timing.durationInFrames, minimums[index]!),
    );
    const targetFrames = Math.max(
      30 * fps,
      minimums.reduce((sum, frames) => sum + frames, 0),
    );
    let excess = frames.reduce((sum, frames) => sum + frames, 0) - targetFrames;
    // Borrow hold frames from scenes with spare time, never from the measured speech window.
    while (excess > 0) {
      let largestSpare = 0;
      let donor = -1;
      for (let index = 0; index < frames.length; index++) {
        const spare = frames[index]! - minimums[index]!;
        if (spare > largestSpare) {
          largestSpare = spare;
          donor = index;
        }
      }
      if (donor < 0) throw new Error('Cannot allocate narration without truncating speech.');
      frames[donor]!--;
      excess--;
    }
    // A non-30-second authored fixture can still use the same safe narration calculation.
    if (excess < 0) frames[frames.length - 1]! += -excess;
    let from = 0;
    timings = frames.map((durationInFrames) => {
      const timing = { from, durationInFrames, endFrameExclusive: from + durationInFrames };
      from = timing.endFrameExclusive;
      return timing;
    });
  }
  const scenes = storyboard.scenes.map((scene, index) => ({
    scene,
    ...timings[index]!,
  }));

  const durationInFrames = timings[timings.length - 1]!.endFrameExclusive;
  const seconds = durationInFrames / fps;
  return {
    width,
    height,
    fps,
    durationInFrames,
    narrationLeadInFrames,
    timingIssue:
      narration && (seconds < 27 || seconds > 33)
        ? `Measured narration requires ${seconds.toFixed(3)} seconds; target is 27–33 seconds. Speech has not been truncated or accelerated.`
        : null,
    scenes,
  };
}
