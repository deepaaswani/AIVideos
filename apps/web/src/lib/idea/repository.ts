import 'server-only';
import {
  validateIdeaDraft,
  validateIdeaResult,
  type IdeaCapabilities,
  type IdeaOperation,
  type IdeaProject,
} from '@aivideos/contracts/idea';
import { getAuthContext } from '@/lib/supabase/server';
import { databaseIdeaError, IdeaError } from './errors';

export async function requireIdeaContext() {
  const context = await getAuthContext();
  if (!context.user || !context.supabase)
    throw new IdeaError('AUTH_REQUIRED', 'Log in to open your personal studio.', 401);
  return { user: context.user, supabase: context.supabase };
}
export type IdeaContext = Awaited<ReturnType<typeof requireIdeaContext>>;
export async function ideaRpc(
  context: IdeaContext,
  name: string,
  parameters: Record<string, unknown> = {},
): Promise<unknown> {
  const { data, error } = await context.supabase.schema('app').rpc(name, parameters);
  if (error) throw databaseIdeaError(error);
  return data;
}
function object(input: unknown): Record<string, unknown> {
  if (!input || typeof input !== 'object' || Array.isArray(input))
    throw new IdeaError(
      'INVALID_STORED_DATA',
      'This draft could not be loaded. Please try again.',
      503,
    );
  return input as Record<string, unknown>;
}
export function decodeOperation(input: unknown): IdeaOperation | null {
  if (!input) return null;
  const op = object(input);
  if (
    typeof op.id !== 'string' ||
    !['ideas', 'script', 'rewrite'].includes(String(op.kind)) ||
    !['running', 'succeeded', 'failed', 'uncertain'].includes(String(op.state)) ||
    typeof op.createdAt !== 'string'
  )
    throw new IdeaError('INVALID_STORED_DATA', 'This request could not be loaded.', 503);
  const kind = op.kind as IdeaOperation['kind'];
  let result: IdeaOperation['result'] = null;
  if (op.result !== null && op.result !== undefined) {
    const parsed = validateIdeaResult(kind, op.result, 'notes');
    if (!parsed.success)
      throw new IdeaError('INVALID_STORED_DATA', 'This request result could not be loaded.', 503);
    result = parsed.data;
  }
  return {
    id: op.id,
    kind,
    state: op.state as IdeaOperation['state'],
    createdAt: op.createdAt,
    errorCode: typeof op.errorCode === 'string' ? op.errorCode : null,
    result,
    applied: op.applied === true,
  };
}
export function decodeIdeaProject(input: unknown): IdeaProject {
  const row = object(input),
    parsed = validateIdeaDraft(row.draft);
  if (
    !parsed.success ||
    typeof row.id !== 'string' ||
    typeof row.revisionId !== 'string' ||
    typeof row.revisionNumber !== 'number' ||
    typeof row.updatedAt !== 'string'
  )
    throw new IdeaError(
      'INVALID_STORED_DATA',
      'This draft could not be loaded. Please try again.',
      503,
    );
  const ideas = validateIdeaResult('ideas', { ideas: row.ideas }, 'notes');
  return {
    id: row.id,
    revisionId: row.revisionId,
    revisionNumber: row.revisionNumber,
    updatedAt: row.updatedAt,
    draft: parsed.data,
    scriptApproved: row.scriptApproved === true,
    scriptStale: row.scriptStale === true,
    latestOperation: decodeOperation(row.latestOperation),
    ideas: ideas.success && 'ideas' in ideas.data ? ideas.data.ideas : [],
  };
}
export async function loadIdeaProject(context: IdeaContext, id: string) {
  return decodeIdeaProject(await ideaRpc(context, 'load_idea_project', { p_project_id: id }));
}
export async function getIdeaCapabilities(context: IdeaContext): Promise<IdeaCapabilities> {
  try {
    const data = object(await ideaRpc(context, 'idea_capabilities'));
    return {
      allowed: data.allowed === true,
      dailyLimit: Number(data.dailyLimit) || 0,
      remaining: Number(data.remaining) || 0,
      configured: !!process.env.GEMINI_API_KEY?.trim(),
      ready: true,
    };
  } catch (error) {
    if (error instanceof IdeaError && error.code === 'STUDIO_NOT_READY')
      return {
        allowed: false,
        dailyLimit: 0,
        remaining: 0,
        configured: !!process.env.GEMINI_API_KEY?.trim(),
        ready: false,
      };
    throw error;
  }
}
