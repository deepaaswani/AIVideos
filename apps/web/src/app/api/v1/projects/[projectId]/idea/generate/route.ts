import { IdeaError } from '@/lib/idea/errors';
import { ideaFailure, ideaResponse, readIdeaBody, requireUuid } from '@/lib/idea/http';
import { requireIdeaContext } from '@/lib/idea/repository';
import { generateIdea } from '@/lib/idea/service';
export const maxDuration = 60;
export async function POST(request: Request, route: { params: Promise<{ projectId: string }> }) {
  try {
    const context = await requireIdeaContext(),
      body = await readIdeaBody(request, [
        'revisionId',
        'operationId',
        'kind',
        'instruction',
        'sectionId',
      ]);
    if (body.kind !== 'ideas' && body.kind !== 'script' && body.kind !== 'rewrite')
      throw new IdeaError('INVALID_REQUEST', 'Choose an idea or script action.');
    const instruction = body.instruction ?? '',
      sectionId = body.sectionId ?? null;
    if (
      typeof instruction !== 'string' ||
      instruction.length > 500 ||
      (sectionId !== null &&
        (typeof sectionId !== 'string' || !/^[a-zA-Z0-9_-]{1,64}$/.test(sectionId)))
    )
      throw new IdeaError('INVALID_REQUEST', 'Check the rewrite instruction and section.');
    return ideaResponse(
      await generateIdea(context, {
        projectId: requireUuid((await route.params).projectId),
        revisionId: requireUuid(body.revisionId),
        operationId: requireUuid(body.operationId),
        kind: body.kind,
        instruction,
        sectionId,
      }),
    );
  } catch (error) {
    return ideaFailure(error);
  }
}
