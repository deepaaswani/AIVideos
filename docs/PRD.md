# AI Educational Video Studio — Product Requirements Document

Version: 1.2  
Date: October 26, 2026  
Status: Approved product direction; proposed implementation specification  
Working product name: AI Educational Video Studio (final brand name TBD)

Revision note: V1 authentication, ownership, and billing are explicitly individual. Target platforms include desktop/mobile web plus planned Android and iOS applications. Platform releases can be staged independently of the existing feature milestones; agency collaboration remains a V2 expansion. See the cross-platform implementation plan for the recommended architecture and delivery sequence.

Implementation companion: [Step 1 — pipeline technical design and prototype plan](step-1/README.md). It specifies the first 30-second technical proof, data/API boundaries and desktop/mobile screen flows without changing this PRD's V1 scope. Prototype execution is tracked separately from design completion.

## 1. Product definition

An AI-assisted video studio that turns expertise into clear, branded, editable 30–90 second educational videos. Customers bring a topic, notes, a script, or an article; the platform helps them choose an angle, write a script, approve a storyboard, generate a motion explainer, and eventually schedule it to Instagram and YouTube.

The product should feel like a thoughtful production partner. It should reduce repetitive production work while giving the customer control over facts, wording, visuals, pronunciation, and publication.

### Product promise

“Turn what you know into an educational video you are proud to publish.”

### Core workflow

Source or idea → creative brief → topic and hook → script → storyboard → approval → narration and visuals → preview → scene edits → export → publication approval → schedule → publication status.

### What makes the product valuable

- Clear explanations, with visuals that teach rather than simply decorate.
- A consistent brand across a series of videos.
- Inspectable scripts and storyboards before expensive generation.
- Individual scene revisions without regenerating every asset.
- Source references and human review for educational claims.
- Transparent usage and generation estimates.
- Reliable progress, recovery, and publishing status.

## 2. Problem and audience

### Customer problem

People with useful knowledge often have material to teach but lack time or design skills to turn it into videos. Their workflow is fragmented across writing, graphics, narration, editing, captions, and publishing. Generic AI outputs frequently require substantial correction, making apparent speed less valuable than it looks.

### Primary launch audience

English-speaking educators, coaches, and expert creators who already have notes, articles, lessons, or other material and want to publish short educational content consistently.

This is the initial audience hypothesis, not validated demand. The first pilot must test willingness to pay and repeat usage.

### Secondary audience

Small brand marketing teams creating educational product content, such as explaining a workflow, concept, product mechanism, or common customer question.

### Deferred audience

Agencies managing many client accounts, enterprise learning departments, and entertainment creators requiring cinematic footage or complex character continuity.

### Jobs to be done

| Customer job | Desired outcome |
|---|---|
| Explain one concept from a lesson | A clear short video with accurate narration and useful diagrams |
| Repurpose an article or notes | A coherent video without starting from a blank page |
| Publish a recurring educational series | Consistent style and less repeated setup |
| Correct an AI draft | Change one sentence or visual without rebuilding everything |
| Prepare content for social platforms | A platform-ready file, followed by reliable scheduled publishing |

## 3. Goals, measures, and validation

### Business goals

1. Demonstrate that customers will pay for the finished output.
2. Establish repeat creation behavior within one narrow audience.
3. Find an economically viable cost per accepted video.
4. Build the creative workflow before expanding into unattended automation.

### North-star measure

Weekly accepted videos per active paying workspace. An accepted video is explicitly marked ready by the customer; track exports and confirmed publications separately rather than assuming either proves satisfaction.

### Proposed pilot gates

These are product targets to validate, not market claims or guarantees.

| Measure | Initial target | How measured |
|---|---|---|
| Paid demand | At least 3 paying pilot customers | Recorded purchase or paid pilot agreement |
| Activation | At least 60% of invited pilot users export a first video within 7 days | Signup-to-export funnel |
| Repeat usage | At least 50% of activated pilot workspaces export another video within 14 days | Cohort events |
| Customer editing effort | Median active editing time below 15 minutes after the first draft | Session events, confirmed in interviews |
| Output satisfaction | At least 70% of reviewed videos rated 4/5 or better | Explicit post-preview rating |
| Render reliability | At least 95% of valid render jobs complete without manual operator intervention | Job records, including automated retries |
| Cost visibility | Estimates shown before 100% of billable generation actions | Product event audit |

