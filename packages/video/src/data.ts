/** Server-safe exports: no React composition or browser-only rendering imports. */
export { COMPOSITION_ID, fixtureStoryboard, fixtureSource } from './fixture';
export { uberStoryboard, uberSource } from './uber-fixture';
export { buildTimeline, calculateSceneTimings, type SceneTiming } from './timeline';
export {
  validateNarrationManifest,
  NARRATION_LEAD_SECONDS,
  NARRATION_TAIL_SECONDS,
  type NarrationManifest,
  type NarrationClip,
} from './narration';
