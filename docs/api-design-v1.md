# V1 API Design and Contracts

Document version: 1.0  
Date: October 27, 2026 (Asia/Calcutta)  
Status: Proposed implementation contract; endpoints are not implemented or tested by this document.  
Companions: [dashboard architecture](dashboard-system-design-v1.md), [database design](database-design-v1.md), [PRD](PRD.md).

## 1. Scope and contract ownership

Specify the authenticated APIs needed for F01–F16 across R1–R4 and the confirmed V1 extensions: 2D characters, cinematic shots and realistic presenters. Support individual accounts, INR/USD billing and responsive web first, with compatible Android/iOS clients later. No customer team roles, shared seats or agency clients are introduced.

The PRD defines product behavior. The architecture defines components and flows. This document defines request/response boundaries; the database companion defines persistence and transactional invariants. Field names here are proposed production API contracts, not retroactive changes to the strict authored-prototype schema or its scripts.

No handlers, SDK integration, OpenAPI file, schema migration or live provider call is created by this document. A machine-readable OpenAPI contract and executable validators should be generated/reviewed during a separately authorized implementation task. Payment-provider choice, final prices/allowances, provider limits and publishing eligibility remain gated decisions, not fabricated constants.

## 2. Transport, identity and common conventions

| Concern | Contract |
|---|---|
| Base URL | Environment-specific HTTPS origin; application prefix `/api/v1` |
| Request format | JSON UTF-8 unless a provider callback requires raw bytes; binary assets use authorized direct transfer |
| User identity | Auth-provider session verified server-side; email/workspace IDs in request bodies never establish identity |
| Web | Secure server-verified session cookies, protected state-changing requests and explicit allowed origins; private responses are not cross-user cached |
| Native | Verified bearer session, secure device storage and refresh/logout behavior; same application authorization |
| Auth-owned endpoints | Signup, email recovery and sign-in use the chosen auth provider/SDK; do not build another password store |
| IDs | Persisted opaque UUID strings; fixtures' readable IDs are not the production DTO contract |
| Times | RFC 3339 UTC instants; separate IANA timezone and explicit offset where scheduling needs it |
| Durations | Integer milliseconds for measured media; integer frames plus explicit fps for composition |
| Money | `currency: "INR" | "USD"` and decimal-string `amountMinor`; never floating-point currency |
| Credit units | Non-negative integer decimal strings, maximum 18 digits; database stores `bigint`; no implicit conversion to currency |
| Revisions | Immutable revision UUID plus content hash; mutations carry the resource's expected revision/version |
| Provider choices | Client submits allowed catalog IDs/settings; backend resolves model, provider and credentials |
| Forward compatibility | Additive optional response fields allowed; clients ignore unknown response fields; unknown mutation fields rejected |
| Side effects | GET/HEAD never submit billable generation, purchase, publication, approval or destructive work |

Owner resolution is mandatory on every resource, including nested IDs, jobs, invoices, source versions and signed links. Use the verified individual to resolve the private workspace. Do not accept a client `workspaceId` to select another tenant.