Track abandoned projects and reasons, factual corrections, visual replacements, pronunciation corrections, revision counts, cost per accepted video, and user-reported time saved. Small pilot samples are directional; report sample sizes.

### Unit economics

Cost per accepted video includes language-model calls, narration, image or clip inference, render compute, failed attempts, storage, delivery, and relevant support effort. Track these components separately. Pricing and included credits must be set after representative benchmarks. Do not offer unlimited generation at launch.

## 4. Scope and release sequence

| Release | Included | Exit condition |
|---|---|---|
| R0: feasibility | Local reference pipeline, templates, voice tests, timing, encoding, cost instrumentation | A representative set of 30/60/90-second videos renders and can be revised reliably |
| R1: private pilot | Accounts, brand kit, source input, ideas, scripts, storyboard, motion generation, voice, captions, scene editing, export, basic dashboard | Pilot creation and quality gates met; operating costs understood |
| R2: paid creation launch | Production workers, subscriptions, usage ledger, customer isolation, recovery tools, support, launch hardening | End-to-end paid journey and operational checks pass |
| R3: publishing | YouTube and Instagram connections, calendar, approval, scheduling, status, retries | Supported account types and permissions verified; publishing tests pass |
| R4: recurring workflows | Content plans, recurring draft generation, notifications, optional bounded auto-publishing | Limits, approval policy, pause behavior, and recovery verified |

Social API feasibility work starts during R0/R1 so integration constraints are discovered early. Public publishing can ship separately by platform if one platform's access is delayed. Export remains usable throughout.

### Explicitly outside the first launch

- Cinematic text-to-video as the default production method.
- Custom model training, face avatars, and voice cloning.
- A general-purpose multitrack timeline editor.
- Landscape and square exports; vertical 9:16 is the initial format.
- Multilingual guarantees; English is the first supported language.
- Live collaboration, agency client management, and enterprise permissions.
- Trend scraping, guaranteed virality, and guaranteed factual correctness.
- Advanced performance analytics and automatic optimization from social metrics.
- Automatic publication without a configured approval policy.

## 5. Experience and interface requirements

### Design direction

The application should feel calm, precise, and visually polished. Use a restrained neutral interface, a distinctive accent color, strong typography, generous spacing, and large video previews. Let customer content and brand colors stand out.

The primary creation surface is a scene-based studio: scene list, central preview, and contextual controls. Keep advanced settings progressively disclosed. Users should understand their next action, current production stage, and revision cost without reading technical documentation.

### Navigation

- Home: continue a project, create a video, and see jobs needing attention.
- Projects: search and filter drafts, generating, ready, and archived projects.
- Studio: brief, script, storyboard, preview, and scene editing.
- Brand: workspace brand defaults.
- Calendar and Connections: introduced with publishing.
- Usage and Billing.
- Settings and Help.

### Dashboard principles

One shared dashboard serves creators, educators, and brands. Role and use-case selections personalize suggestions, not separate applications. Show useful project status and next actions rather than decorative analytics.

Each signed-in person sees their own private dashboard. “Shared dashboard” means a common interface design across use cases, not shared access between customers. V1 does not require an organization name, team creation, member invitations, or a workspace switcher during onboarding.

### Accessibility and responsive behavior

Target desktop and mobile web browsers, with planned Android and iOS applications using the same individual identity and backend. The responsive website must support the core creation workflow on phones, including source input, scripts, storyboards, scene edits, generation, preview, and export. Desktop may provide a richer layout; mobile must not require hovering or precise drag-and-drop to complete core actions.

Design native applications for the same core product with touch-friendly interfaces, media import, progress, preview, save/share, and appropriate notification behavior. A native release is not an automatic conversion of the website, nor does it require the V2 agency feature set. Deliver platforms incrementally, with an explicit capability checklist for each release.

Support keyboard navigation, visible focus, labeled inputs, reduced-motion preferences, accessible progress announcements, and WCAG 2.2 AA contrast for application controls. Published video text must also remain legible on a phone. Validate representative desktop browsers, iOS Safari, Android Chrome, and physical Android/iOS devices for native releases.

### Empty and error states

Every empty surface offers a meaningful next step or example. Errors explain what failed, which work was retained, whether usage was charged, and how to retry. Do not use fabricated progress percentages or estimated completion times without measurement.

## 6. Detailed functional requirements

Priority: P0 = required for the assigned release; P1 = valuable follow-up. A later-release P0 does not expand R1 scope.

### F01 — Accounts and workspace (R1, P0)

