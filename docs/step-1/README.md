# Step 1 — Pipeline technical design and prototype plan

Date: October 27, 2026.  
Status: Implementation blueprint completed; prototype execution has not started.  
Working label: Video Studio. Final product name/domain remain undecided.

## Read in this order

1. [Pipeline technical design](pipeline-technical-design.md): boundaries, data, APIs, jobs, revisions, costs and recovery.
2. [Prototype plan](prototype-plan.md): a bounded 30-second production test and its acceptance gates.
3. [Desktop/mobile screen flows](screen-flows.md): individual onboarding, creation, editing and recovery.
4. [Storyboard contract](contracts/storyboard.schema.json) and [example](fixtures/storyboard.fixture.json): concrete structured inputs for the planned renderer.
5. [Authored source packet](fixtures/source.fixture.json): the example's traceable source material.

The [approved V1 PRD](../PRD.md) defines product requirements. The [cross-platform plan](../cross-platform-implementation-plan.md) defines the recommended website/Android/iOS approach. This package turns those decisions into an implementation sequence; it does not replace their scope or move publishing/automation out of V1's existing R3/R4 stages.

## Decisions established for the prototype

| Decision | Initial choice |
|---|---|
| Customer identity | One individual account; private projects, usage and credits |
| Web | Next.js/React/TypeScript, usable on desktop and mobile browsers |
| Native | Expo/React Native; early API/media feasibility test, full native UI later |
| AI responsibility | Propose structured script/storyboard data; no executable model-generated rendering code |
| Production | Remotion/FFmpeg workers, Kokoro narration, faster-whisper caption timing |
| Jobs | PostgreSQL application jobs + transactional outbox + pg-boss dispatch |
| Prototype output | A 30-second vertical explainer, five scenes, three template families |
| Sources | Authored fixture and pasted text first; public-URL importer is a later prototype increment |
| Media | Private storage, immutable artifacts, authorized signed downloads |
| Charging | Record provider/compute costs; use test credits during the prototype, not real customer billing |

## What this package does not claim

The sample storyboard is a planned fixture, not proof that AI, audio or rendering has run. The schema/fixture validation checks data consistency; it is not a rendering, security, cost or mobile-device benchmark. No provider keys were configured or paid generations performed to produce this design package.

## Recheck the contract artifacts

From the repository root, with Python and `jsonschema` available:

```powershell
python docs/step-1/validate_contracts.py
```

The validator checks the schema, example, source references, timing estimates and blocked malformed cases. It makes no network or model calls.

The [recorded validation result](validation-report.json) confirms the five-scene fixture passes and all 12 malformed cases are rejected. Runtime validation remains pending. Run with `--report` to refresh this record.

## Immediate next implementation task

Build prototype P0: render the supplied fixture with three controlled templates, using a deliberate fixture-audio mode. Then P1 replaces fixtures with measured Kokoro narration and caption timing. Add live script generation only after the deterministic production path is inspectable. See [prototype milestones](prototype-plan.md#3-implementation-sequence).
