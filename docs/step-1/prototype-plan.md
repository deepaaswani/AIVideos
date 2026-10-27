# Prototype plan — one complete 30-second explainer

Date: October 27, 2026.  
Status: P0 implemented; execution and visual-review evidence is tracked in [P0 verification](p0-verification.md). P1 narration/captions, live-provider benchmarks, and device tests remain pending.  
Parent: [V1 PRD](../PRD.md). Design: [Pipeline technical design](pipeline-technical-design.md).

## 1. Questions the prototype must answer

1. Can controlled motion templates produce a video worth publishing?
2. Can narration, captions and scene timing stay synchronized at an intelligible pace?
3. Can an individual edit one scene without regenerating untouched audio/assets?
4. Do progress and recovery survive refresh, client disconnect and worker restart?
5. Can desktop/mobile web and a small native client operate on the same project/job?
6. What are the measured production cost and customer correction effort?

This prototype is a narrow technical/experience experiment. It does not implement all V1 features, establish market demand, or prove commercial-scale throughput.

## 2. Reference video and bounded scope

| Item | Prototype specification |
|---|---|
| Topic | Turn a big task into a clear plan |
| Content | Original demonstration text in [source.fixture.json](fixtures/source.fixture.json); no external factual/financial/medical claims |
| Viewer | Adult creator learning a simple planning method |
| Structure | Hook → name the result → break it into steps → choose the next action → recap |
| Planned runtime | 30 seconds; final accepted range 27–33 seconds |
| Scenes | Five, covering `title`, `process` and `recap` templates |
| Draft data | [storyboard.fixture.json](fixtures/storyboard.fixture.json); estimated timing, not measured audio |
| Format | 1080×1920, 9:16, 30 fps, H.264/AAC MP4; synchronized SRT and thumbnail |
| Visual language | Large typography, process arrows/cards, restrained transitions; one configurable brand snapshot |
| Narration | One tested English Kokoro voice; voice version/parameters recorded |
| Captions | Approved words with measured audio alignment; one readable style |
| Music | Off initially, so voice and sync problems remain easy to diagnose |
| User control | Review script/storyboard, edit a sentence/title, regenerate affected scene and export |

Draft scene timings and a word-count estimate do not prove the video fits. Narration processing measures actual duration; a rewrite or controlled timing adjustment may be required. Maintain source references when rewriting.

## 3. Implementation sequence

| Increment | Build | Evidence required | Paid provider use |
|---|---|---|---|
| P0: controlled visual render | Three templates, validated fixture, five-scene composition, export/metadata inspection | Reference MP4, frame/contact sheet, encoding report, template overflow checks | None |
| P1: real narration and captions | Scene-level Kokoro audio, timing, caption alignment, audio mix | Intelligible narrated export within range, reviewed SRT, audio metadata and measured times | No hosted generation required if inference runs locally; compute still has a cost |
| P2: live script/storyboard | Text adapter from source → structured drafts → individual approval | Validated output, source integrity, review flags, tokens/model/prompt/cost record | Configured text provider, bounded test budget |
| P3: durable web workflow | Individual auth, persistence, queue/outbox, progress, revisions and private storage | Refresh/restart/retry evidence, duplicate-charge prevention with test units, two-account isolation | Only explicit generation actions |
| P4: scene revision and cross-device | Edit one narration scene and a visual-only property; detect stale head | Cache/reuse report, old export retained, correct new revision and captions | Only new work required by chosen edit |
| P5: Android/iPhone integration | Small Expo development client for personal login, job status, media import, preview and save/share | Physical-device report or clearly labelled pending platform checks | No provider calls caused by simply opening the client |

P0 can use an intentionally silent visual-test composition or owned prerecorded test audio. It must be labelled accordingly and cannot pass P1 or final prototype acceptance. No real narration fixture is included in this planning package.

### P0 implementation

The repository now reuses the shared contracts and authored source/storyboard fixtures in `packages/video`: reusable Title, Process, and Recap templates, cumulative frame timeline calculations with tests, and one Remotion composition shared by the responsive `/prototype` Player and CLI.

