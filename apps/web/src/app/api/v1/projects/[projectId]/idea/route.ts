import { ideaFailure, ideaResponse, readIdeaBody, requireUuid } from '@/lib/idea/http';
import { getIdeaCapabilities, loadIdeaProject, requireIdeaContext } from '@/lib/idea/repository';
import { saveIdea } from '@/lib/idea/service';

type Context = { params: Promise<{ projectId: string }> };
export async function GET(_request: Request, route: Context) {
  try {
    const context = await requireIdeaContext(),
      id = requireUuid((await route.params).projectId);
    const [project, capabilities] = await Promise.all([
      loadIdeaProject(context, id),
      getIdeaCapabilities(context),
    ]);
    return ideaResponse({ project, capabilities });
  } catch (error) {
    return ideaFailure(error);
  }
}
export async function PUT(request: Request, route: Context) {
  try {
    const context = await requireIdeaContext(),
      body = await readIdeaBody(request, ['revisionId', 'mutationId', 'draft']);
    const project = await saveIdea(
      context,
      requireUuid((await route.params).projectId),
      requireUuid(body.revisionId),
      requireUuid(body.mutationId),
      body.draft,
    );
    return ideaResponse({ project });
  } catch (error) {
    return ideaFailure(error);
  }
}
