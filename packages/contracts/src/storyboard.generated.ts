/* Generated from docs/step-1/contracts/storyboard.schema.json.
 * Run npm run contracts:generate to update. Do not edit by hand.
 */

export type Id = string;
export type Color = string;

/**
 * Planned content for a 30-second prototype. Server-owned metadata is injected by the application. This does not validate final audio timing, source truth, permissions or approval.
 */
export interface Storyboard {
  contractVersion: '0.1.0';
  projectId: Id;
  title: string;
  language: 'en';
  targetDurationSeconds: 30;
  output: {
    format: 'vertical_1080p';
    width: 1080;
    height: 1920;
    fps: 30;
  };
  brand: {
    displayName: string;
    primaryColor: Color;
    backgroundColor: Color;
    textColor: Color;
    fontKey: 'sans-default';
  };
  /**
   * @minItems 1
   * @maxItems 5
   */
  sourceVersionIds: [Id] | [Id, Id] | [Id, Id, Id] | [Id, Id, Id, Id] | [Id, Id, Id, Id, Id];
  /**
   * @minItems 4
   * @maxItems 6
   */
  scenes:
    | [Scene, Scene, Scene, Scene]
    | [Scene, Scene, Scene, Scene, Scene]
    | [Scene, Scene, Scene, Scene, Scene, Scene];
}
export interface Scene {
  id: Id;
  template: 'title' | 'process' | 'recap';
  narration: string;
  onScreenTitle: string;
  /**
   * @maxItems 3
   */
  visualItems: [] | [string] | [string, string] | [string, string, string];
  highlightIndex: number | null;
  estimatedDurationMs: number;
  /**
   * @minItems 1
   * @maxItems 5
   */
  sourceRefs:
    | [SourceRef]
    | [SourceRef, SourceRef]
    | [SourceRef, SourceRef, SourceRef]
    | [SourceRef, SourceRef, SourceRef, SourceRef]
    | [SourceRef, SourceRef, SourceRef, SourceRef, SourceRef];
  needsReview: boolean;
  /**
   * @maxItems 5
   */
  reviewNotes:
    | []
    | [string]
    | [string, string]
    | [string, string, string]
    | [string, string, string, string]
    | [string, string, string, string, string];
}
export interface SourceRef {
  sourceVersionId: Id;
  blockId: Id;
}
