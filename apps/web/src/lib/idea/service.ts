import 'server-only';
import { validateIdeaDraft, type IdeaOperationKind } from '@aivideos/contracts/idea';
import { IdeaError } from './errors';
import { geminiModel, generateIdeaContent, IdeaProviderError } from './gemini';
import {
  decodeIdeaProject,
  decodeOperation,
  getIdeaCapabilities,
  ideaRpc,
  loadIdeaProject,
  type IdeaContext,
} from './repository';

export async function saveIdea(
  context: IdeaContext,
  projectId: string,
  revisionId: string | null,
  mutationId: string,
  input: unknown,
) {
  const parsed = validateIdeaDraft(input);
  if (!parsed.success)
    throw new IdeaError('INVALID_DRAFT', parsed.errors[0] ?? 'Check this draft.', 422);
  return decodeIdeaProject(
    await ideaRpc(context, 'save_idea_draft', {
      p_project_id: projectId,
      p_expected_revision_id: revisionId,
      p_mutation_id: mutationId,
      p_draft: parsed.data,
    }),
  );
}
export async function generateIdea(
  context: IdeaContext,
  options: {
    projectId: string;
    revisionId: string;
    operationId: string;
    kind: IdeaOperationKind;
    instruction: string;
    sectionId: string | null;
  },
) {
  const key = process.env.GEMINI_API_KEY?.trim();
  if (!key)
    throw new IdeaError(
      'AI_NOT_CONFIGURED',
      'AI generation is being configured. You can still edit and save drafts.',
      503,
    );
  const model = geminiModel();
  const claim = (await ideaRpc(context, 'begin_idea_generation', {
    p_project_id: options.projectId,
    p_expected_revision_id: options.revisionId,
    p_operation_id: options.operationId,
    p_kind: options.kind,
    p_instruction: options.instruction,
    p_model: model,
    p_section_id: options.sectionId,
  })) as { claimed: boolean; operation: unknown; draft: unknown };
  if (!claim.claimed)
    return {
      project: await loadIdeaProject(context, options.projectId),
      operation: decodeOperation(claim.operation),
      capabilities: await getIdeaCapabilities(context),
    };
  const parsed = validateIdeaDraft(claim.draft);
  if (!parsed.success)
    throw new IdeaError('INVALID_STORED_DATA', 'The saved brief could not be read.', 503);
  try {
    const result = await generateIdeaContent({
      draft: parsed.data,
      kind: options.kind,
      instruction: options.instruction,
      sectionId: options.sectionId,
      key,
      model,
    });
    const done = (await ideaRpc(context, 'finish_idea_generation', {
      p_operation_id: options.operationId,
      p_result: result,
    })) as { project: unknown; operation: unknown };
    return {
      project: decodeIdeaProject(done.project),
      operation: decodeOperation(done.operation),
      capabilities: await getIdeaCapabilities(context),
    };
  } catch (error) {
    const provider =
      error instanceof IdeaProviderError ? error : new IdeaProviderError('OUTCOME_UNCERTAIN', true);
    // Recording the outcome never triggers another provider request. If this write
    // fails, the persisted running request remains visible for explicit recovery.
    try {
      await ideaRpc(context, 'fail_idea_generation', {
        p_operation_id: options.operationId,
        p_error_code: provider.code,
        p_uncertain: provider.uncertain,
      });
    } catch {}
    const message = provider.uncertain
      ? 'The AI request was interrupted and may have used credits. Check its status before starting another request.'
      : provider.code === 'INVALID_AI_RESULT'
        ? 'The AI returned an unusable response. Your existing script was kept.'
        : 'The AI service could not complete this request. Your existing script was kept.';
    throw new IdeaError(provider.code, message, 502);
  }
}