- Email-based sign-in and account recovery through the authentication provider.
- Every login identifies an individual person with their own account; do not provide shared group or team credentials.
- Create one private personal workspace automatically for that person. The workspace is an internal ownership boundary, not a team setup step in the product.
- V1 has no member invitations, shared projects, team roles, or group/seat plans. Any membership model is reserved for a later V2 extension.
- Store workspace audience, use case, timezone, and language preferences.
- Autosave drafts and display saved/saving/error state.
- Provide sign-out, account deletion request, and project deletion.

Acceptance: signup takes a person directly to their personal onboarding/dashboard without creating a group or organization. A returning user resumes the last saved project; another account cannot read or mutate their projects, files, jobs, or usage records. Future collaboration must use separately authenticated people, never a shared login.

### F02 — Brand kit (R1, P0)

- Save logo, primary/secondary colors, approved fonts, tone, audience, preferred narrator, and optional closing message.
- Validate logo formats and size; preview the brand on a sample scene.
- Offer a sensible default brand for customers without assets.
- Snapshot brand settings into a project so later brand changes do not silently alter approved videos.

Acceptance: generated scenes consistently use the selected brand; applying a newer kit to an existing project is explicit and creates a revision.

### F03 — Brief and content input (R1, P0)

- Accept a topic, pasted notes, pasted script, or supported public article URL.
- Capture intended audience, learning objective, tone, duration, and optional call to action.
- URL import extracts readable text and displays it for confirmation; preserve the source URL and retrieval timestamp.
- If extraction fails, offer pasted text. Do not bypass logins or paywalls.
- Accept user-owned image assets for visuals; document uploads are P1.
- Disclose unsupported languages and unsuitable input before generation.

Acceptance: users can inspect and correct imported content before AI uses it; all downstream drafts retain links to their source version.

### F04 — Topic and hook brainstorming (R1, P0)

- Suggest approximately five distinct ideas from the brief or source.
- Each suggestion includes an audience problem, learning outcome, hook, and short rationale.
- Offer formats such as “how it works,” “common misconception,” “three steps,” and “comparison.”
- Let users edit, save, dismiss, or select an idea, or supply their own.
- Avoid presenting unsupported popularity or trend claims as facts.

Acceptance: selecting an idea populates the brief without discarding customer source material; idea regeneration is explicit and subject to usage limits.

### F05 — Script generation and review (R1, P0)

- Generate a hook, explanation, and optional close for 30, 60, or 90 seconds.
- Display editable narration, estimated spoken duration, and source references for relevant claims.
- Allow section-level rewriting and manual edits.
- Flag numeric, time-sensitive, or unsupported claims for review; distinguish source-backed text from AI-added suggestions.
- Label estimated duration clearly; actual narration timing determines the final scene schedule.
- Require script approval before production generation.

Acceptance: editing a script invalidates only downstream artifacts that depend on it; source references are inspectable and never invented to satisfy a citation field.

### F06 — Storyboard (R1, P0)

- Create scene cards with purpose, narration, on-screen text, template, visual description, and estimated timing.
- Use an initial target of roughly 4–6 scenes for 30 seconds, 6–9 for 60 seconds, and 8–12 for 90 seconds; quality and pacing take priority over fixed counts.
- Support reordering, adding, removing, duplicating, and editing scenes within duration limits.
- Provide lightweight visual previews before full rendering.
- Allow explicit approval of the storyboard revision.

Acceptance: approval is tied to an immutable revision; any material scene or narration change is visible and requires approval again before a new final render or publication.

### F07 — Motion explainer generation (R1, P0)

Launch with six polished template families:

1. Hook/title with kinetic typography.
2. Step-by-step process.
3. Side-by-side comparison.
4. Labeled concept diagram.
5. Key statistic with context and source.
6. Recap or call to action.

- Compose a video from structured scenes, brand settings, narration, captions, and assets.
- Use customer uploads and curated visual primitives by default.
- Prevent text overflow, unreadable labels, inconsistent margins, and excessive motion.
- Use chart data explicitly; do not fabricate data for a visual.
- Keep text, labels, and diagrams editable rather than baking them into generated footage.
- Optional generated images and clips are P1 and have separate estimates and provider controls.

Acceptance: all template families render successfully across the reference content set; no cropped text or overlapping captions in visual QA; a 90-second output teaches a coherent idea rather than simply filling time.

### F08 — Voiceover and audio (R1, P0)

