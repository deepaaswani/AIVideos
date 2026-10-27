import {
  canonicalIdeaJson,
  emptyIdeaDraft,
  type IdeaDraft,
  type IdeaProject,
} from '@aivideos/contracts/idea';

export class StudioRequestError extends Error {
  constructor(
    public readonly code: string,
    message: string,
    public readonly status = 0,
  ) {
    super(message);
  }
}
export async function studioRequest<T>(url: string, method = 'GET', body?: unknown): Promise<T> {
  let response: Response;
  try {
    response = await fetch(url, {
      method,
      credentials: 'same-origin',
      cache: 'no-store',
      headers: body === undefined ? {} : { 'Content-Type': 'application/json' },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
  } catch {
    throw new StudioRequestError(
      'NETWORK_ERROR',
      'Connection interrupted. Your changes are still here. Retry to check or save them.',
    );
  }
  let json: { data?: T; error?: { code: string; message: string } };
  try {
    json = await response.json();
  } catch {
    throw new StudioRequestError(
      'NETWORK_ERROR',
      'The server response was interrupted. Retry to check the saved state.',
    );
  }
  if (!response.ok || json.error || !json.data)
    throw new StudioRequestError(
      json.error?.code ?? 'REQUEST_FAILED',
      json.error?.message ?? 'This request could not be completed.',
      response.status,
    );
  return json.data;
}
type Snapshot = {
  draft: IdeaDraft;
  project: IdeaProject | null;
  status: 'saved' | 'waiting' | 'saving' | 'error' | 'conflict';
  error: StudioRequestError | null;
};
type SaveRequest = {
  projectId: string;
  revisionId: string | null;
  mutationId: string;
  draft: IdeaDraft;
};
export type DraftWriter = (request: SaveRequest) => Promise<IdeaProject>;

// A session serializes writes and preserves each mutation identity until its
// outcome is known. Editing during a save produces a later, separate revision.
export class DraftSession {
  private snapshot: Snapshot;
  private listeners = new Set<() => void>();
  private baseline: string;
  private pending: SaveRequest | null = null;
  private flight: Promise<IdeaProject | null> | null = null;
  constructor(
    public readonly projectId: string,
    project: IdeaProject | null,
    private readonly writer: DraftWriter,
  ) {
    const draft = project?.draft ?? emptyIdeaDraft();
    this.snapshot = { draft, project, status: 'saved', error: null };
    this.baseline = canonicalIdeaJson(draft);
  }
  getSnapshot = () => this.snapshot;
  subscribe = (listener: () => void) => {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  };
  private emit(patch: Partial<Snapshot>) {
    this.snapshot = { ...this.snapshot, ...patch };
    this.listeners.forEach((listener) => listener());
  }
  isDirty = () => !!this.pending || canonicalIdeaJson(this.snapshot.draft) !== this.baseline;
  edit(draft: IdeaDraft) {
    this.emit({
      draft,
      status:
        this.snapshot.status === 'conflict'
          ? 'conflict'
          : this.flight
            ? 'saving'
            : this.isSame(draft)
              ? 'saved'
              : 'waiting',
    });
  }
  private isSame(draft: IdeaDraft) {
    return canonicalIdeaJson(draft) === this.baseline;
  }
  adopt(project: IdeaProject) {
    if (this.isDirty())
      throw new StudioRequestError(
        'LOCAL_CHANGES',
        'Save your local changes before loading another revision.',
      );
    this.baseline = canonicalIdeaJson(project.draft);
    this.emit({ project, draft: project.draft, status: 'saved', error: null });
  }
  flush(): Promise<IdeaProject | null> {
    if (this.snapshot.status === 'conflict') return Promise.reject(this.snapshot.error);
    if (this.flight) return this.flight;
    const run = async () => {
      while (this.isDirty()) {
        if (!this.pending)
          this.pending = {
            projectId: this.projectId,
            revisionId: this.snapshot.project?.revisionId ?? null,
            mutationId: crypto.randomUUID(),
            draft: structuredClone(this.snapshot.draft),
          };
        this.emit({ status: 'saving', error: null });
        const request = this.pending;
        try {
          const project = await this.writer(request);
          this.pending = null;
          this.baseline = canonicalIdeaJson(request.draft);
          this.emit({ project, status: this.isSame(this.snapshot.draft) ? 'saved' : 'waiting' });
        } catch (error) {
          const known =
            error instanceof StudioRequestError
              ? error
              : new StudioRequestError(
                  'SAVE_FAILED',
                  'Your changes could not be saved. Retry without closing this page.',
                );
          // Only ambiguous transport/server errors retain the exact request for replay.
          if (known.status >= 400 && known.status < 500 && known.status !== 409)
            this.pending = null;
          this.emit({ error: known, status: known.status === 409 ? 'conflict' : 'error' });
          throw known;
        }
      }
      return this.snapshot.project;
    };
    this.flight = run().finally(() => {
      this.flight = null;
    });
    return this.flight;
  }
}
