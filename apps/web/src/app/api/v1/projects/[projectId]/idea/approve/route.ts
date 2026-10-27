import { IdeaError } from '@/lib/idea/errors';
import { ideaFailure, ideaResponse, readIdeaBody, requireUuid } from '@/lib/idea/http';
import { decodeIdeaProject, ideaRpc, requireIdeaContext } from '@/lib/idea/repository';
export async function POST(request: Request, route: { params: Promise<{ projectId: string }> }) {
  try {
    const context = await requireIdeaContext(),
      body = await readIdeaBody(request, ['revisionId', 'reviewed']);
    if (body.reviewed !== true)
      throw new IdeaError(
        'CONTENT_REVIEW_REQUIRED',
        'Review the script and acknowledge its review notes before approving.',
        422,
      );
    const project = decodeIdeaProject(
      await ideaRpc(context, 'approve_idea_script', {
        p_project_id: requireUuid((await route.params).projectId),
        p_expected_revision_id: requireUuid(body.revisionId),
        p_reviewed: true,
      }),
    );
    return ideaResponse({ project });
  } catch (error) {
    return ideaFailure(error);
  }
}
