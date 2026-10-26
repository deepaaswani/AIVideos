import Ajv2020 from 'ajv/dist/2020.js';
import storyboardSchema from '../../../docs/step-1/contracts/storyboard.schema.json';
import type { Storyboard } from './storyboard.generated';

export { storyboardSchema };
export type { Storyboard } from './storyboard.generated';

/** Source identifiers supplied by trusted application data, not storyboard text. */
export interface SourceReferenceIndex {
  readonly sourceVersionId: string;
  readonly blocks: readonly { readonly id: string }[];
}

export type StoryboardValidationResult =
  { success: true; data: Storyboard } | { success: false; errors: string[] };

const ajv = new Ajv2020({ allErrors: true, strict: true });
const validateShape = ajv.compile<Storyboard>(storyboardSchema);

/**
 * Validate planned content without modifying it or executing any rendering code.
 * Pass source indexes to also check that referenced source blocks exist.
 * This does not verify factual accuracy, permissions, approval, or audio timing.
 */
export function validateStoryboard(
  input: unknown,
  sources?: readonly SourceReferenceIndex[],
): StoryboardValidationResult {
  if (!validateShape(input)) {
    return {
      success: false,
      errors: (validateShape.errors ?? []).map(
        (error) => `${error.instancePath || '/'} ${error.message ?? 'is invalid'}`,
      ),
    };
  }

  const errors: string[] = [];
  const sceneIds = new Set<string>();
  const declaredSources = new Set(input.sourceVersionIds);
  const sourceBlocks = new Map<string, Set<string>>();

  if (sources) {
    for (const source of sources) {
      if (sourceBlocks.has(source.sourceVersionId)) {
        errors.push(`Duplicate source version: ${source.sourceVersionId}`);
      }
      const blocks = new Set(source.blocks.map((block) => block.id));
      if (blocks.size !== source.blocks.length) {
        errors.push(`Source ${source.sourceVersionId} has duplicate block IDs`);
      }
      sourceBlocks.set(source.sourceVersionId, blocks);
    }
    for (const sourceId of declaredSources) {
      if (!sourceBlocks.has(sourceId)) {
        errors.push(`Unknown declared source version: ${sourceId}`);
      }
    }
  }

  const targetMs = input.targetDurationSeconds * 1000;
  const estimatedMs = input.scenes.reduce((total, scene) => total + scene.estimatedDurationMs, 0);
  if (estimatedMs < targetMs * 0.9 || estimatedMs > targetMs * 1.1) {
    errors.push('Estimated scene duration must be within 10% of the target');
  }

  for (const [index, scene] of input.scenes.entries()) {
    const path = `/scenes/${index}`;
    if (sceneIds.has(scene.id)) {
      errors.push(`${path}/id must be unique`);
    }
    sceneIds.add(scene.id);

    if (!scene.narration.trim() || !scene.onScreenTitle.trim()) {
      errors.push(`${path} narration and title must contain non-whitespace text`);
    }
    if (scene.visualItems.some((item) => !item.trim())) {
      errors.push(`${path}/visualItems must contain non-whitespace text`);
    }
    if (scene.reviewNotes.some((note) => !note.trim())) {
      errors.push(`${path}/reviewNotes must contain non-whitespace text`);
    }

    if (scene.template === 'title') {
      if (scene.visualItems.length > 0 || scene.highlightIndex !== null) {
        errors.push(`${path} title template cannot have process items or a highlight`);
      }
    } else if (scene.template === 'process') {
      if (scene.highlightIndex === null || scene.highlightIndex >= scene.visualItems.length) {
        errors.push(`${path}/highlightIndex must address an existing process item`);
      }
    } else if (scene.visualItems.length === 0 || scene.highlightIndex !== null) {
      errors.push(`${path} recap template needs items and no highlight`);
    }

    if (scene.needsReview && scene.reviewNotes.length === 0) {
      errors.push(`${path}/reviewNotes must explain the review flag`);
    }
    for (const reference of scene.sourceRefs) {
      if (!declaredSources.has(reference.sourceVersionId)) {
        errors.push(`${path}/sourceRefs contains an undeclared source version`);
      }
      if (sources) {
        const blocks = sourceBlocks.get(reference.sourceVersionId);
        if (!blocks?.has(reference.blockId)) {
          errors.push(`${path}/sourceRefs contains an unknown source block`);
        }
      }
    }
  }

  return errors.length > 0 ? { success: false, errors } : { success: true, data: input };
}