- Offer a small curated set of tested English voices and voice previews.
- Support speaking rate, pauses, and pronunciation overrides where the engine permits; maintain display text separately from pronunciation text.
- Generate narration per scene to support targeted edits.
- Provide optional cleared background tracks, volume controls, and ducking under narration.
- Audio failure must not silently produce a successful video without narration.

Acceptance: narration is intelligible, does not clip, and has consistent perceived volume; edited narration causes the affected scene timing and captions to be recalculated. Recommended production target: approximately -16 LUFS integrated with true peak at or below -1 dBTP, verified against final output behavior.

### F09 — Captions (R1, P0)

- Generate timed captions from the produced narration; use approved script text as the wording reference.
- Support text corrections, readable caption styles, and enable/disable controls.
- Respect safe areas and avoid collisions with diagrams and platform UI overlays.
- Provide burned-in captions and a downloadable SRT file.
- Keep caption timing attached to the audio version.

Acceptance: caption text matches the approved narration and passes human timing review; visual QA covers long words, technical terms, and multi-line captions.

### F10 — Scene editor and revisions (R1, P0)

- Edit narration, on-screen text, template, visual assets, and relevant layout controls.
- Replace or regenerate one scene while preserving unaffected narration and visual assets.
- Changing a scene may require re-encoding the final video; explain this distinction without charging for unrelated asset regeneration.
- Show stale downstream artifacts and a clear “update preview” action.
- Retain previous approved versions for comparison and restoration.

Acceptance: a narration edit does not trigger AI asset generation for untouched scenes; changes create versioned artifacts and never overwrite an already approved export.

### F11 — Preview and export (R1, P0)

- Preview the complete current video with play, pause, seek, and scene navigation.
- Identify low-resolution or partially updated previews accurately.
- Export 1080 × 1920, 9:16 MP4 with H.264 video, AAC audio, and a consistent 30 fps output profile.
- Provide a generated thumbnail and secure download link.
- Measure actual runtime. Default acceptance tolerance is ±10% of the selected duration; require user action if the script cannot fit at an intelligible pace.

Acceptance: the exported file decodes correctly, has synchronized audio/video, plays on representative desktop and mobile devices, and matches its approved revision.

### F12 — Projects and production dashboard (R1, P0)

- Search projects and filter by status.
- Display thumbnails, duration, last edited date, current stage, and actionable failures.
- Support duplicate project, archive/unarchive, and delete.
- Show job stages such as queued, generating narration, preparing visuals, rendering, and ready.
- Retain job progress across browser refreshes and sign-ins.

Acceptance: closing a browser does not cancel a server job; a failed stage exposes a safe retry without losing the source, script, or storyboard.

### F13 — Billing and usage (R2, P0)

- Support subscriptions with bounded included credits; prices and allowances remain TBD until benchmarks.
- Subscription entitlement, invoices, credits, and usage belong to the individual account and its private workspace. V1 does not pool credits across people or sell shared team seats.
- Show estimated usage before generation and regeneration.
- Reserve credits atomically before starting a job; settle actual charges and release unused reservations when it ends.
- Define and display the policy for failed jobs, cancellation, retries, and deliberate regenerations.
- Do not charge customers twice for duplicate requests, internal retries, or provider failures covered by the refund policy.
- Keep immutable usage and payment event records; use provider-hosted checkout and billing management for the web. Native subscriptions and credit purchases must use a billing approach permitted by the relevant storefront, region, and distribution rules.
- Keep subscriptions and credit balances authoritative on the backend across platforms. Validate purchase events server-side, handle restores/refunds/revocations, and distinguish subscription allowances from purchased credit packs where their rules differ.
- Verify signed payment webhooks and reconcile entitlements server-side.

Acceptance: concurrent jobs cannot overspend a workspace balance; duplicate webhooks cannot duplicate credits; a user can see how each generation affected the balance.

### F14 — Social connections (R3, P0)

- Connect YouTube and supported Instagram account types using official authorization flows.
- Display the connected account identity, granted capabilities, connection health, and expiry/reconnection needs.
- Request minimum permissions and encrypt tokens at rest.
- Support disconnect and revocation handling.
- Validate eligibility and current platform requirements during implementation; do not imply support for every Instagram account.

Acceptance: users can reliably identify the destination account; revoked or expired credentials prevent publishing and produce an actionable reconnection state.

### F15 — Calendar and publishing (R3, P0)

