# V1 implementation plan: desktop/mobile web, Android and iOS

Date: October 26, 2026.  
Status: Platform targets requested; architecture and build sequence recommended for implementation.  
Product baseline: [V1 PRD](PRD.md). Agency expansion: [V2 addendum](PRD-V2-agency.md).

Step 1 deliverable: [pipeline technical design, prototype plan and screen flows](step-1/README.md), prepared October 27, 2026. The blueprint and sample data contract are complete. P0's controlled silent renderer is implemented; its measured evidence is recorded in [P0 verification](step-1/p0-verification.md). Narration, live generation, durable workflow and device validation remain prototype execution tasks.

## 1. Recommended architecture

Build one product with a responsive Next.js web client, an Expo/React Native Android/iOS client, shared authenticated APIs and background production workers.

One person has the same account, projects and server-authoritative entitlements across their devices. V1 does not introduce team accounts or group credentials. Android/iOS releases are platform releases of the V1 feature set; they do not depend on implementing agency V2.

| Layer | Recommendation | Responsibility |
|---|---|---|
| Desktop/mobile website | Next.js + React + TypeScript | Public pages, responsive studio, dashboard and web checkout |
| Android and iOS | Expo + React Native + TypeScript | Native navigation, touch editing, media import, playback, save/share, notifications |
| Shared packages | TypeScript schemas, API client, validation and product rules | Reduce duplicated business logic without forcing identical UI |
| Auth/database | Supabase Auth + PostgreSQL | Individual identity, ownership, drafts, revisions, jobs, usage |
| API/application services | Authenticated, versioned endpoints, initially hosted with the web backend | Project and job operations for every client |
| Production workers | Node/Remotion/FFmpeg, with Python inference where needed | Scripts, narration, captions, previews, final rendering |
| Media objects | Private object storage, signed transfer URLs | Assets, scene artifacts, previews and exports |
| Payments | Web payment provider plus platform-appropriate purchase adapters | Purchase verification, entitlements and credit ledger |

Keep the initial backend simple. An independently deployed API service can be introduced later if scale or hosting limitations justify it; API-first design does not require microservices.

## 2. Why this approach

| Option | Benefit | Tradeoff / decision |
|---|---|---|
| Next.js web + Expo native | Preserves the planned web/Remotion editor while providing native mobile interfaces and shared application logic | Two UI implementations require testing; recommended for this product |
| Expo across web and native | Can share more UI when built around universal components | Web-specific editor, marketing pages and rendering components still need adaptation; viable alternative if a prototype proves adequate |
| Capacitor around a web client | Can reuse a larger portion of a web UI with native plugins | WebView experience, native integrations, server/client separation and store requirements still need work; not an automatic export of a Next.js server app |

No option gives automatic 100% code reuse or guaranteed store approval. Choose based on the editor/media prototype rather than a framework slogan.

## 3. Core experience by platform

| Capability | Desktop web | Mobile web | Android/iOS |
|---|---|---|---|
| Individual login and recovery | Full | Full | Full, with app-specific auth redirects and secure session storage |
| Sources, briefs and script edits | Full | Phone-optimized forms | Native forms and device media import |
| Storyboard and scene edits | Side-by-side workspace | One scene at a time; accessible reorder controls | Touch scene cards and contextual controls |
| Preview | Interactive web preview where practical | Lightweight preview with rendered fallback | Backend-produced preview video initially |
| Generation | Submit jobs and track progress | Same; persists if browser closes | Same; survives app suspension; optional completion notification |
| Export | Download approved MP4/SRT | Browser-compatible save/share behavior | Device files/photos/share sheet, using explicit permissions as needed |
| Billing | Supported web checkout | Supported web checkout | Storefront-appropriate flow with server verification |
| Publishing/automation | Original R3/R4 stages | Same server jobs when shipped | Same APIs when shipped; device need not stay open |

Native preview may initially refresh more slowly than the interactive desktop player. Show preview version and stale state accurately. Do not display an old render as though edits have already been applied.

Responsive support means successful creation, not merely shrinking a desktop page. Avoid hover-only controls, tiny text fields and drag-only interactions. Test phone keyboards, safe areas, orientation changes, interrupted uploads and media playback.

## 4. Shared API and data foundations

- Stable account, workspace, project, source, scene, job and artifact IDs.
- Explicit schemas for project mutations, script/storyboard revisions, generation requests and errors.
- API versioning so a released mobile binary remains compatible when the website is updated.
- Enforce ownership server-side and through database/storage policies.
- Use suitable web and native session handling; native credentials belong in secure device storage, not generic unprotected storage.
- Protect all provider secrets on the backend. Publishable client configuration does not grant administrative access.
- Upload media directly to storage through short-lived authorized URLs; validate ownership, size, type and completion.
- Submit durable jobs, return a job ID, and expose resumable progress. Client disconnects do not cancel generation.
- Use idempotency for generation and payments to prevent duplicate charges from retries or double taps.
- Resolve edit conflicts between devices using revision numbers rather than silently overwriting newer work.
- Render on workers; do not depend on a phone performing long-running AI/video computation in the background.
- Keep media drafts and artifact provenance independent from local browser storage.

