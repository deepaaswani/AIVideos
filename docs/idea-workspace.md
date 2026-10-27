# Idea workspace pilot

The first creation milestone is a responsive personal workspace at `/projects/new` and `/projects/<uuid>/studio`. Homepage Create video buttons lead into this flow through login. The dashboard links to saved projects.

## Available now

- A topic, pasted notes, an existing script, or an extracted public HTTPS article as input.
- Audience, learning objective, clear/friendly/professional tone, and a 30/60/90-second target.
- Four saved output-theme choices: Sapphire Clay, Clean Paper, Midnight, and Classroom. These are visual-direction previews; the new workspace does not render video yet.
- Five Gemini idea suggestions, selection of an angle, structured script generation, and whole-script or section rewrites.
- Manual editing of section titles, narration, and visual directions; script review notes and source links; JSON draft download.
- Debounced autosave with serialized requests, stable mutation identities, immutable source/script revisions, and optimistic concurrency checks. Conflicts retain local text and offer download before reloading.
- Approval bound to the exact saved revision and script hash. Editing the brief/source marks retained scripts stale; new edits or generation require another review.
- Persisted AI request state, one active request per workspace, and a configurable daily pilot limit (20 attempts by default, UTC). Failed and uncertain attempts count toward the limit. No provider request is automatically retried.

Storyboard, final video generation, narration, captions, publishing, billing, collaboration, native clients, and a full project-library dashboard are separate milestones. The existing authored prototype remains available separately.

## Configuration and database deployment

Use Node 22 and install dependencies from the npm workspace root with `npm ci`. Add server-only configuration to `apps/web/.env.local` without removing existing Supabase or ElevenLabs values:

```dotenv
GEMINI_API_KEY=
# Optional; the current default is shown here.
GEMINI_MODEL=gemini-3.5-flash-lite
```

Never prefix these provider settings with `NEXT_PUBLIC_`. The web server sends one bounded structured-output request to Gemini's Interactions API with `store: false`. It validates all returned fields and source identifiers before saving. Model output is text/JSON, never executable rendering code.

Apply the foundation migration only to a fresh database, then apply `supabase/migrations/20261028090000_idea_workspace.sql` once as the database owner. Existing installations already containing the foundation's 22 tables need only the new migration. Keep `private` unexposed; `app` must already be exposed in Supabase Data API settings.

After the intended pilot user has signed up, run as the database owner:

```sql
select app.configure_idea_pilot('YOUR_EXISTING_LOGIN_EMAIL', 20);
```

This resolves the existing Auth user once and pins their UUID in a private table. It disables earlier pilot grants. Client email strings, user metadata, and request bodies cannot grant pilot access. The application requires only the existing Supabase publishable key and verified user session; do not put a service-role key in a browser.

All 25 application tables have RLS. Customer clients have owner-scoped reads and narrow authenticated command functions rather than direct writes. Cross-owner project access, conflicting saves, duplicate claims, malformed results, unsupported citations, and approval of stale scripts are rejected.

The authenticated operation journal is **pilot workflow state**, not an authoritative financial or provider receipt ledger. Its owner may submit their own content/operation results through the command APIs. Before public billing or untrusted multi-customer production, move provider-result settlement and spend accounting behind trusted worker/service privileges, add distributed import throttling and abuse controls, and implement durable job execution. Do not treat this pilot journal as proof that a provider charged a particular amount.

## API surface

All routes verify the Supabase session, return private/no-store JSON envelopes, and validate supported request fields. Mutations require a same-origin JSON request. Source/draft bodies and model output are bounded.

| Method | Route | Purpose |
| --- | --- | --- |
| POST | `/api/v1/projects` | Create the first saved draft using a client project UUID and mutation UUID |
| GET | `/api/v1/projects/:id/idea` | Load the owned draft, latest request and capabilities |
| PUT | `/api/v1/projects/:id/idea` | Save against an expected revision with a stable mutation UUID |
| POST | `/api/v1/projects/:id/idea/generate` | Claim one ideas/script/rewrite operation, call Gemini once, retain its result |
| POST | `/api/v1/projects/:id/idea/approve` | Save explicit review of the exact current script |
| POST | `/api/v1/idea/import` | Extract public article text for the pilot account |
| POST | `/api/v1/idea/operations/:id/resolve` | Mark a request interrupted after two minutes without retrying it |

A request whose originating revision is no longer current retains its result without overwriting newer edits. The UI exposes unapplied script results for manual copying. After a network interruption, it checks the persisted request state; a new generation remains an explicit action that can use additional provider credits.

Article import allows only HTTPS on port 443, resolves and pins public IPv4 addresses, validates each redirect, and bounds time and response bytes. It does not execute page scripts or send account cookies. Local/private/reserved addresses and IPv6-only sites are rejected. JavaScript-only pages, inaccessible articles, and paywalls require pasted text. Users review and confirm extracted material before generating. Source labels mean the script cites a saved source block; they are not an independent fact-check or plagiarism assessment.

Autosave keeps unsaved edits in the current page, with unload warnings and a JSON download option. It does not yet provide an offline draft cache. Speech duration is a 140-words-per-minute estimate, not measured narration.

## Verification

Run `npm run check` and `npm run build` from the root. The database workspace runs all migrations inside PGlite with a test-only Auth bootstrap; never deploy that bootstrap to Supabase.

On 2026-10-28, all 77 tests and the production build passed. Tests cover ownership, immutable revision history, mutation replay, concurrency conflicts, pilot permissions, quotas, URL confirmation, structured-output validation, source-reference validation, approvals, and interrupted operations.

The actual IdeaWorkspace component/CSS was tested in an isolated Chromium fixture at 1440, 390, and 320 pixels in empty and script states: six layouts without horizontal overflow or browser errors. Its autosave created one project, updated the browser URL and displayed the acknowledged save state. Those fixture responses do not establish hosted authentication or provider behavior. Local screenshots/report are in ignored `prototype-results/idea/`.

The production HTTP checks verified a login redirect for `/projects/new`, 401 for unauthenticated read/create APIs, and private/no-store response headers. A real configured Gemini request produced a valid three-section source-based sample. The owner then signed into the local application against hosted Supabase; live project autosave, script generation, manual script edits and exact-revision approval succeeded and survived reload. Five live idea suggestions and a real rewrite also succeeded. The rewrite reset the previous approval as expected. Public article extraction was verified against the official Node.js introduction page (4,116 characters). Verification used four explicit Gemini generation calls in total: one isolated provider check and three signed-in app actions. Physical devices and Safari are not tested.