- Support publish now and schedule for a future time.
- Configure per-platform title, description/caption, thumbnail where supported, visibility, and required disclosure settings.
- Display workspace timezone and a publication confirmation summary; store execution instants in UTC.
- Require approval of the exact rendered artifact and platform metadata.
- Validate platform constraints before accepting the schedule.
- Upload in advance where supported; poll processing status and distinguish uploaded, processing, and publicly published.
- Retry transient failures with bounded exponential backoff. Before retrying uncertain outcomes, reconcile remote status to avoid duplicate posts.
- Support cancel/reschedule until a clearly communicated cutoff; expose any platform limitation.

Acceptance: the same approved artifact can be queued independently for two destinations; a failure on one does not falsify the other platform's status. Success includes a remote post ID and verified platform state, not merely a completed local request.

### F16 — Recurring plans and automation (R4, P0)

- Define content pillars, approved sources, frequency, publishing destinations, and spending caps.
- Show an editable rolling topic plan.
- Default to automatic draft creation followed by customer review.
- Allow optional auto-publishing only after the workspace owner explicitly configures a policy.
- Enforce per-run/monthly limits, non-duplication, and source/brand constraints.
- Allow pause/resume and individual run cancellation.
- Pause or require intervention for disconnected accounts, exhausted budgets, repeated failures, or flagged content.
- Notify on drafts needing review, confirmed publication, actionable failures, and budget limits.

Acceptance: pausing prevents future runs; edits do not create duplicate schedules; publication outside the configured policy cannot proceed.

## 7. Content and output quality standards

### Editorial standard

- Each video has one clear learning objective and a hook that accurately represents its content.
- Use concrete examples and plain language appropriate to the stated audience.
- Distinguish facts, opinions, estimates, and examples.
- Cite source material in the review experience; allow relevant references in downloadable notes or post descriptions.
- Preserve the meaning of customer material rather than inventing evidence to improve the script.
- Flag high-stakes or unsupported claims for review; never market automatic fact checking as a guarantee.

### Visual standard

- Consistent spacing, typography hierarchy, colors, transitions, and logo treatment.
- Large readable text, restrained animation, clear diagram labels, and legible caption placement.
- Treat platform safe-area overlays as versioned presets and recheck them before publishing releases.
- Default assets must have documented usage rights; record provenance for customer and provider assets.
- Avoid misleading charts, fake screenshots, and assets that imply unsupported endorsements.

### Quality reference set

Maintain at least 12 curated reference projects spanning processes, comparisons, technical concepts, statistics, and source repurposing across the three durations. Include long text, unusual pronunciation, missing assets, and script edits. Human review scores clarity, factual fidelity, visual quality, pacing, captions, and brand consistency.

## 8. Technical architecture

### Recommended stack

| Layer | Initial choice | Responsibility |
|---|---|---|
| Web application | Next.js, React, TypeScript | Dashboard, studio, authenticated API endpoints |
| Database and authentication | Supabase/PostgreSQL | Workspace data, auth, access policies, revisions, usage |
| Text generation | Gemini API behind a provider adapter | Ideas, scripts, structured storyboards |
| Video composition | Remotion | Controlled motion templates, preview, rendering |
| Media processing | FFmpeg | Encoding, audio processing, technical validation |
| Voice | Self-hosted Kokoro behind an adapter | Scene narration |
| Caption timing | faster-whisper | Audio timestamps and caption alignment |
| Jobs | pg-boss with PostgreSQL | Durable queues, retries, scheduling |
| Media storage | Local files for development; private object storage for deployment | Inputs, scene artifacts, exports |
| Production storage candidate | Cloudflare R2 | Media objects and signed delivery |
| Payments | Provider TBD | Checkout, subscriptions, invoices, billing portal |
| Publishing | Official YouTube and Instagram APIs | Authorization, uploads, scheduling, status |

Use one primary web backend plus dedicated production workers. A small Python service or worker process may handle voice and transcription. Avoid unnecessary microservices in the pilot.

Recommended cross-platform extension: Next.js for the responsive website and Expo/React Native for Android/iOS, with shared TypeScript contracts, API client, validation, account identity, projects, and usage rules. Native interfaces are platform-specific; React DOM/Remotion editor components are not presumed reusable as native components. Expose authenticated APIs for both clients, keep long-running generation/rendering on backend workers, and provide native-compatible rendered previews. See [Cross-platform implementation plan](cross-platform-implementation-plan.md).

