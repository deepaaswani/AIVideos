# V2 agency workspace — PRD addendum

Date: October 26, 2026.  
Status: Agreed V2 direction; detailed limits, pricing, and delivery dates remain to be validated.  
Baseline: [V1 PRD](PRD.md). Release interpretation: [Product roadmap](product-roadmap.md).

## 1. Purpose and audience

Extend the V1 studio into an agency workspace for source-based educational and product explainers. The agency is our subscriber; it manages its client relationships, editorial decisions and delivery fees.

Target small content agencies serving B2B software, professional-services, or established course businesses. The initial reference workflow is an agency repurposing a software client's approved articles, product notes and actual screenshots.

Product promise: “Turn approved client knowledge into branded explainers, with easy revisions and clear client approvals.”

## 2. Relationship to V1

Retain the V1 script/storyboard pipeline, motion templates, narration, captions, scene revisions, artifact versions, credit controls, and staged publishing/automation requirements. V2 changes customer organization and collaboration, rather than introducing a cinematic generation engine.

The original R3 publishing and R4 automation milestones remain part of V1's staged roadmap. This addendum adds client-aware behavior wherever those capabilities are available; it does not rename them V3 or V4.

V1 workspaces continue to work independently. Existing customer data must not be exposed to a new agency or assigned to an agency client without an explicit authorized migration.

Authentication always identifies an individual person. V1 has no team setup or shared seats. If V2 introduces an agency workspace and collaboration, each invited person uses their own login with explicit permissions; there is no shared group or company credential.

## 3. Agency workflow

Choose client → select approved sources → prepare brief and ideas → review script/storyboard → generate → agency revision → client review → approve exact revision → export → publish when the relevant integration and permission are available.

An approved creative revision, access to download a final file, and permission to publish are separate actions. A client approval does not automatically publish a video.

## 4. Required additions

| ID | Requirement | Acceptance criteria |
|---|---|---|
| A01 | Client spaces inside an agency workspace | Each project, source, asset, brand, render and usage record has consistent agency/client ownership; another client's reviewer cannot retrieve it by guessing or copying an ID |
| A02 | One reusable brand kit per client initially | New projects inherit the chosen client's brand; later kit edits do not silently change approved exports |
| A03 | Reusable client source/asset library | Operators can select approved material for new projects; AI generation does not mix another client's private knowledge; preserve origin and source revisions |
| A04 | Simple team invitations | Owner handles billing and membership; editors create and revise content; access is checked on every protected operation, not merely hidden in navigation |
| A05 | Restricted external reviewers | Verified invited reviewers can access assigned projects and leave decisions/comments, without browsing other clients, editing production assets, seeing agency usage costs, or spending credits |
| A06 | Review comments and decisions | Comments can identify scenes or timestamps; approval/change requests record reviewer, time and exact revision; material changes require a new decision |
| A07 | Two output formats | 9:16 and 16:9 each have usable layouts, preview and export; test text, diagrams, captions and safe areas independently; do not simply crop |
| A08 | Agency production dashboard | Filter by client and status; expose pending review, requested changes, ready exports and simple due dates |
| A09 | Client/project usage attribution | One agency credit pool and subscription; every generation reservation/charge/refund is attributable to its client/project; prevent overspending under concurrent jobs |
| A10 | Client publishing context | Where V1 publishing is available, connections belong to the appropriate client; show destination identity and require approval of the exact artifact/metadata before scheduling |

Default review access should be invited and revocable. If token-based links are added later, define scope, expiry, forwarding behavior and identity verification before allowing approvals on sensitive work.

## 5. AI and production behavior

- Ground scripts in selected client material and show uncertain or unsupported claims for review.
- Use actual supplied product screenshots and recordings where applicable; do not invent interfaces as factual demonstrations.
- Keep approved terminology, product names, pronunciation and brand settings reusable per client.
- Preserve selective regeneration and transparent estimates from V1.
- Keep all-client shared AI context off by default; any deliberate asset reuse must be authorized.
- Require a separate render/preview check for each output aspect ratio. An agency must see which exports correspond to the approved content revision.
- Retain reliable errors and recovery; do not charge for unrelated regenerated assets or duplicate internal retries.

## 6. Commercial service boundaries

The subscription provides the software, defined processing/storage allowances, onboarding, and support. Final prices, active-client limits, seats and included credits depend on pilot costs and buying evidence.

Client brand setup, custom templates, and managed onboarding may be separately priced services. Human video editing and unlimited revisions are not implicitly included. Agencies bill their own clients; our client usage breakdown is not a client invoicing or accounting system.

## 7. Explicitly deferred

- White-label domains and a complete customizable client portal.
- Client invoicing, CRM, accounting, and automatic profit reports.
- Arbitrary custom roles, enterprise identity, and nested agency organizations.
- Simultaneous editing and a general-purpose timeline editor.
- Cinematic entertainment, generated actors, voice cloning, and character continuity.
- Ad-account optimization, ROAS promises, and performance-UGC production.
- Unlimited generation or automatic publication without an explicit approval policy.

## 8. Validation and release gate

Pilot with at least three paying agencies, using material from at least two client brands per agency. These are proposed validation targets, not evidence of market demand.

Measure accepted deliverables, client correction time, approval turnaround, per-client consumption, direct support effort, and paid repeat usage. Recalculate contribution after actual support and retries; do not reuse the earlier financial scenario as a forecast.

Release checks must cover cross-client isolation, invitation/revocation, version-specific decisions, editing after approval, credits under concurrency, legacy V1 project preservation, both export formats, and the correct client publishing identity where enabled.

No delivery deadline is committed until V1 results, team capacity and the V2 implementation estimate are reviewed.