Run `npm run prototype:render` from the root to export into ignored `prototype-results/p0/`. Repeated runs overwrite the same artifact paths. The P0 output is an intentionally silent H.264 MP4 with no audio track: 1080×1920, 30 fps, 900 frames / 30 seconds from estimated fixture timings. Scene stills, a thumbnail, fixture/stress/decoded contact sheets, encoding metadata, hashes, and timing/runtime reports accompany the MP4. No SRT or narration is produced in P0.

`npm run prototype:inspect` validates actual source-block references, tracked input hashes, completed export status, media metadata, and full MP4 decoding. It fails on stale inputs or incomplete exports. `npm run prototype:render -- --images-only` exports layout evidence without video verification and records an images-only runtime status. These commands do not themselves establish human visual acceptance; consult [P0 verification](p0-verification.md) for checks actually completed. Setup, browser selection, concurrency, and local font details are in the [root README](../../README.md#render-p0).

Do not wait until the full web studio is built to exercise P5 connectivity/media assumptions. A thin native client can run once P3's deployed endpoints exist; the complete native editor remains a later implementation milestone.

### Scope deferred from this proof, retained in V1 roadmap

- All six final template families and 60/90-second generation.
- Full public URL import and document ingestion.
- Real payment collection and app-store purchase integrations.
- Full native editing screens, push infrastructure and public store submissions.
- Social connections, calendar publishing and recurring automation (existing R3/R4).

Outside this proof and V1: agency management, client reviewers and landscape output belong to V2. Generative footage, avatars, voice cloning, AI music and complex timelines are not part of the approved V1 commitment.

## 4. Acceptance gates

Targets below are proposed engineering criteria. They are not measured results or customer-facing service promises.

| Gate | Pass criteria | Verification |
|---|---|---|
| G01 Content | Approved words/source references preserved; no unsupported numeric claims or fabricated source IDs | Human comparison with source plus semantic validator |
| G02 Visuals | No cropped text/diagrams/captions; clear hierarchy and readable process animation | Inspect contact sheet, motion playback, narrow phone display and long-text cases |
| G03 Media | Correct dimensions/codecs/fps; MP4 fully decodes; duration 27–33 s; thumbnail and SRT correspond to revision | Media probe, decode and artifact hash report |
| G04 Audio | Narration is present/intelligible, no clipping/abrupt cuts; music absent initially; level close to PRD target | Listening review plus measured peak/loudness; document intentional deviations |
| G05 Captions | Approved wording and readable line breaks; no cues outside runtime; spot-check boundaries within about 200 ms | Automated cue bounds plus human timing review, including scene joins |
| G06 Editing | One narration edit regenerates only affected audio/alignment; visual-only edit reuses audio | Compare artifact hashes, provider-call log and before/after exports |
| G07 Recovery | Closing/reopening client resumes status; one worker restart and one storage failure preserve completed stages | Fault-injection run records and repeated request tests |
| G08 Access | User B cannot retrieve User A's project/job/media or approve its revision | Authenticated negative tests against real API/storage access |
| G09 Financial behavior | Accepted job reserves test units once; identical request retry reuses job; settlement/refund cannot duplicate | Ledger assertions under concurrent requests and worker replay |
| G10 Mobile web | Complete source-to-export on iOS Safari and Android Chrome with usable keyboard/touch controls | Device/browser checklist and recordings |
| G11 Native feasibility | Same person sees same job/output on Android and iPhone; background/resume and save/share work | Development-build device checks; untested platforms remain explicitly pending |
| G12 Performance | Suggested initial target: 30-second run under 5 minutes from job start on named worker | Stage timings over at least ten repeat runs; report median/max and queue wait separately |
| G13 Costs | Per-run costs and retry/cache effects documented; proposed batch cap observed | Usage report; distinguish local allocation, quoted usage and invoiced provider cost |

Ten runs are a diagnostic sample, not evidence of a long-term 95% success SLA or a reliable p95. A failed gate produces a fix/retest task; do not broaden scope to conceal an unresolved core problem.

## 5. Deliberate failure/revision exercises

| Exercise | Expected behavior |
|---|---|
| Double-tap Generate / resend same idempotency key | One accepted application job and one reservation |
| Reuse key with a different revision/body | Explicit conflict; no second paid action |
| Edit current project while older revision renders | Old render remains tied to old revision; new preview marked stale |
| Resume a draft changed on another device | Preserve local text and show compare/reapply decision |
| Text provider returns unknown template, invalid references or extra executable field | Reject/repair within budget; never execute field contents |
| Narration exceeds duration | Ask for review/rewrite before final encode; no truncation |
| Pronunciation alias differs from written caption | Align deliberately or require review; don't silently substitute incorrect words |
| Caption confidence is poor | Review state, not an apparently successful ready export |
| Provider timeouts after possible billing | Reconciliation/manual outcome; no blind paid loop |
| Crash after narration upload but before stage completion | Reuse verified artifact on recovery |
| Storage write fails after provider succeeds | Retain/retry storage without repeating paid generation |
| Cancellation mid-stage | Stop subsequent stages; communicate already incurred work accurately |
| Wrong account requests artifact download | Deny even if artifact ID is known |
| Mobile app is suspended while rendering | Server continues; foreground refresh obtains real status |

## 6. Test modes and prerequisites

| Mode | Purpose | Required configuration |
|---|---|---|
| Fixture | Contract/layout/render iteration without paid calls | Node/media toolchain and bundled fonts; no production secrets |
| Local inference | Real narration/alignment | Pinned Python/model/phonemizer dependencies and measured CPU/GPU environment |
| Live text generation | Evaluate idea/script/storyboard behavior | Approved provider key/model, suitable data terms and configured spend cap |
| Deployed integration | Test account isolation and cross-platform access | Supabase project, private media store, API/worker deployments, redirect/deep-link setup |
| Native development | Test import/playback/save/resume | Expo development build, device access and signing setup as applicable |

P0's application and rendering dependencies are pinned in the repository lockfile; model/inference versions remain future P1/P2 work. Templates use bundled local Inter font assets with their OFL license. Keep `.env` files out of version control and separate development from production data. Default to fixture mode and synthetic/authored material.

Proposed initial online-provider ceiling: US$5 total for an explicitly enabled test batch, configurable downward. This is a future test guardrail, not a charge incurred by this document. An estimate exceeding the remaining cap blocks dispatch. Local/cloud machine cost is recorded separately. Stop and report if credentials, provider suitability or hardware prevents a live gate; do not label fixtures as a live pass.

## 7. Benchmark/evidence record

Create one row per run with:

`run ID, timestamp, mode, source/script/storyboard/brand revisions, model/voice/template versions, machine specs, queue wait, stage durations, accepted duration, cache hits, retries, API cost, compute allocation, output size/hash, validation outcome, human correction minutes, quality score, failure reason`.

Suggested evidence layout once execution starts:

```text
prototype-results/<run-id>/
  input-manifest.json
  runtime-manifest.json
  metrics.json
  validation.json
  captions.srt
  contact-sheet.png
  thumbnail.jpg
  output.mp4
  review.md
```

Do not commit raw customer material, secrets or large generated media by default. Keep durable private storage references and sanitized evidence in the repository when appropriate.

## 8. Completion definition and next build

The complete prototype passes G01–G13 or records a specific unresolved gate before release decisions. A missing iPhone test is a pending iOS gate, not evidence that Android implies iOS success. Performance and cost remain provisional until tested on the intended deployment.

After technical/experience acceptance, expand to the remaining V1 templates, durations and creation screens, then conduct paid-use validation. This prototype does not justify pricing or profitability by itself.

P0 implementation is available, with measured evidence recorded separately. P1 is the next production increment after P0 review. A final domain, final name, real customer billing and agency features are not prerequisites for those local production tests.
