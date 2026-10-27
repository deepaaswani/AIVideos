import { importArticle } from '@/lib/idea/article';
import { IdeaError } from '@/lib/idea/errors';
import { ideaFailure, ideaResponse, readIdeaBody } from '@/lib/idea/http';
import { getIdeaCapabilities, requireIdeaContext } from '@/lib/idea/repository';
export const runtime = 'nodejs';
export async function POST(request: Request) {
  try {
    const context = await requireIdeaContext(),
      body = await readIdeaBody(request, ['url']);
    if (!(await getIdeaCapabilities(context)).allowed)
      throw new IdeaError(
        'PILOT_ACCESS_REQUIRED',
        'Article import is available to the pilot account initially.',
        403,
      );
    return ideaResponse(await importArticle(body.url));
  } catch (error) {
    return ideaFailure(error);
  }
}