Supabase's server-side session guidance is an implementation reference; follow the actual installed SDK's verified identity flow rather than trusting cookie text or an unverified client session. [Supabase server-side clients](https://supabase.com/docs/guides/auth/server-side/creating-a-client?queryGroups=framework&framework=nextjs).

### 2.1 Response envelopes

Successful object response:

```json
{
  "data": {
    "id": "10000000-0000-4000-8000-000000000001",
    "title": "Turn a big task into a clear plan",
    "currentRevisionId": "20000000-0000-4000-8000-000000000001"
  },
  "meta": {
    "requestId": "req_example_001",
    "asOf": "2026-10-27T09:00:00Z"
  }
}
```

Lists return `data.items`, `data.nextCursor` (nullable) and `data.hasMore`. The cursor is opaque, integrity-protected and tied to sort/filter context. Initial `limit=20`, maximum 100 is a proposed metadata-list default; large manifests/media have separate limits. Sort deterministically by timestamp plus ID. Totals may be omitted or explicitly approximate; missing totals are not zero.

Errors return no success data:

```json
{
  "error": {
    "code": "REVISION_CONFLICT",
    "message": "This project changed on another device. Compare the latest version before saving.",
    "retryable": false,
    "nextAction": "compare_revision",
    "details": {
      "latestRevisionId": "20000000-0000-4000-8000-000000000002"
    }
  },
  "meta": {
    "requestId": "req_example_002"
  }
}
```

Never put raw provider payloads, secrets, source content, signed URLs, SQL errors or unauthorized resource metadata in an error. Validation details identify permitted field paths and safe reasons, not sensitive server state.

### 2.2 Status/error vocabulary

| HTTP | Error examples | Client behavior |
|---|---|---|
| 400 | `MALFORMED_REQUEST`, `INVALID_CURSOR` | Correct request; no dispatch |
| 401 | `AUTH_REQUIRED`, `SESSION_EXPIRED` | Restore identity; preserve local draft |
| 403 | `OPERATION_FORBIDDEN` for known permitted-to-disclose context | Do not retry as another resource; internal staff authorization is distinct |
| 404 | `RESOURCE_NOT_FOUND` for missing/inaccessible customer objects | Do not reveal foreign ownership/existence |
| 409 | `REVISION_CONFLICT`, `IDEMPOTENCY_MISMATCH`, `OPERATION_IN_PROGRESS`, `STATE_CONFLICT` | Resolve against current state; do not silently overwrite |
| 413 | `INPUT_TOO_LARGE` | Show configured input limit/fallback |
| 415 | `UNSUPPORTED_MEDIA_TYPE` | Use supported upload/source format |
| 422 | `APPROVAL_REQUIRED`, `SOURCE_UNCONFIRMED`, `INSUFFICIENT_CREDITS`, `CAPABILITY_UNAVAILABLE`, `TIMING_REVIEW_REQUIRED`, `ESTIMATE_EXPIRED` | Show required correction/review; no new provider call |
| 429 | `RATE_LIMITED`, `CONCURRENCY_LIMIT` | Respect `Retry-After`; keep same operation identity |
| 503 | `SERVICE_UNAVAILABLE` before accepted dispatch | Back off; safe retry rules still apply |
| 500 | `INTERNAL_ERROR` | Safe request ID; investigate outcome before repeating side effects |

After a durable `202`, provider failures appear in the job resource; they do not retroactively change the accepted HTTP response. A client timeout never proves the server failed to accept the operation.

## 3. Mutations, concurrency and idempotency

All costly or externally consequential commands require `Idempotency-Key`: drafting/regeneration, render submission, checkout initiation, publication schedule/publish-now, automation creation/run dispatch and destructive lifecycle requests. Use a new client-generated key for a new intended operation; reuse it for transport retries only. Save/scene commands should also carry a mutation ID for duplicate-save protection.

Scope the key to verified workspace + operation name. Persist canonical request hash and original result/job identity. Same key/same hash returns the original accepted result; a different hash returns `409 IDEMPOTENCY_MISMATCH`. Hash normalized semantic inputs with a versioned serializer, not incidental JSON whitespace. Financial/provider deduplication identities outlive ordinary HTTP response-cache retention. Proposed HTTP replay retention is seven days; persisted operations remain recoverable by operation ID afterwards.

Requests changing project content include `expectedRevisionId`; resource administration uses its documented `expectedVersion` integer. Compare-and-swap and the new revision/approval invalidation commit together. Do not have one device's old full-document PATCH erase a newer head. A restored version creates a new head instead of mutating history.

No automatic replay of a billable command using a new key after a timeout. Retry the same key, retrieve the job or reconcile operation state. A stale estimate is rejected before reservation/dispatch. Public callback retries use provider-event identity, not an end-user idempotency header.

## 4. Shared DTO definitions

| DTO | Required fields / invariants |
|---|---|
| `ProjectSummary` | `id`, `title`, `currentRevisionId`, `editorialStage`, `lifecycle`, `style`, `targetDurationSeconds`, `updatedAt`, `previewState`; optional authorized thumbnail descriptor and job/accepted-render summary |
| `ProjectRevision` | `id`, `projectId`, `parentRevisionId`, `contentHash`, `contractVersion`, `brief`, exact source/script/storyboard/brand version references and validated settings |
| `Brief` | `audience`, `learningObjective`, `tone`, `language:"en"`, `targetDurationSeconds:30|60|90`, optional CTA; supported source kind |
| `Style` | `explainer_2d`, `cinematic`, `presenter`; character selection is optional within `explainer_2d`, retaining motion-only output |
| `SourceVersion` | `id`, origin/type, retrieved time where relevant, `contentHash`, blocks and confirmation state; text access owner-scoped |
| `Scene` | Stable scene ID, purpose, narration/display text, template/visual description, source refs, review flags, estimated duration, allowlisted style-specific settings |
| `Approval` | `id`, scope, exact typed target ID/hash, actor basis, creation time and revocation/current validity; never a generic project flag |
| `Estimate` | `id`, operation, revision/hash/settings, capability/price versions, new/reused work, estimated/max units, expiry and cancellation/refund policy version |
| `Job` | `id`, operation, frozen revision/hash, status, current stage, attempt/queue timestamps, cancellation intent, retained artifacts, usage reservation/settlement summary and recovery action |
| `Render` | `id`, revision/runtime hash, technical QA state, current/earlier freshness, measured duration/format, artifact IDs and acceptance state |
| `Money` | `currency`, integer-string `amountMinor`; no JSON float or implicit FX |
| `CreditSummary` | `availableUnits`, `reservedUnits`, `consumedUnits` as integer strings; allowance period/expiry and `asOf` |
| `Publication` | `id`, destination/connection identity, publication version, fixed render/metadata hash, scheduled UTC/timezone, remote outcome and cancellation state |
| `AutomationPlan` | `id`, version, active/paused state, control epoch, approved source/brand/style/policy references, finite budget, cadence/timezone and next occurrence |

Every mutable resource DTO also includes integer `version`, mapping to its database `row_version`; state/lifecycle commands bind it through `expectedVersion`. Content edits bind `expectedRevisionId` in addition where specified. Immutable version DTOs use immutable IDs/hashes rather than an editable row version. List summaries provide the current version needed to open an impact/review flow; the server always rechecks it.

Production scene schemas include all six template families and three duration choices. The prototype `0.1.0` schema remains a fixture-specific contract until explicitly migrated. Runtime audio/caption/frame facts are not guessed model fields: a separate validated runtime manifest references measured immutable artifacts.

## 5. Account, dashboard and capabilities APIs

| ID | Method / relative path | Request | Response / rule |
|---|---|---|---|
| A01 | `GET /me` | None | Profile, personal workspace, entitlement summary; no credentials |
| A02 | `PATCH /me/preferences` | Expected settings version; allowed audience/use case/timezone/language/notification/currency-preference fields | Updated version; billing-currency preference does not alter an existing subscription |
| A03 | `GET /dashboard` | Optional bounded recent-project cursor | Summary sections with `status`, `asOf`, data or safe error; unavailable billing is not a zero balance |
| A04 | `GET /capabilities` | Optional project/revision context | Enabled styles, durations, templates/settings, entitlement/concurrency state and safe disabled reasons |
| A05 | `GET /catalogs/{kind}` | Kind: templates, voices, characters, presenters, music, fonts | Versioned permitted entries, locale/rights/capability metadata and pagination; no arbitrary provider model submission |
| A06 | `POST /account/deletion-requests` | Recent identity verification, explicit confirmation and expected lifecycle version | `202` deletion lifecycle ID; active/remote/billing effects disclosed before request |
| A07 | `POST /support/requests` | Category, bounded message and owned safe resource IDs | Accepted support case; attachments require separate permitted upload |

Account signup/recovery/session verification lives with the auth provider. Successful signup creates the profile and one private workspace idempotently. No organization name, group credentials or invitations are required.

Dashboard `data.sections` contains `continueProject`, `attention`, `activeJobs`, `recentProjects`, `usage` and capability-gated `publishing`/`automations`. Each reports `ready|unavailable|not_enabled`. Summaries exclude full source text and render blobs. Private caching must include authenticated identity and clear on logout.

## 6. Projects, versions and brand APIs

| ID | Method / relative path | Request | Success |
|---|---|---|---|
| A08 | `GET /projects` | `cursor`, `limit`, `query`, `status`, `style`, archive flag and allowlisted sort | `200` paginated summaries |
| A09 | `POST /projects` | Title, brief, permitted style, optional default brand/source references | `201` project + initial revision; no implicit AI call |
| A10 | `GET /projects/{projectId}` | Optional explicit revision ID | `200` metadata, selected revision and available stage/action summaries |
| A11 | `PATCH /projects/{projectId}` | `expectedRevisionId`, mutation ID and allowlisted brief/settings changes | `200` new immutable revision and invalidated dependency summary |
| A12 | `POST /projects/{projectId}/duplicate` | Idempotency key, selected source revision, new title | `201` new project; approvals/jobs/publications/charges not copied |
| A13 | `POST /projects/{projectId}/archive` | Expected lifecycle version, `archived:boolean` | `200` updated lifecycle; in-flight work shown separately |
| A14 | `DELETE /projects/{projectId}` | Expected lifecycle version and confirmation token from deletion impact review | `202` tombstone/cleanup state; not an immediate storage-erasure claim |
| A15 | `GET /projects/{projectId}/versions` | Cursor, limit, optional revision/render filter | `200` immutable history |
| A16 | `POST /projects/{projectId}/restores` | Expected current head, target revision, mutation/idempotency key | `201` new head; restored content does not impersonate new approval |
| A17 | `GET /brand` | None | Current personal default + available historical versions |
| A18 | `POST /brand/versions` | Expected brand-kit version, validated logo/font/color/tone/voice/CTA settings | `201` immutable version; existing projects unchanged |
| A19 | `POST /projects/{projectId}/apply-brand` | Expected project revision and owned brand version ID | `200` new revision and recompute/approval summary |

Example project creation:

```json
{
  "title": "A clear plan in three steps",
  "brief": {
    "audience": "Independent creators",
    "learningObjective": "Turn a large task into three actionable planning steps",
    "tone": "clear and encouraging",
    "language": "en",
    "targetDurationSeconds": 30
  },
  "style": "explainer_2d"
}
```

Deletion impact preview is exposed through `GET /projects/{projectId}/deletion-impact` (A20), returning owned active jobs/publication consequences and a short-lived, version-bound confirmation token. Issuing this token performs no deletion. Account deletion uses an analogous impact summary in A01/A06 and recent authentication. A token is a safety binding, not a substitute for ownership checks.

## 7. Sources, ingestion and uploads

| ID | Method / relative path | Request | Result |
|---|---|---|---|
| A21 | `POST /projects/{projectId}/sources` | Expected head, kind `topic|notes|script`, bounded text and provenance/rights acknowledgement | `201` immutable source version and new project revision; topic input may be brief-only where no external evidence is claimed |
| A22 | `POST /projects/{projectId}/imports` | Expected head, public URL, idempotency key | `202` extraction job; SSRF/time/size/redirect checks; no generation approval |
| A23 | `GET /source-versions/{sourceVersionId}` | None | Owned extracted text/blocks, provenance, confirmation state |
| A24 | `POST /source-versions/{sourceVersionId}/confirm` | Expected content hash, confirmed text or edited text and expected project revision when attaching | New confirmed version if text changed; never mutate already consumed source text |
| A25 | `POST /uploads` | Purpose `logo|visual|support_attachment`, project context where applicable, declared bytes/MIME/checksum and rights confirmation | Bounded upload ID/transfer/expiry and supported restrictions |
| A26 | `POST /uploads/{uploadId}/complete` | Uploaded checksum/part identifiers where applicable | `202` decode/inspection or `200` validated asset; client MIME/success flag alone insufficient |

Actual input/asset limits come from versioned server capabilities. A successful byte transfer does not activate an asset until inspection passes. Objects are stored privately; derived assets retain origin and rights metadata. Import failures return a paste-text fallback, never a paywall bypass. Document upload is a later P1 extension and must not be advertised by unsupported purpose fields.

## 8. Drafts, scene editing and approvals

| ID | Method / relative path | Request | Result |
|---|---|---|---|
| A27 | `POST /projects/{projectId}/drafts` | Operation `ideas|script|storyboard|rewrite_section`; expected/frozen revision, accepted estimate, idempotency key, bounded operation-specific options | `202` draft job; output is reviewable content, not approval |
| A28 | `PATCH /projects/{projectId}/scenes/{sceneId}` | Expected revision, mutation ID, typed narration/display/template/asset/layout/settings fields | New revision; dependency invalidation explicitly returned |
| A29 | `POST /projects/{projectId}/scene-operations` | Expected revision and typed `add|remove|duplicate|reorder` command; ordered scene IDs must match owned revision | New storyboard/revision with contiguous order and supported count/timing |
| A30 | `POST /projects/{projectId}/approvals` | Scope `script|storyboard`, exact typed target ID/hash and expected head | `201` human approval record; unresolved required review flags reject |
| A31 | `POST /approvals/{approvalId}/revocations` | Reason and idempotency key | Append revocation; block dependent future dispatch; in-flight state reconciled |

Manual editing creates versions without automatically calling AI. Expensive rewrites are explicit commands with estimates. A display-only change can reuse narration while invalidating layout; narration/pronunciation changes invalidate affected audio, timing and captions. Unknown templates/actions or an asset from another workspace are rejected before any provider call.

Approval target example:

```json
{
  "scope": "storyboard",
  "targetId": "30000000-0000-4000-8000-000000000001",
  "targetHash": "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
  "expectedRevisionId": "20000000-0000-4000-8000-000000000001"
}
```

Historical script approval can remain valid when its exact content is reused; new material storyboard content needs its own approval. The preflight checks approvals against the complete current dependency graph. Provider output cannot set actor IDs, approval state, ownership, storage keys or prices.

## 9. Estimates, jobs, review and export

| ID | Method / relative path | Request | Result |
|---|---|---|---|
| A32 | `POST /projects/{projectId}/estimates` | Operation, revision, permitted settings and optional changed-scene IDs | Expiring estimate bound to exact inputs/capability/price/policy; new vs reused work |
| A33 | `POST /projects/{projectId}/jobs` | Estimate, frozen revision, accepted maximum units, idempotency key | `202` only after atomic hold + job + outbox commit |
| A34 | `GET /jobs/{jobId}` | None | Durable stage/state, retained work, timestamps, approved inputs, usage and recovery actions |
| A35 | `POST /jobs/{jobId}/cancel` | Idempotency key and optional reason | Cancellation intent and actual state; no promise an upstream effect stopped immediately |
| A36 | `POST /jobs/{jobId}/recovery-estimate` | Expected failed/uncertain outcome version | Covered recovery or newly billable work/estimate; no dispatch yet |
| A37 | `GET /projects/{projectId}/renders` | Cursor/filter | Historical/current validated renders with freshness and exact revision |
| A38 | `POST /renders/{renderId}/accept` | Render/runtime hash, expected review version and idempotency key | Accepted-video event; does not approve publication |
| A39 | `POST /artifacts/{artifactId}/download` | Purpose `preview|download|thumbnail|captions` allowed by artifact type | Authorized short-lived URL/headers/expiry; regenerate URL, not media |

Render submission example, with `Idempotency-Key` in the HTTP header:

```json
{
  "operation": "render_final",
  "revisionId": "20000000-0000-4000-8000-000000000001",
  "estimateId": "40000000-0000-4000-8000-000000000001",
  "format": "vertical_1080p",
  "acceptedMaximumUnits": "120"
}
```

`120` is an illustrative credit quantity, not a price or decided allowance. Production DTOs use integer strings for safe `bigint` transport; older planning snippets showing numeric units are illustrative, not an implemented API to break.

`acceptedMaximumUnits` must match the unexpired estimate's authorized maximum; a client cannot raise the ceiling or choose a different price. Reject mismatches before creating a hold. A reviewed recovery receives its own estimate/operation identity, with a zero customer maximum when covered by policy and links to the original job. It does not consume the original estimate again or duplicate an earlier settlement.

Accepted response:

```json
{
  "data": {
    "jobId": "50000000-0000-4000-8000-000000000001",
    "revisionId": "20000000-0000-4000-8000-000000000001",
    "state": "queued",
    "reservedUnits": "120",
    "statusPath": "/api/v1/jobs/50000000-0000-4000-8000-000000000001"
  },
  "meta": {
    "requestId": "req_example_003",
    "asOf": "2026-10-27T09:01:00Z"
  }
}
```

Job states: `queued`, `running`, `awaiting_review`, `retry_pending`, `succeeded`, `failed`, `cancel_requested`, `cancelled`, with an explicit safe uncertainty reason when a provider outcome is not known. Stage names are bounded enums, such as preflight/narration/visuals/captions/composition/encode/validate/store. Whole-pipeline percentage/ETA is nullable unless measured; frame progress belongs to its render stage.

Internal retries stay under the original operation/hold and published policy. A completed terminal job is not resurrected by editing its old manifest. Reviewed recovery/new user work creates a linked operation under the correct estimate/charge policy. Listing jobs, playing previews and rendering from cached narration must not trigger unrelated paid provider calls.

## 10. Usage, subscriptions and currency

| ID | Method / relative path | Request | Result |
|---|---|---|---|
| A40 | `GET /usage` | Period/cursor/filter | Credit summary, itemized grants/holds/spend/release/reversal, linked jobs and policy versions |
| A41 | `GET /billing/summary` | None | Authoritative active/pending/grace/expired state, billing currency, renewal and allowance/pack summary |
| A42 | `GET /billing/prices` | Currency `INR|USD`, optional interval/plan | Versioned eligible prices; tax treatment/eligibility explicit; no assumed FX |
| A43 | `POST /billing/checkout` | Allowed price ID, intent, expected billing version, idempotency key | Hosted checkout URL/session ID; return URLs server-allowlisted; no client amount override |
| A44 | `POST /billing/portal` | Allowed management intent | Short-lived provider management URL; no entitlement change solely from navigation |
| A45 | `GET /billing/invoices` | Cursor | Immutable provider-backed invoice/receipt summaries, original currency and authorized access |
| A46 | `POST /billing/currency-change` | Desired currency, expected billing version and `preview|confirm` intent; confirm includes expiring quote ID | Provider-supported future change quote or accepted transition; history remains unchanged |

Checkout return pages cannot grant credits. Verified callbacks/reconciliation determine entitlement. One active subscription per private workspace is the proposed default. Credit lots distinguish allowance and purchased-pack expiry/refund behavior. Invoice amounts are currency minor-unit strings; customer credits do not become cash or change with FX.

An invoice/credit summary example money object is `{"currency":"INR","amountMinor":"199900"}`; it illustrates INR 1,999.00 formatting only and is not a product price. USD prices use their own price entries rather than converting this example live.

Future native purchase verification (A47, `POST /billing/store-receipts`) accepts supported store identity plus verification material, binds it to the signed-in owner and deduplicates the store transaction. It grants nothing until server verification. Storefront purchase/restore/refund/revocation and region rules must be decided before shipping the native endpoint; browser clients cannot submit invented store entitlements.

## 11. Connections and OAuth

| ID | Method / relative path | Request | Result |
|---|---|---|---|
| A48 | `GET /connections` | Optional platform | Owned destinations, capability/health/reconnect states; no tokens |
| A49 | `POST /connections/{platform}/authorize` | Platform allowlist, intended capability and allowlisted return path | Expiring authorization session/URL bound to identity and requested intent |
| A50 | `GET /oauth/{platform}/callback` | Provider code/error and one-time state; protocol-defined query | Verify binding/state/issuer requirements, exchange server-side, persist destination securely, redirect to safe application route |
| A51 | `DELETE /connections/{connectionId}` | Expected connection version, idempotency key and confirmed impact | `202` disconnect/revoke/reconcile state; does not claim remote posts were deleted |

YouTube/Instagram app credentials and user tokens are different from application login. A successful OAuth login does not promise publishing eligibility. Verify actual supported account type, granted capabilities, remote destination identity and provider limits before activation. Query-state errors are sanitized; access/refresh tokens never appear in redirect URLs/logs/client DTOs.

## 12. Calendar and publication APIs

| ID | Method / relative path | Request | Result |
|---|---|---|---|
| A52 | `GET /publications` | Bounded UTC range, timezone for display, platform/status/cursor | Independent destination jobs and approval/processing states |
| A53 | `POST /publications` | Fixed render, owned connection, platform metadata and proposed schedule | `201` draft publication version; no upload/publish yet |
| A54 | `PATCH /publications/{publicationId}` | Expected version; metadata/destination/time changes | New immutable version; revoke affected current approval |
| A55 | `POST /publications/{publicationId}/approve` | Exact publication version/hash and fixed render hash | Exact human approval; policy-authorized runs use an internal audited path |
| A56 | `POST /publications/{publicationId}/schedule` | Approved version, expected state, `publish_now|schedule`, idempotency key | `202` durable independently tracked destination operation |
| A57 | `POST /publications/{publicationId}/reschedule` | Expected version, new valid instant/timezone/offset and applicable renewed approval | Accepted changed schedule or cutoff/state conflict |
| A58 | `POST /publications/{publicationId}/cancel` | Expected version/state and idempotency key | Cancel requested/confirmed/uncertain as actually supported remotely |
| A59 | `GET /publications/{publicationId}` | None | Fixed artifact/metadata, destination, remote identity, safe history and recovery action |

Schedule input preserves both an absolute instant and display intent:

```json
{
  "intent": "schedule",
  "publicationVersionId": "60000000-0000-4000-8000-000000000001",
  "scheduledAt": "2026-11-01T04:30:00Z",
  "timezone": "Asia/Kolkata",
  "localDateTime": "2026-11-01T10:00:00",
  "utcOffsetMinutes": 330,
  "expectedVersion": 2
}
```

The server validates that instant/local/timezone/offset agree. Reject nonexistent/ambiguous daylight-saving input until the client supplies an explicit valid interpretation. Changing personal timezone never silently moves approved posts. `publish_now` uses the current execution intent rather than fabricating an already-past scheduled instant.

States: draft/awaiting approval/scheduled/uploading/processing/published/needs reconnection/retry pending/failed/cancelled/outcome uncertain. A successful upload is not necessarily a published public post. Persist remote task/session IDs, reconcile uncertain outcomes before any fresh upload, and keep platform outcomes independent. Cancellation exposes a machine-readable `canCancel`, current cutoff/reason and actual result.

## 13. Recurring plans and automation APIs

| ID | Method / relative path | Request | Result |
|---|---|---|---|
| A60 | `GET /automations`; `GET /automations/{planId}` | Cursor/detail | Owned plan summaries, current immutable policy and next occurrence |
| A61 | `POST /automations` | Sources/brand/style, content pillars, finite cadence/timezone/budgets, destinations and review-first policy; idempotency key | `201` draft or explicitly activated plan; all capabilities/budgets validated |
| A62 | `PATCH /automations/{planId}` | Expected version, typed plan/topic edits | New version; no silent rewrite of already approved publications |
| A63 | `POST /automations/{planId}/pause` | Expected control epoch and idempotency key | Advances epoch, blocks future claims; reports in-flight runs separately |
| A64 | `POST /automations/{planId}/resume` | Expected version/epoch; valid policy/capability/budget state | Prospectively active; proposed default skips missed slots |
| A65 | `GET /automations/{planId}/runs` | Cursor/status/period | Occurrences, generation/review/publication status and attributed usage |
| A66 | `POST /automation-runs/{runId}/cancel` | Expected state and idempotency key | Safe-boundary cancellation and truthful in-flight usage/remote outcome |
| A67 | `POST /automations/{planId}/publish-policy` | Exact policy version, recent identity, explicit opt-in and finite constraints | Versioned unattended-publication permission; distinct from draft-generation permission |

Plan schema requires `perRunMaximumUnits`, `periodMaximumUnits`, bounded frequency/horizon and concrete approved sources/brand/destination identities. Human review remains default. The control epoch is opaque to UI except for concurrency binding. Occurrence creation and budget reservation are internal transactions, not an unauthenticated cron endpoint.

Flagged content, rights uncertainty or disconnected destinations force attention under policy. Machine policy authorization records identify the exact evaluated artifact/metadata/run/policy version and never impersonate a human approval. Monthly periods use the plan timezone with stored UTC boundaries. Proposed missed-run/catchup limits remain explicit product policy.

## 14. Notifications, callbacks and internal operations

| ID | Method / relative path | Contract |
|---|---|---|
| A68 | `GET /notifications` | Private cursor list; safe resource deep links, read/delivery status and event time |
| A69 | `POST /notifications/{notificationId}/read` | Idempotent mark read; no approval/job side effect |
| A70 | `POST /webhooks/{provider}` | Verify raw-body signature or documented authenticated mechanism, enforce size/time/replay policy, persist verified inbox and acknowledge; process asynchronously |
| A71 | Internal operation commands | Separate staff auth and allowlisted recovery/reconciliation/flag actions, reason and audit; never exposed as customer admin APIs |

Callback processing deduplicates provider account/event identity, tolerates repeats/order changes and reconciles authoritative state. Provider-notification failure does not undo an already committed render/payment/publication. Quarantine invalid events without exposing signature secrets. Secrets, full customer content and signed transfer URLs do not enter ordinary telemetry.

For data/financial commands internal staff call the same application policy transactions. No arbitrary credit editing, generic execute-SQL endpoint or silent owner impersonation is specified.

## 15. Limits, compatibility and observable behavior

- Publish input limits through capabilities and enforce them server-side. Source text, URL imports, upload decode bounds, scene count, allowed settings, request rate and concurrent jobs are independently bounded.
- Return `Retry-After` for transient rate/capacity limits. Client backoff preserves operation keys; provider retry limits are application policy, not inherited HTTP-client defaults.
- Show measured stage progress and queued/elapsed time; do not invent whole-job percentages or guaranteed finish times.
- Reauthorize signed downloads after expiry; a stream failure cannot cause fresh AI generation.
- Record safe request/job/revision/stage/provider correlation IDs, capability/schema versions, latency, cache reuse and usage certainty. Track acceptance/export/publication as distinct product events.
- Compatibility strategy: additive optional fields first; new enum/mode only for capability-aware clients; no silent meaning changes. Released mobile API support/deprecation window must be fixed before native beta.
- Preserve current authored-prototype scripts until explicitly migrated. API contracts do not expose raw generated animation code, remote file paths or unrestricted provider SDK request objects.

## 16. Endpoint-to-database and requirement mapping

| PRD / extension | APIs | Main tables in companion |
|---|---|---|
| F01 | A01–A02, A06 | profiles, personal_workspaces, preferences, deletion_requests |
| F02 | A17–A19 | brand_kits, brand_versions, assets, project_revisions |
| F03 | A09, A21–A26 | sources, source_versions, source_blocks, revision_sources, upload_sessions, assets |
| F04 | A27, A32 | ideas, draft_results, jobs, estimates |
| F05 | A27, A30–A31 | script_versions, content_review_flags, approvals, approval_revocations |
| F06 | A28–A31 | storyboard_versions, scenes, scene_versions, storyboard_scenes |
| F07 | A04–A05, A32–A34 | catalog_versions, jobs, scene_artifacts, renders |
| F08 | A05, A28, A32–A34 | voice catalog, runtime_manifests, scene_artifacts, provider_attempts |
| F09 | A28, A37, A39 | caption/audio artifact dependencies and manifests |
| F10 | A11, A15–A16, A28–A29 | immutable versions, artifact_references, revision_sources |
| F11 | A37–A39 | renders, render_acceptances, assets |
| F12 | A03, A08, A10–A16, A20, A34–A36 | projects, jobs, dashboard projections |
| F13 | A32–A33, A40–A47, A70 | prices, credit_accounts/lots/entries, reservations, purchase_receipts, subscriptions |
| F14 | A48–A51 | oauth_sessions, social_connections, credential_references |
| F15 | A52–A59 | publication_versions, publications, publication_attempts, approvals |
| F16 | A60–A67 | automation_versions, occurrences, automation_runs, budget accounts/reservations |
| C01–C03 | A04–A05, A28–A34 | style settings, catalog_versions, artifact/provider/runtime records |

Endpoint labels group related methods deliberately; IDs are traceability labels, not a count of individual HTTP operations. Server implementations must validate both normal responses and denial paths.

## 17. Contract acceptance and remaining decisions

Before implementing each release, turn these definitions into versioned schemas/OpenAPI examples and contract tests. Required coverage: every input-source journey; exact approval binding; owner isolation; malformed/extra input; stale save/estimate; duplicate request/body mismatch; concurrent spending; request timeout after commit; cancellation; media expiry; webhook replay/order; INR/USD transitions; OAuth revoke; two-destination publication; DST; uncertain remote outcomes; recurring pause/budget/dedupe; unsupported mode and older native client.

Every example JSON block in this document should parse, IDs/field names should agree with its DTO, and every endpoint must map to owned persistence or a documented provider protocol. Schema shape does not prove business authorization, factual accuracy, device media compatibility or financial correctness.

Open before dependent releases: payment provider/entity and tax flow; final prices/refunds/lot expiry; exact upload/source/provider/concurrency limits; additional-mode first-public availability; actual social account/scopes/access; auto-publish thresholds; native purchase and API-deprecation policy. These are documented choices, not permission to fill in arbitrary business rules during implementation.

## 18. References and change boundary

- [V1 PRD](PRD.md), [dashboard architecture](dashboard-system-design-v1.md), [database design](database-design-v1.md).
- [Supabase server-side authentication clients](https://supabase.com/docs/guides/auth/server-side/creating-a-client?queryGroups=framework&framework=nextjs), checked October 27, 2026.
- [PostgreSQL constraints](https://www.postgresql.org/docs/current/ddl-constraints.html) and [transaction isolation](https://www.postgresql.org/docs/current/transaction-iso.html) support database enforcement choices; the endpoint/DTO design is our application proposal.

This is documentation only. No API handler, real endpoint, generated client, migration, provider request or account configuration was changed or executed. Further application-code/database changes require the user's permission.