Free tiers and license eligibility are development assumptions, not permanent production guarantees. Verify current terms, data policies, hardware requirements, and commercial eligibility before deployment. Store confidential customer content only with providers and configurations approved for that purpose.

### Worker deployment

R0 can run voice, transcription, and rendering locally. R1 can use an operator-managed worker during a private pilot. R2 requires continuously available workers with resource limits, monitoring, job leases, and restart recovery. Scheduled production publishing must not depend on a developer laptop staying online.

Rendering is a long-running job, not a web request. Store artifacts outside ephemeral application disks. Benchmark CPU rendering and inference independently; optional image/video models may require GPU workers.

### Structured scene contract

The AI produces validated data, not executable rendering code. Each scene includes:

- Stable scene ID and order.
- Template ID and supported template version.
- Narration and display text.
- Visual instructions mapped to allowed components or assets.
- Source references and review flags.
- Brand snapshot and layout settings.
- Audio artifact reference, caption timings, and final duration after generation.

Validate schemas, text limits, supported templates, asset ownership, and timing before rendering. Use deterministic template code for production composition. Do not execute arbitrary model-generated JavaScript, HTML, shell commands, or external URLs.

### Provider abstraction

Separate interfaces for language generation, voice, optional images/clips, rendering, storage, and publishing. Persist provider/model version, request correlation ID, latency, usage, and outcome. Changing a provider must not require rewriting the editor or losing existing projects.

### Revision and dependency behavior

Source revision → script revision → storyboard revision → scene assets/audio → caption timing → render → publication approval.

Cache artifacts using content, configuration, provider/model version, and template version. A change invalidates dependent artifacts only. Approved exports remain immutable. A scheduled post references a fixed render ID; project edits never silently swap its media.

## 9. Data model

| Entity | Key responsibility |
|---|---|
| User / Workspace / Membership | Identity, ownership, authorization boundary |
| BrandKit / BrandVersion | Reusable brand settings and project snapshots |
| Project | Brief, target duration, current revision, lifecycle |
| Source / SourceVersion | Imported text, origin, retrieval time, provenance |
| Idea / ScriptVersion | Brainstorming output, approved narration, references |
| StoryboardVersion / Scene | Ordered scene definitions, templates, review state |
| Asset | Owner, origin, rights metadata, storage key, checksum |
| SceneArtifact / Render | Versioned narration, captions, previews, final media |
| Job / JobAttempt | Stage, inputs, lease, retry count, progress, error |
| Approval | Approver, revision/artifact, scope, timestamp |
| UsageLedger / CreditReservation | Auditable consumption and balance control |
| Subscription / PaymentEvent | Entitlements and provider reconciliation |
| SocialConnection | Destination identity, capabilities, encrypted credentials |
| Publication | Fixed render, platform metadata, UTC time, remote status |
| AutomationPlan / AutomationRun | Policy, budget, schedule, generated outputs |
| Notification / AuditEvent | Actionable communication and sensitive actions |

All customer-owned records include a workspace boundary. Keep secrets out of analytics and ordinary job logs. Deletion must cover derived assets as well as visible project records.

## 10. State machines and recovery

### Project editorial state

Brief → Script draft → Script approved → Storyboard draft → Storyboard approved → Review → Ready.

Model production job state separately: queued → running → succeeded / failed / cancelled. A project can have an approved export while a newer revision is rendering.

### Publication state

Draft → Awaiting approval → Scheduled → Uploading → Processing → Published.

Alternative states: needs reconnection, retry pending, failed, cancelled, or outcome uncertain. Platform-specific adapters map remote behavior to these states without claiming precision the platform does not expose.

### Recovery requirements

- Retry transient provider/network failures within a bounded attempt and cost budget.
- Do not automatically retry permanent validation, permission, or content rejection errors.
- Use request idempotency keys and transactional job/ledger writes.
- Heartbeat running jobs and reclaim expired leases after worker crashes.
- Check cancellation at safe boundaries; disclose already incurred work.
- Preserve completed scene artifacts if a later render stage fails.
- Expose failed-job diagnostics to operators without revealing customer secrets.

## 11. Security, privacy, and trust

