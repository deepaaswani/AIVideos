# Product roadmap: V1 studio and V2 agency expansion

Decision date: October 26, 2026.

## Version decision

Keep the existing [PRD](PRD.md) as the V1 specification. Add agency capabilities through the separate [V2 agency addendum](PRD-V2-agency.md). The original V1 scope is retained. On October 26, its authentication and billing requirements were clarified: each person has an individual login, private dashboard/projects, and personal subscription/credits, with no V1 team setup or shared seats.

V1 and V2 are product versions. R0–R4 in the existing PRD are delivery milestones within V1; they are not product version numbers.

## V1 — Existing educational video studio

Audience: educators, expert creators, and small brand teams described in the existing PRD.

| Existing milestone | Scope | Commercial meaning |
|---|---|---|
| R0 | Feasibility, motion templates, narration, captions, render benchmarks | Establish production quality and costs |
| R1 | F01–F12: accounts, brand kit, sources, ideas, scripts, storyboards, motion generation, voice, captions, editing, preview/export, dashboard | Private pilot |
| R2 | F13 and production hardening: billing, usage ledger, reliable workers, recovery and support | First paid creation launch; no need to finish all later milestones before charging for creation |
| R3 | F14–F15: supported social connections, calendar, approved publishing and scheduling | Planned publishing stage within V1 |
| R4 | F16: recurring plans, draft generation and bounded opt-in automation | Planned automation stage within V1 |

All original functional requirements F01–F16 remain in V1's staged scope. This version decision does not silently remove publishing or automation, move them to a new V3/V4, or require every milestone to ship on the first launch day.

The existing vertical 9:16 format, 30/60/90-second duration choices, scene-based editor, source review, and generation controls remain the V1 baseline. Agency client management, external client review, internal team invitations, and landscape output are deferred to V2.

V1 onboarding must not require creating a team or organization. A personal workspace may exist internally to enforce ownership. In any later V2 collaboration, each member still signs in as an individual person; group credentials are not an authentication model.

## V2 — Agency expansion

Audience: small content agencies producing source-based educational and product explainers for B2B software, professional-services, and established course businesses. Use B2B software as the initial reference workflow when evaluating pilot material.

| Addition | Result |
|---|---|
| Multiple client spaces | Client-specific sources, assets, brand kits and projects |
| Agency team access | Simple owner/editor collaboration |
| Restricted client review | Secure previews, comments, change requests and version-specific decisions |
| Client source library | Reuse approved knowledge and assets across that client's projects |
| Landscape 16:9 alongside vertical 9:16 | Deliver videos for additional business contexts with format-specific layouts |
| Agency production dashboard | Filter by client, review status and delivery status |
| Usage attribution | Pooled agency billing with per-client/project credit records |
| Client-specific publishing context | Where publishing is available, connect and approve the correct destination account |

V2 reuses the planned creation, rendering, revision, usage, and publishing foundations. It does not replace existing personal/creator workspaces or force their customers into agency workflows.

## Build foundations now, agency features later

V1 should follow its existing workspace ownership, versioned artifacts, brand snapshots, approval records, usage ledger, and provider adapters. These support a later agency expansion without requiring a client-management UI or complex team permissions in V1.

Avoid speculative agency abstractions before the pilot. V2 migrations must preserve existing projects, exports, balances, and approval history.

## V2 readiness

- The V1 creation and paid-use flow is reliable enough to support real customers.
- Accepted-video costs, correction effort, and support needs have been measured.
- Agencies have tested real client material and shown willingness to pay for the added workflow.
- Client isolation, reviewer access, approval versioning, and both aspect ratios have explicit acceptance tests.

Exact dates and whether any agency engineering overlaps remaining V1 milestones require a later delivery plan. The current decision establishes scope boundaries, not a new launch deadline or a changed order for the original R0–R4 milestones.
