import { ideaFailure, ideaResponse, readIdeaBody, requireUuid } from '@/lib/idea/http';
import { requireIdeaContext } from '@/lib/idea/repository';
import { saveIdea } from '@/lib/idea/service';

export async function POST(request: Request) {
  try {
    const context = await requireIdeaContext(),
      body = await readIdeaBody(request, ['projectId', 'mutationId', 'draft']);
    const project = await saveIdea(
      context,
      requireUuid(body.projectId),
      null,
      requireUuid(body.mutationId),
      body.draft,
    );
    return ideaResponse({ project }, 201);
  } catch (error) {
    return ideaFailure(error);
  }
}
