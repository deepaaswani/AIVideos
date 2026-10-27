import { NextResponse } from 'next/server';
import { IdeaError } from './errors';

export function ideaResponse(data: unknown, status = 200) {
  return NextResponse.json(
    { data, meta: { requestId: crypto.randomUUID() } },
    { status, headers: { 'Cache-Control': 'private, no-store, max-age=0' } },
  );
}
export function ideaFailure(error: unknown) {
  const known =
    error instanceof IdeaError
      ? error
      : new IdeaError(
          'SERVICE_UNAVAILABLE',
          'The studio could not complete this request. Your saved work is unchanged.',
          503,
          true,
        );
  return NextResponse.json(
    {
      error: { code: known.code, message: known.message, retryable: known.retryable },
      meta: { requestId: crypto.randomUUID() },
    },
    { status: known.status, headers: { 'Cache-Control': 'private, no-store, max-age=0' } },
  );
}
export async function readIdeaBody(
  request: Request,
  allowed: readonly string[],
): Promise<Record<string, unknown>> {
  if (request.headers.get('origin') !== new URL(request.url).origin)
    throw new IdeaError('ORIGIN_REJECTED', 'This request must come from Video Studio.', 403);
  if (!request.headers.get('content-type')?.toLowerCase().startsWith('application/json'))
    throw new IdeaError('INVALID_CONTENT_TYPE', 'Send a JSON request.', 415);
  if (!request.body) throw new IdeaError('INVALID_REQUEST', 'The request body is missing.');
  const reader = request.body.getReader(),
    chunks: Uint8Array[] = [];
  let length = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      length += value.byteLength;
      if (length > 131072) {
        await reader.cancel();
        throw new IdeaError('INPUT_TOO_LARGE', 'Shorten this draft before saving.', 413);
      }
      chunks.push(value);
    }
  } finally {
    reader.releaseLock();
  }
  const bytes = new Uint8Array(length);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.length;
  }
  let data: unknown;
  try {
    data = JSON.parse(new TextDecoder().decode(bytes));
  } catch {
    throw new IdeaError('INVALID_REQUEST', 'The request could not be read.');
  }
  if (!data || typeof data !== 'object' || Array.isArray(data))
    throw new IdeaError('INVALID_REQUEST', 'The request must be an object.');
  const record = data as Record<string, unknown>;
  if (Object.keys(record).some((key) => !allowed.includes(key)))
    throw new IdeaError('UNKNOWN_FIELD', 'This request contains an unsupported field.');
  return record;
}
export function requireUuid(input: unknown): string {
  if (
    typeof input !== 'string' ||
    !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(input)
  )
    throw new IdeaError('INVALID_ID', 'This project or request identifier is invalid.');
  return input;
}
