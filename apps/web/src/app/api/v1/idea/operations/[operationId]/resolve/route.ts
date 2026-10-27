import { ideaFailure, ideaResponse, readIdeaBody, requireUuid } from '@/lib/idea/http';
import { decodeOperation, ideaRpc, requireIdeaContext } from '@/lib/idea/repository';
export async function POST(request: Request, route: { params: Promise<{ operationId: string }> }) {
  try {
    const context = await requireIdeaContext();
    await readIdeaBody(request, []);
    const operation = decodeOperation(
      await ideaRpc(context, 'resolve_interrupted_idea_request', {
        p_operation_id: requireUuid((await route.params).operationId),
      }),
    );
    return ideaResponse({ operation });
  } catch (error) {
    return ideaFailure(error);
  }
}
