import type { Storyboard } from '@aivideos/contracts';

export const NARRATION_LEAD_SECONDS = 0.1;
export const NARRATION_TAIL_SECONDS = 0.2;

export interface NarrationClip {
  sceneId: string;
  textSha256: string;
  audioSrc: string;
  durationSeconds: number;
  audioSha256: string;
}

/** Sanitized local media metadata only; provider credentials never belong in video props. */
export interface NarrationManifest {
  version: 1;
  clips: NarrationClip[];
}

export function validateNarrationManifest(
  storyboard: Storyboard,
  value: unknown,
): NarrationManifest {
  const manifest = value as Partial<NarrationManifest> | null;
  if (!manifest || manifest.version !== 1 || !Array.isArray(manifest.clips)) {
    throw new Error('Invalid narration manifest. Generate narration before using narrated mode.');
  }
  if (manifest.clips.length !== storyboard.scenes.length) {
    throw new Error('Narration must contain exactly one clip for every authored scene.');
  }
  const hash = /^[a-f0-9]{64}$/;
  return {
    version: 1,
    clips: manifest.clips.map((clip, index) => {
      if (
        !clip ||
        clip.sceneId !== storyboard.scenes[index]!.id ||
        typeof clip.textSha256 !== 'string' ||
        !hash.test(clip.textSha256) ||
        typeof clip.audioSha256 !== 'string' ||
        !hash.test(clip.audioSha256) ||
        typeof clip.audioSrc !== 'string' ||
        !/^\/prototype\/narration\/[a-f0-9]{64}\.mp3$/.test(clip.audioSrc) ||
        !Number.isFinite(clip.durationSeconds) ||
        clip.durationSeconds <= 0 ||
        clip.durationSeconds > 300
      ) {
        throw new Error(`Invalid or out-of-order narration clip for scene ${index + 1}.`);
      }
      return {
        sceneId: clip.sceneId,
        textSha256: clip.textSha256,
        audioSrc: clip.audioSrc,
        durationSeconds: clip.durationSeconds,
        audioSha256: clip.audioSha256,
      };
    }),
  };
}
