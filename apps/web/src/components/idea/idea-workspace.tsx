'use client';

import Link from 'next/link';
import { useEffect, useRef, useState, useSyncExternalStore } from 'react';
import {
  countScriptWords,
  estimateSpeechSeconds,
  VIDEO_THEMES,
  type IdeaCapabilities,
  type IdeaDraft,
  type IdeaOperationKind,
  type IdeaProject,
  type ScriptSection,
} from '@aivideos/contracts/idea';
import { DraftSession, studioRequest, StudioRequestError } from '@/lib/idea/draft-session';
import styles from './idea-workspace.module.css';

type Props = {
  project: IdeaProject | null;
  newProjectId: string;
  capabilities: IdeaCapabilities;
  email: string;
};
const inputs = [
  ['topic', 'A topic'],
  ['notes', 'My notes'],
  ['script', 'Existing script'],
  ['url', 'Article URL'],
] as const;
const operationMessages: Record<string, string> = {
  PROVIDER_REJECTED: 'The AI service rejected this request. Your script was kept.',
  PROVIDER_UNAVAILABLE: 'The AI service was unavailable. Your script was kept.',
  INVALID_AI_RESULT: 'The AI response could not be used. Your script was kept.',
  OUTCOME_UNCERTAIN:
    'This request was interrupted and may have used credits. Your script was kept.',
};
export function IdeaWorkspace(props: Props) {
  const [session] = useState(
    () =>
      new DraftSession(props.newProjectId, props.project, async (request) => {
        const created = request.revisionId === null;
        const result = await studioRequest<{ project: IdeaProject }>(
          created ? '/api/v1/projects' : `/api/v1/projects/${request.projectId}/idea`,
          created ? 'POST' : 'PUT',
          created
            ? { projectId: request.projectId, mutationId: request.mutationId, draft: request.draft }
            : {
                revisionId: request.revisionId,
                mutationId: request.mutationId,
                draft: request.draft,
              },
        );
        if (created) window.history.replaceState(null, '', `/projects/${request.projectId}/studio`);
        return result.project;
      }),
  );
  const snapshot = useSyncExternalStore(
    session.subscribe,
    session.getSnapshot,
    session.getSnapshot,
  );
  const { draft, project, status, error } = snapshot;
  const [capabilities, setCapabilities] = useState(props.capabilities);
  const [busy, setBusy] = useState('');
  const [message, setMessage] = useState('');
  const [reviewed, setReviewed] = useState(false);
  const [rewrite, setRewrite] = useState('');
  const [scope, setScope] = useState('');
  const [now, setNow] = useState(() => Date.now());
  const pendingOperation = project?.latestOperation?.state === 'running';
  const locked = !!busy || pendingOperation;
  const aiEnabled =
    capabilities.ready &&
    capabilities.allowed &&
    capabilities.configured &&
    capabilities.remaining > 0 &&
    !locked &&
    status !== 'conflict';
  const mounted = useRef(true);
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);
  useEffect(() => {
    if (status !== 'waiting' || locked) return;
    const timer = setTimeout(() => {
      void session.flush().catch(() => {});
    }, 1200);
    return () => clearTimeout(timer);
  }, [session, snapshot, locked, status]);
  useEffect(() => {
    const beforeUnload = (event: BeforeUnloadEvent) => {
      if (session.isDirty() || busy) {
        event.preventDefault();
      }
    };
    const save = (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 's') {
        event.preventDefault();
        void session.flush().catch(() => {});
      }
    };
    window.addEventListener('beforeunload', beforeUnload);
    window.addEventListener('keydown', save);
    return () => {
      window.removeEventListener('beforeunload', beforeUnload);
      window.removeEventListener('keydown', save);
    };
  }, [session, busy]);
  useEffect(() => {
    if (!pendingOperation || busy) return;
    const timer = setInterval(() => {
      setNow(Date.now());
      void studioRequest<{ project: IdeaProject; capabilities: IdeaCapabilities }>(
        `/api/v1/projects/${session.projectId}/idea`,
      )
        .then((result) => {
          if (mounted.current && !session.isDirty()) {
            session.adopt(result.project);
            setCapabilities(result.capabilities);
          }
        })
        .catch(() => {});
    }, 5000);
    return () => clearInterval(timer);
  }, [pendingOperation, busy, session]);
  const edit = (patch: Partial<IdeaDraft>) => {
    setReviewed(false);
    setMessage('');
    session.edit({ ...session.getSnapshot().draft, ...patch });
  };
  const editSection = (index: number, patch: Partial<ScriptSection>) =>
    edit({
      sections: draft.sections.map((section, i) =>
        i === index ? { ...section, ...patch } : section,
      ),
    });
  const report = (cause: unknown) =>
    setMessage(
      cause instanceof Error
        ? cause.message
        : 'The request could not be completed. Your draft is still here.',
    );
  async function generate(kind: IdeaOperationKind) {
    if (!aiEnabled) return;
    setBusy(kind);
    setMessage('');
    try {
      const saved = await session.flush();
      if (!saved)
        throw new StudioRequestError(
          'MORE_CONTEXT_REQUIRED',
          'Add a topic or notes before generating.',
        );
      const result = await studioRequest<{ project: IdeaProject; capabilities: IdeaCapabilities }>(
        `/api/v1/projects/${saved.id}/idea/generate`,
        'POST',
        {
          revisionId: saved.revisionId,
          operationId: crypto.randomUUID(),
          kind,
          instruction: kind === 'rewrite' ? rewrite : '',
          sectionId: kind === 'rewrite' && scope ? scope : null,
        },
      );
      session.adopt(result.project);
      setCapabilities(result.capabilities);
      setReviewed(false);
      if (
        result.project.latestOperation?.state === 'succeeded' &&
        kind !== 'ideas' &&
        !result.project.latestOperation.applied
      )
        setMessage(
          'A newer draft was saved elsewhere. The AI result is retained below for review.',
        );
    } catch (cause) {
      report(cause);
      // Refresh only the saved request state, without discarding local edits.
      if (!session.isDirty())
        try {
          const result = await studioRequest<{
            project: IdeaProject;
            capabilities: IdeaCapabilities;
          }>(`/api/v1/projects/${session.projectId}/idea`);
          session.adopt(result.project);
          setCapabilities(result.capabilities);
        } catch {}
    } finally {
      setBusy('');
    }
  }
  async function importUrl() {
    setBusy('import');
    setMessage('');
    try {
      const result = await studioRequest<{
        title: string;
        text: string;
        url: string;
        retrievedAt: string;
        truncated: boolean;
      }>('/api/v1/idea/import', 'POST', { url: draft.sourceUrl });
      edit({
        inputText: result.text,
        sourceUrl: result.url,
        sourceRetrievedAt: result.retrievedAt,
        sourceConfirmed: false,
        ...(draft.title === 'Untitled video' ? { title: result.title } : {}),
      });
      setMessage(
        result.truncated
          ? 'Imported the first 16,000 characters. Review this extract before generating.'
          : 'Article imported. Review the extracted text and confirm it below.',
      );
    } catch (cause) {
      report(cause);
    } finally {
      setBusy('');
    }
  }
  async function approve() {
    setBusy('approve');
    setMessage('');
    try {
      const saved = await session.flush();
      if (!saved) return;
      const result = await studioRequest<{ project: IdeaProject }>(
        `/api/v1/projects/${saved.id}/idea/approve`,
        'POST',
        { revisionId: saved.revisionId, reviewed },
      );
      session.adopt(result.project);
      setMessage('Script approved. Storyboard creation will be available in the next milestone.');
    } catch (cause) {
      report(cause);
    } finally {
      setBusy('');
    }
  }
  async function resolve() {
    setBusy('resolve');
    try {
      await studioRequest(
        `/api/v1/idea/operations/${project?.latestOperation?.id}/resolve`,
        'POST',
        {},
      );
      const result = await studioRequest<{ project: IdeaProject; capabilities: IdeaCapabilities }>(
        `/api/v1/projects/${session.projectId}/idea`,
      );
      session.adopt(result.project);
      setCapabilities(result.capabilities);
      setMessage(
        'Marked interrupted. The previous request will not be retried automatically; a new generation may use additional credits.',
      );
    } catch (cause) {
      report(cause);
    } finally {
      setBusy('');
    }
  }
  function downloadDraft() {
    const blob = new Blob([JSON.stringify(draft, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob),
      anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = 'video-idea-draft.json';
    anchor.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
  const localDirty = session.isDirty();
  const approved = project?.scriptApproved && !localDirty;
  const selectedTheme = VIDEO_THEMES.find((theme) => theme.id === draft.themeId) ?? VIDEO_THEMES[0];
  const runningAge = project?.latestOperation
    ? now - Date.parse(project.latestOperation.createdAt)
    : 0;
  const retained =
    project?.latestOperation?.state === 'succeeded' &&
    !project.latestOperation.applied &&
    project.latestOperation.result &&
    'sections' in project.latestOperation.result
      ? project.latestOperation.result
      : null;
  function navigate(event: React.MouseEvent<HTMLAnchorElement>) {
    if (
      (session.isDirty() || busy) &&
      !window.confirm('Your latest changes may not be saved. Leave this page?')
    )
      event.preventDefault();
  }
  return (
    <div className={styles.studio}>
      <header className={styles.header}>
        <Link className={styles.brand} href="/" onClick={navigate}>
          <span aria-hidden="true">▷</span> Video Studio
        </Link>
        <span className={styles.headerDivider} />
        <Link className={styles.dashboardLink} href="/dashboard" onClick={navigate}>
          Dashboard
        </Link>
        <label className={styles.projectTitle}>
          <span className={styles.srOnly}>Project title</span>
          <input
            value={draft.title}
            maxLength={200}
            disabled={locked}
            onChange={(event) => edit({ title: event.target.value })}
          />
        </label>
        <div className={styles.saveState} role="status">
          <span className={styles.saveDot} data-state={status} />
          {status === 'saved'
            ? project
              ? 'All changes saved'
              : 'New draft'
            : status === 'saving'
              ? 'Saving…'
              : status === 'waiting'
                ? 'Unsaved changes'
                : status === 'conflict'
                  ? 'Save conflict'
                  : 'Not saved'}
        </div>
        <span
          className={styles.avatar}
          title={props.email}
          aria-label={`Signed in as ${props.email}`}
        >
          {props.email.slice(0, 1).toUpperCase()}
        </span>
      </header>
      <main className={styles.main}>
        <nav className={styles.steps} aria-label="Video creation steps">
          <span aria-current="step">
            <b>1</b> Idea & script
          </span>
          <button disabled title="Available in a later milestone">
            <b>2</b> Storyboard <small>Coming next</small>
          </button>
          <button disabled title="Available in a later milestone">
            <b>3</b> Final video <small>Coming later</small>
          </button>
        </nav>
        <div className={styles.intro}>
          <div>
            <p className={styles.eyebrow}>MAKE SOMETHING CLEAR</p>
            <h1>
              Big ideas. <em>Beautifully explained.</em>
            </h1>
            <p>Start with what you know. Shape a story worth watching.</p>
          </div>
          <span className={styles.format}>
            Motion explainer <span>30–90 seconds</span>
          </span>
        </div>
        {!capabilities.ready && (
          <div className={styles.notice} role="status">
            The studio database update is pending. You can explore this page; saving and AI
            generation become available once setup is complete.
          </div>
        )}
        {capabilities.ready && !capabilities.allowed && (
          <div className={styles.notice}>
            You can edit and save your own drafts. AI generation and article import are limited to
            the owner’s account during this pilot.
          </div>
        )}
        {capabilities.ready && capabilities.allowed && !capabilities.configured && (
          <div className={styles.notice}>
            The AI connection is not configured yet. Your manual drafts can still be saved.
          </div>
        )}
        {capabilities.allowed && capabilities.configured && capabilities.remaining === 0 && (
          <div className={styles.notice}>
            Today’s pilot AI allowance is used. You can keep editing and saving.
          </div>
        )}
        {error && (
          <div className={styles.error} role="alert">
            {error.message}{' '}
            {status === 'conflict' ? (
              <>
                <button onClick={downloadDraft}>Download my draft</button>
                <button
                  onClick={() => {
                    if (
                      window.confirm(
                        'Reload the saved version? Download your local draft first if you want to keep it.',
                      )
                    )
                      window.location.reload();
                  }}
                >
                  Load saved version
                </button>
              </>
            ) : (
              <button onClick={() => void session.flush().catch(() => {})}>Retry save</button>
            )}
            {error.status === 401 && (
              <a
                href={`/login?next=${encodeURIComponent(`/projects/${session.projectId}/studio`)}`}
                target="_blank"
                rel="noreferrer"
              >
                Log in in a new tab
              </a>
            )}
          </div>
        )}
        {message && (
          <div className={styles.notice} role="status">
            {message}
          </div>
        )}
        {pendingOperation && (
          <div className={styles.notice} role="status">
            An AI request is in progress. This page checks its saved status automatically.{' '}
            {runningAge >= 120000 && (
              <button disabled={!!busy} onClick={() => void resolve()}>
                Mark interrupted
              </button>
            )}
          </div>
        )}
        {project?.latestOperation?.errorCode && !pendingOperation && !message && (
          <div className={styles.notice}>
            {operationMessages[project.latestOperation.errorCode] ??
              'The previous request did not finish. Your script was kept.'}
          </div>
        )}
        <div className={styles.columns}>
          <section className={styles.briefCard} aria-labelledby="brief-heading">
            <div className={styles.cardHeading}>
              <span className={styles.cardIcon} aria-hidden="true">
                ✦
              </span>
              <div>
                <h2 id="brief-heading">Your starting point</h2>
                <p>A little context goes a long way.</p>
              </div>
            </div>
            <fieldset disabled={locked} className={styles.fieldset}>
              <legend className={styles.srOnly}>Video brief</legend>
              <div className={styles.inputTabs} aria-label="Input type">
                {inputs.map(([id, label]) => (
                  <button
                    key={id}
                    aria-pressed={draft.inputType === id}
                    onClick={() => edit({ inputType: id, sourceConfirmed: false })}
                  >
                    {label}
                  </button>
                ))}
              </div>
              {draft.inputType === 'url' && (
                <div className={styles.urlInput}>
                  <label htmlFor="article-url">Public article URL</label>
                  <div>
                    <input
                      id="article-url"
                      type="url"
                      placeholder="https://example.com/article"
                      value={draft.sourceUrl}
                      maxLength={2048}
                      onChange={(event) =>
                        edit({
                          sourceUrl: event.target.value,
                          sourceConfirmed: false,
                          sourceRetrievedAt: null,
                        })
                      }
                    />
                    <button
                      disabled={!capabilities.allowed || !capabilities.ready || !draft.sourceUrl}
                      onClick={() => void importUrl()}
                    >
                      {busy === 'import' ? 'Importing…' : 'Import'}
                    </button>
                  </div>
                  <p>Or paste the article text below. No sign-in or paywall access.</p>
                </div>
              )}
              <label className={styles.label} htmlFor="idea-input">
                {draft.inputType === 'topic'
                  ? 'What would you like to explain?'
                  : draft.inputType === 'script'
                    ? 'Paste your existing script'
                    : draft.inputType === 'url'
                      ? 'Review the article extract'
                      : 'Bring your notes'}
              </label>
              <textarea
                id="idea-input"
                className={styles.sourceText}
                value={draft.inputText}
                maxLength={16000}
                placeholder={
                  draft.inputType === 'topic'
                    ? 'For example: Explain how binary search finds a number by halving the search space.'
                    : 'Paste the material you want this explanation to be based on…'
                }
                onChange={(event) =>
                  edit({
                    inputText: event.target.value,
                    ...(draft.inputType === 'url'
                      ? { sourceConfirmed: false, sourceRetrievedAt: null }
                      : {}),
                  })
                }
              />
              <div className={styles.inputHint}>
                <span>
                  {draft.inputType === 'topic'
                    ? 'Topic-based claims need your review.'
                    : 'Your source stays attached to this project.'}
                </span>
                <span>{draft.inputText.length.toLocaleString()} / 16,000</span>
              </div>
              {draft.inputType === 'url' && (
                <label className={styles.checkbox}>
                  <input
                    type="checkbox"
                    checked={draft.sourceConfirmed}
                    onChange={(event) => edit({ sourceConfirmed: event.target.checked })}
                  />
                  <span>I have reviewed this extract and it is the source I want to use.</span>
                </label>
              )}
              <div className={styles.formGrid}>
                <label>
                  Who is watching?
                  <input
                    value={draft.audience}
                    maxLength={300}
                    placeholder="e.g. Curious beginners"
                    onChange={(event) => edit({ audience: event.target.value })}
                  />
                </label>
                <label>
                  Tone
                  <select
                    value={draft.tone}
                    onChange={(event) => edit({ tone: event.target.value as IdeaDraft['tone'] })}
                  >
                    <option value="clear">Clear & simple</option>
                    <option value="friendly">Friendly</option>
                    <option value="professional">Professional</option>
                  </select>
                </label>
              </div>
              <label className={styles.label} htmlFor="objective">
                What should viewers take away?
              </label>
              <input
                id="objective"
                className={styles.fullInput}
                value={draft.objective}
                maxLength={500}
                placeholder="One useful thing they will understand"
                onChange={(event) => edit({ objective: event.target.value })}
              />
              <div className={styles.durationRow}>
                <span className={styles.label}>Target length</span>
                <div>
                  {([30, 60, 90] as const).map((seconds) => (
                    <button
                      key={seconds}
                      aria-pressed={draft.durationSeconds === seconds}
                      onClick={() => edit({ durationSeconds: seconds })}
                    >
                      {seconds}s
                    </button>
                  ))}
                </div>
              </div>
              <div className={styles.divider} />
              <div className={styles.sectionLabel}>
                <h3>Set the mood</h3>
                <span>Video theme</span>
              </div>
              <div className={styles.themes}>
                {VIDEO_THEMES.map((theme) => (
                  <button
                    key={theme.id}
                    className={styles.theme}
                    aria-pressed={draft.themeId === theme.id}
                    onClick={() => edit({ themeId: theme.id })}
                    title={theme.description}
                  >
                    <span
                      className={styles.themeArt}
                      style={{ background: theme.background, color: theme.ink }}
                    >
                      <span className={styles.themeBlock} style={{ background: theme.accent }} />
                      <span className={styles.themeCircle} style={{ background: theme.surface }} />
                      <i>
                        Ideas
                        <br />
                        in motion.
                      </i>
                    </span>
                    <span>
                      {theme.name}
                      {draft.themeId === theme.id && <b aria-hidden="true">✓</b>}
                    </span>
                  </button>
                ))}
              </div>
              <p className={styles.themeNote}>
                Theme previews show the visual direction. Video rendering comes later.
              </p>
            </fieldset>
            <button
              className={styles.secondaryButton}
              disabled={!aiEnabled}
              onClick={() => void generate('ideas')}
            >
              {busy === 'ideas' ? 'Finding angles…' : '✦ Suggest 5 ideas'}
            </button>
            {!!project?.ideas.length && (
              <div className={styles.ideas}>
                <h3>A few ways in</h3>
                {project.ideas.map((idea, index) => (
                  <details key={`${index}-${idea.title}`}>
                    <summary>{idea.title}</summary>
                    <p>{idea.hook}</p>
                    <p>
                      <strong>Audience problem:</strong> {idea.problem}
                    </p>
                    <p>
                      <strong>Takeaway:</strong> {idea.outcome}
                    </p>
                    <p>{idea.rationale}</p>
                    <button
                      disabled={locked}
                      onClick={() =>
                        edit({
                          title: idea.title,
                          selectedIdea: `${idea.title}. ${idea.hook}`,
                          objective: idea.outcome,
                        })
                      }
                    >
                      Use this idea
                    </button>
                  </details>
                ))}
              </div>
            )}
            {draft.selectedIdea && (
              <p className={styles.selectedIdea}>Selected angle: {draft.selectedIdea}</p>
            )}
            <button
              className={styles.primaryButton}
              disabled={!aiEnabled}
              onClick={() => void generate('script')}
            >
              {busy === 'script'
                ? 'Shaping your script…'
                : draft.sections.length
                  ? 'Generate a new script ↗'
                  : 'Generate my script ↗'}
            </button>
            <p className={styles.providerNote}>
              AI actions use the pilot provider account. Review factual claims before approving.
            </p>
          </section>
          <section className={styles.scriptCard} aria-labelledby="script-heading">
            <div className={styles.cardHeading}>
              <span className={styles.cardIcon} aria-hidden="true">
                ≡
              </span>
              <div>
                <h2 id="script-heading">The story takes shape</h2>
                <p>Your words. A clearer way to tell them.</p>
              </div>
              <span className={approved ? styles.approvedBadge : styles.draftBadge}>
                {approved ? 'Approved' : 'Draft script'}
              </span>
            </div>
            {!draft.sections.length ? (
              <div className={styles.emptyScript}>
                <div
                  className={styles.paperStack}
                  style={{ background: selectedTheme.surface, color: selectedTheme.ink }}
                  aria-hidden="true"
                >
                  <span>01</span>
                  <i />
                  <i />
                  <i />
                  <b style={{ background: selectedTheme.accent }}>▷</b>
                </div>
                <h3>A good explanation starts here.</h3>
                <p>
                  Give us a topic or a source. We’ll help you find the hook, build the explanation,
                  and bring it home.
                </p>
                <button
                  className={styles.textButton}
                  disabled={locked}
                  onClick={() =>
                    edit({
                      sections: [
                        {
                          id: 'section-1',
                          title: 'Opening',
                          narration: 'Write your opening here.',
                          visualSuggestion: '',
                          sourceRefs: [],
                        },
                      ],
                    })
                  }
                >
                  Or start writing your own →
                </button>
              </div>
            ) : (
              <>
                <div className={styles.scriptMeta}>
                  <span>{countScriptWords(draft.sections)} words</span>
                  <span>~{estimateSpeechSeconds(draft.sections)}s estimated narration</span>
                  <button disabled={locked} onClick={downloadDraft}>
                    Download draft
                  </button>
                </div>
                {project?.scriptStale && (
                  <p className={styles.staleNote}>
                    Your brief or source changed. Update or regenerate this script before approving.
                  </p>
                )}
                <fieldset disabled={locked} className={styles.fieldset}>
                  <legend className={styles.srOnly}>Edit script sections</legend>
                  <div className={styles.sections}>
                    {draft.sections.map((section, index) => (
                      <article key={section.id} className={styles.scriptSection}>
                        <div className={styles.sectionNumber}>
                          {String(index + 1).padStart(2, '0')}
                        </div>
                        <div>
                          <label className={styles.srOnly} htmlFor={`title-${section.id}`}>
                            Section {index + 1} title
                          </label>
                          <input
                            id={`title-${section.id}`}
                            className={styles.sectionTitle}
                            value={section.title}
                            maxLength={100}
                            onChange={(event) => editSection(index, { title: event.target.value })}
                          />
                          <label className={styles.srOnly} htmlFor={`narration-${section.id}`}>
                            Section {index + 1} narration
                          </label>
                          <textarea
                            id={`narration-${section.id}`}
                            className={styles.narration}
                            value={section.narration}
                            maxLength={1600}
                            onChange={(event) =>
                              editSection(index, { narration: event.target.value })
                            }
                          />
                          <label className={styles.visualLabel}>
                            Visual direction
                            <input
                              value={section.visualSuggestion}
                              maxLength={400}
                              placeholder="A simple diagram, a shape in motion…"
                              onChange={(event) =>
                                editSection(index, { visualSuggestion: event.target.value })
                              }
                            />
                          </label>
                          <div className={styles.sectionActions}>
                            <span>
                              {section.sourceRefs.length
                                ? 'Linked to saved source'
                                : 'No source citation'}
                            </span>
                            <button
                              onClick={() =>
                                edit({ sections: draft.sections.filter((_, i) => i !== index) })
                              }
                            >
                              Remove
                            </button>
                          </div>
                        </div>
                      </article>
                    ))}
                  </div>
                  <button
                    className={styles.textButton}
                    disabled={draft.sections.length >= 8}
                    onClick={() =>
                      edit({
                        sections: [
                          ...draft.sections,
                          {
                            id: `section-${crypto.randomUUID().slice(0, 8)}`,
                            title: 'Next thought',
                            narration: 'Write your next thought here.',
                            visualSuggestion: '',
                            sourceRefs: [],
                          },
                        ],
                      })
                    }
                  >
                    + Add a section
                  </button>
                </fieldset>
                <div className={styles.reviewBox}>
                  <h3>Before you put your name on it</h3>
                  {draft.reviewNotes.length ? (
                    <ul>
                      {draft.reviewNotes.map((note, index) => (
                        <li key={index}>{note}</li>
                      ))}
                    </ul>
                  ) : (
                    <p>
                      Check factual claims, wording, and whether the script faithfully reflects your
                      source.
                    </p>
                  )}
                </div>
                <fieldset disabled={locked} className={styles.rewriteBox}>
                  <legend>Refine the wording</legend>
                  <label className={styles.srOnly} htmlFor="rewrite-scope">
                    Rewrite scope
                  </label>
                  <select
                    id="rewrite-scope"
                    value={scope}
                    onChange={(event) => setScope(event.target.value)}
                  >
                    <option value="">Whole script</option>
                    {draft.sections.map((section) => (
                      <option value={section.id} key={section.id}>
                        {section.title}
                      </option>
                    ))}
                  </select>
                  <label className={styles.srOnly} htmlFor="rewrite-instruction">
                    Rewrite instruction
                  </label>
                  <textarea
                    id="rewrite-instruction"
                    maxLength={500}
                    value={rewrite}
                    onChange={(event) => setRewrite(event.target.value)}
                    placeholder="e.g. Make the opening more conversational. Keep the explanation precise."
                  />
                  <button
                    className={styles.secondaryButton}
                    disabled={!aiEnabled || !rewrite.trim()}
                    onClick={() => void generate('rewrite')}
                  >
                    {busy === 'rewrite' ? 'Refining…' : 'Rewrite with AI ↗'}
                  </button>
                </fieldset>
                <label className={styles.checkbox}>
                  <input
                    type="checkbox"
                    disabled={locked || !!approved}
                    checked={reviewed || !!approved}
                    onChange={(event) => setReviewed(event.target.checked)}
                  />
                  <span>I reviewed the script, source references and review notes.</span>
                </label>
                <button
                  className={styles.primaryButton}
                  disabled={
                    locked ||
                    !reviewed ||
                    !!approved ||
                    status === 'conflict' ||
                    !!project?.scriptStale
                  }
                  onClick={() => void approve()}
                >
                  {busy === 'approve'
                    ? 'Saving approval…'
                    : approved
                      ? '✓ Script approved'
                      : 'Approve this script ✓'}
                </button>
                <p className={styles.providerNote}>
                  Approval saves this script version. Storyboard and final video are planned next.
                </p>
              </>
            )}
            {retained && (
              <details className={styles.retained}>
                <summary>Review retained AI result</summary>
                <p>
                  This result was not applied because a newer draft exists. Copy useful wording into
                  your current script.
                </p>
                {retained.sections.map((section) => (
                  <div key={section.id}>
                    <h3>{section.title}</h3>
                    <p>{section.narration}</p>
                  </div>
                ))}
              </details>
            )}
          </section>
        </div>
        <footer className={styles.footer}>
          <span>Made for ideas that deserve to be understood.</span>
          <button
            disabled={status === 'saved' || status === 'saving' || status === 'conflict' || locked}
            onClick={() => void session.flush().catch(() => {})}
          >
            Save draft
          </button>
        </footer>
      </main>
    </div>
  );
}