- Enforce server-side authorization and database/storage policies for every workspace operation.
- Store API keys and OAuth tokens securely; never send provider secrets to browsers.
- Use private buckets and short-lived signed asset links by default.
- Validate upload signatures, MIME types, file size, dimensions, and decoded media limits; reject malformed or dangerous payloads.
- Protect URL imports against SSRF: block private/internal networks, recheck redirects and resolved destinations, and limit request time and size.
- Treat imported pages as untrusted source data, never as system instructions.
- Validate AI output before persisting production instructions or rendering.
- Require customers to confirm rights to uploaded assets and permitted use of narration/music.
- Provide clear consent for third-party processing and explain relevant retention/data-use choices.
- Rate-limit authentication, generation, uploads, and publishing; enforce workspace budgets server-side.
- Verify webhook signatures and protect sensitive actions against request forgery.
- Support revocation, deletion, and incident response with a documented owner.

### Proposed retention defaults

- Keep project sources and final exports until the customer deletes them or an explicit account retention policy applies.
- Expire temporary previews and failed intermediates after 7 days unless needed by an active job.
- Target removal of deleted content from active systems within 30 days; document backup expiry separately before launch.
- Provide usage/storage visibility and warn before any plan-driven deletion.
- Set final backup, billing-record, and audit-log retention policies before R2; do not promise indefinite free storage.

## 12. Performance and reliability targets

These are initial acceptance targets to benchmark on named deployment hardware, not customer-facing guarantees until measured.

| Area | Initial target |
|---|---|
| Dashboard and project metadata APIs | p95 below 1 second under expected pilot load, excluding asset transfer |
| Idea/script generation | p95 below 45 seconds under normal provider conditions |
| Autosave | Start within 2 seconds of editing pause; visible confirmation/error |
| Job acknowledgement | Return a durable job ID within 2 seconds |
| Standard 90-second motion video | p95 under 10 minutes from job start on selected worker; queue time reported separately |
| Pilot render concurrency | At least 2 simultaneous renders on appropriately provisioned workers |
| Recovery | Worker restart resumes or safely retries queued/interrupted jobs without duplicate charges |
| Availability | Proposed 99.5% monthly production application availability; measure separately from third-party services |

Record stage-level latency and queue wait. Do not hide long queues behind a misleading generation spinner. Apply backpressure and concurrency limits when workers or providers are saturated.

## 13. Analytics and operational tooling

### Product events

Track signup, brand saved, project created, source imported/failed, idea selected, script approved, storyboard approved, generation requested, estimate accepted, preview ready, scene revised, video accepted, export downloaded, purchase completed, account connected, schedule approved, publication confirmed/failed, and automation paused.

Use event IDs and revision IDs for attribution. Avoid recording raw source content, narration, credentials, or personal data in analytics payloads.

### Operator capabilities

- Inspect queue depth, worker health, provider errors, costs, and publishing failures.
- Retry eligible jobs and release stuck credit reservations with audit records.
- Reconcile payments and uncertain publications.
- Disable a provider, template, or automation capability with a feature flag.
- Inspect artifact metadata and technical validation results; customer-content access must be limited and audited.
- Alert on rising failure rates, cost spikes, stalled workers, storage limits, and expiring publishing credentials.

## 14. Testing and release acceptance

### Required verification

1. End-to-end creation from a topic, pasted notes, pasted script, and supported URL.
2. Outputs at 30, 60, and 90 seconds across every launch template family.
3. Scene revision preserves unrelated assets and updates timing correctly.
4. Visual review of every template using the quality reference set.
5. Audio, caption, runtime, resolution, codec, and decode validation of exports.
6. Workspace isolation for records, files, jobs, and signed URLs.
7. Worker crash, network failure, malformed AI data, missing asset, and quota exhaustion recovery.
8. Usage reservations, concurrent generation, duplicate requests, and billing webhook replay.
9. Keyboard and mobile review flows, save-state recovery, and actionable errors.
10. For R3: supported account authorization, reconnection, timezone behavior, cancellations, ambiguous upload outcomes, and remote publication confirmation.
11. For R4: spending caps, approval policies, pause/resume, duplicate-run prevention, and failure escalation.

### Launch checklist for R2

- Pilot gates reviewed with customer interviews and sample sizes.
- Critical correctness, access-control, billing, and data-loss bugs resolved.
- Pricing based on measured costs with retry headroom.
- Commercial licenses and provider data terms checked for the actual deployment.
- Production hosting, backups, recovery procedure, and monitoring operational.
- Privacy notice, usage terms, deletion process, refund rules, and support channel available.
- Reference videos pass editorial and visual review.
- New users can complete the main flow without operator assistance.

## 15. Delivery workstreams and dependencies

