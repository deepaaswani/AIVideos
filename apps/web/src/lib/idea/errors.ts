export class IdeaError extends Error {
  constructor(
    public readonly code: string,
    message: string,
    public readonly status = 400,
    public readonly retryable = false,
  ) {
    super(message);
  }
}
const messages: Record<string, [number, string]> = {
  AUTH_REQUIRED: [401, 'Your session has expired. Log in again, then retry saving.'],
  RESOURCE_NOT_FOUND: [404, 'This project could not be found.'],
  PILOT_ACCESS_REQUIRED: [403, 'AI generation is currently available to the pilot account only.'],
  REVISION_CONFLICT: [
    409,
    'This project changed in another tab or device. Your unsaved changes are still here.',
  ],
  IDEMPOTENCY_MISMATCH: [
    409,
    'This request changed while it was being saved. Reload the saved draft before continuing.',
  ],
  GENERATION_IN_PROGRESS: [
    409,
    'Another AI request is still running. Wait for it to finish before starting another.',
  ],
  DAILY_GENERATION_LIMIT: [
    429,
    'You have reached the pilot AI limit for today. Your draft can still be edited and saved.',
  ],
  MORE_CONTEXT_REQUIRED: [422, 'Add a topic, a few notes, or an audience and objective first.'],
  SOURCE_UNCONFIRMED: [
    422,
    'Import or paste the article text, then confirm that you have reviewed it.',
  ],
  REWRITE_INSTRUCTION_REQUIRED: [422, 'Add a script and a short rewrite instruction first.'],
  CONTENT_REVIEW_REQUIRED: [
    422,
    'Review the script and acknowledge the review notes before approving it.',
  ],
  SCRIPT_STALE: [
    422,
    'The source or brief changed. Edit or regenerate the script before approving it.',
  ],
  SCRIPT_REQUIRED: [422, 'Add or generate a script before approving it.'],
  SCRIPT_TOO_LONG: [422, 'Keep this pilot script within 420 words.'],
  REQUEST_STILL_RUNNING: [
    409,
    'This request may still be running. Wait at least two minutes before marking it interrupted.',
  ],
  INVALID_DRAFT: [
    422,
    'Check your project title, input lengths, duration, theme, and script sections.',
  ],
  INVALID_SOURCE_REFERENCE: [
    422,
    'A source reference is no longer valid. Review the source and script.',
  ],
  INVALID_AI_RESULT: [
    502,
    'The AI response could not be safely used. Your existing script was kept.',
  ],
  UNRELATED_SECTION_CHANGED: [
    502,
    'The rewrite changed an unrelated section. Your existing script was kept.',
  ],
};
export function databaseIdeaError(error: { code?: string; message?: string }): IdeaError {
  const entry = Object.entries(messages).find(([code]) => error.message === code);
  if (entry) return new IdeaError(entry[0], entry[1][1], entry[1][0]);
  if (error.code === 'PGRST202' || error.code === 'PGRST106' || error.code === '42883')
    return new IdeaError(
      'STUDIO_NOT_READY',
      'The studio is being set up. Please try again shortly.',
      503,
      true,
    );
  return new IdeaError(
    'SAVE_UNAVAILABLE',
    'We couldn’t save your changes. They are still on this page; please retry.',
    503,
    true,
  );
}