## 5. Suggested repository organization

```text
apps/
  web/          # Next.js responsive website and initial API endpoints
  mobile/       # Expo Android/iOS application
services/
  worker/       # Durable production jobs and video rendering
  inference/    # Optional Python narration/transcription service
packages/
  contracts/    # Request/response schemas and validation
  api-client/   # Shared API access
  domain/       # Product rules and revision/usage behavior
  design-tokens/# Colors, spacing, typography definitions
  video/        # Web/worker motion templates; not assumed native UI
```

Use one repository and a shared package workflow, but avoid scaffolding unused services. Design tokens can be shared; DOM elements and CSS are not interchangeable with native views.

## 6. Implementation milestones

| Step | Deliverable | Verification before continuing |
|---|---|---|
| 1. Pipeline and flow design | [Technical blueprint and prototype plan](step-1/README.md), screen map and capability checklist for desktop, mobile web and native | Contracts and flows reviewed; phone feasibility is confirmed through the subsequent cross-platform spike |
| 2. Production spike | One 30-second explainer using selected voice, captions and a small template set | Quality, timing, retry behavior and cost measured on intended workers |
| 3. Cross-platform spike | One shared API job visible from responsive web and a native development build | Android/iPhone can import an asset, observe a job and play/save a preview; app suspension is safe |
| 4. Application foundations | Personal auth, database access, sources, media storage, revisions, queue, basic dashboard | Ownership isolation, persistence and reconnect recovery work |
| 5. V1 creation pilot | Full F01–F12 flow with 30/60/90-second outputs and mobile web usability | Real users complete projects; reference exports pass visual/audio checks |
| 6. Paid creation milestone | F13, web payment flow and defined native purchase strategy | Webhook/receipt replay, concurrent spending, restores and refunds handled |
| 7. Native beta and store preparation | Remaining native creation screens, platform UX and purchase behavior | Physical devices, beta distribution, policy review and reviewer access |
| 8. Publishing and automation | Existing R3/R4 requirements using the same backend | Account authorization, approved versions, timezones, retries and remote statuses verified |

Native architecture is tested early, even if the website launches first. Native release dates and relative sequencing with R3/R4 remain planning decisions; do not rename product versions or move original scope implicitly.

## 7. Billing and distribution decisions to make early

Digital subscriptions and credits require a storefront/region-specific purchase plan. Do not assume web checkout can simply be embedded in native apps. Keep a server ledger with purchase source, store transaction identity, idempotent fulfilment, refund/revocation handling, renewal state and appropriate restore behavior. Distinguish purchased credit packs from subscription allowances.

Confirm the supported launch countries and purchase mechanisms before setting native prices. A subscription integration service can help with receipts and lifecycle events but does not replace policy compliance or our credit ledger.

Native apps need a useful app experience. Media import, save/share, touch interactions and completion notifications can provide genuine platform value, while the core creation functionality must remain usable and reliable. No framework or wrapper guarantees review approval.

Provide deletion, privacy disclosures, necessary AI/data-processing consent, reviewer access and tested account recovery. Decide whether the public launch is adults-only and check provider audience terms before accepting customer data. Product user identity remains individual regardless of the legal entity publishing the application.

## 8. Development on Windows and store fees

Expo EAS can build and submit iOS applications from Windows through cloud services. Local Xcode/iOS-simulator workflows require macOS; physical iPhone testing is still needed. Android can be developed/tested on Windows with appropriate tooling and devices.

Published distribution fee references as checked October 26, 2026: Apple Developer Program $99/year; Google Play Console $25 one-time. Region-specific pricing/taxes, cloud build usage, devices, app-store commissions and developer testing requirements are separate.

## 9. Additional PRD implications

- Core creation support must be specified for mobile web, rather than only review/scheduling.
- Android/iOS platform delivery and native capability checks must be tracked explicitly.
- Add cross-device revision conflicts, app suspension and upload recovery to acceptance tests.
- Treat billing as web/native integrations feeding the same account and ledger.
- Keep V1 individual accounts and V2 agency scope boundaries.
- No final name or domain is required to begin architecture/prototyping. Choose stable app identifiers before distribution and resolve branding/domain before public launch.

## 10. Reference documentation

- [Expo web/universal components](https://docs.expo.dev/workflow/web/)
- [Expo DOM/native boundaries](https://docs.expo.dev/guides/dom-components/)
- [Expo cloud development builds](https://docs.expo.dev/develop/development-builds/introduction/)
- [Expo iOS submission](https://docs.expo.dev/submit/ios/)
- [Capacitor](https://capacitorjs.com/docs)
- [Apple review guidelines](https://developer.apple.com/app-store/review/guidelines/)
- [Google Play payments policy](https://support.google.com/googleplay/android-developer/answer/9858738?hl=en)
- [Apple enrollment](https://developer.apple.com/help/account/membership/program-enrollment)
- [Google Play registration](https://support.google.com/googleplay/android-developer/answer/6112435?hl=en)