| Milestone | Main deliverables | Depends on |
|---|---|---|
| M1: pipeline proof | Scene schema, six template prototypes, narration, captions, MP4 render, benchmarks | Representative source material and test hardware |
| M2: creation foundation | Authentication, workspace boundaries, brand kit, project persistence, source import | Data model and access policies |
| M3: creative studio | Brief, brainstorming, script editor, storyboard approval, scene controls | M1 schema and M2 persistence |
| M4: resilient production | Queues, workers, artifact versioning, progress, scene revision, export QA | M1 and M3 |
| M5: paid pilot and launch | Usage ledger, billing, operational tooling, customer testing, quality refinement | M4 and measured costs |
| M6: social publishing | Approved integrations, calendar, publication state machine, retries | Platform feasibility, immutable renders, reliable workers |
| M7: recurring workflows | Rolling plan, bounded generation, notifications, approval/auto-publish policies | M5 and M6 |

Do not set a delivery date until M1 establishes rendering performance and the implementation team is known. Publishing access may take independent elapsed time.

## 16. Risks and mitigations

| Risk | Response |
|---|---|
| Generic outputs fail to earn repeat purchases | Narrow the audience; test real source material; invest in explanation quality and templates |
| Educational errors damage trust | Preserve sources, highlight uncertain claims, require review, make corrections easy |
| AI and rendering costs exceed revenue | Measure accepted-video cost; cap usage; cache artifacts; bound retries; avoid unlimited plans |
| Free services change or lack production suitability | Keep provider adapters; budget for paid hosting/inference; check terms at deployment |
| Local inference is too slow or voices disappoint | Benchmark representative hardware and scripts; allow a paid voice provider later |
| Publishing permissions delay release | Investigate early; ship export independently; support platforms incrementally |
| Duplicate or incorrect publications | Immutable approvals, idempotency, remote reconciliation, clear account identity |
| Scene revisions create stale combinations | Explicit dependency invalidation, artifact versioning, and approval tied to revisions |
| Uploaded assets or sources have unclear rights | Provenance metadata, customer confirmations, curated default assets |
| Feature scope prevents launch | Enforce release boundaries and pilot gates before publishing automation |

## 17. Decisions to resolve during discovery

These do not block the pipeline prototype, but must be resolved before their dependent release.

| Decision | Suggested starting assumption | Resolve before |
|---|---|---|
| Final product name and domain | Use the working name internally | Public launch |
| First customer niche | Educators/expert creators with existing written material | Pilot recruitment |
| English voices and pronunciation support | Curated Kokoro voices after listening tests | R1 |
| Logo/font/music asset catalog | Small set with documented usage rights | R1 |
| Commercially suitable AI processing | Development-only free tier; review privacy needs for real customers | External pilot |
| Worker hosting and hardware | Benchmark local first, then provision an always-on production worker | R2 |
| Payment provider and currency | Choose based on operating entity, markets, and recurring billing support | R2 |
| Subscription prices, credits, and refunds | Derive from benchmarks and paid pilot feedback | R2 |
| Actual platform account coverage | Official API capability and permission tests | R3 |
| Automated publishing thresholds | Explicit owner opt-in with budgets and review defaults | R4 |

## 18. Reference documentation

These support the selected tools. Capabilities, quotas, prices, and terms must be rechecked when implementing; no free quota is a permanent product dependency.

- Next.js: https://github.com/vercel/next.js
- Supabase pricing: https://supabase.com/pricing
- Gemini pricing/data-use overview: https://ai.google.dev/gemini-api/docs/pricing
- Remotion license FAQ: https://convert.remotion.dev/docs/license/faq
- FFmpeg licensing: https://www.ffmpeg.org/legal.html
- Kokoro model: https://huggingface.co/hexgrad/Kokoro-82M
- faster-whisper: https://github.com/SYSTRAN/faster-whisper
- pg-boss: https://github.com/timgit/pg-boss
- Cloudflare R2 pricing: https://developers.cloudflare.com/r2/pricing/
- YouTube API: https://developers.google.com/youtube/data/reference/rest/v3/videos
- Instagram publishing documentation entry point: https://developers.facebook.com/docs/instagram-platform/instagram-api-with-instagram-login/content-publishing

## 19. Product acceptance statement

The first successful release lets a customer supply real educational material, approve a script and storyboard, generate a polished branded motion explainer, correct individual scenes, and download a reliable video with understandable usage charges. Later releases extend that trusted creation flow into approved scheduling and bounded automation.
