# AIVideos

The repository foundation for AI Educational Video Studio: a product for creating editable, branded educational videos from a person's source material. The final product name remains undecided.

The repository provides a Next.js web shell, shared storyboard contracts, and the P0 controlled visual renderer: reusable Remotion Title, Process, and Recap templates driven by the authored fixture. Individual Supabase accounts and the Gemini-powered Idea workspace are implemented. Durable video production jobs, native apps, storyboard generation and publishing remain later milestones. See [Idea workspace setup and verification](docs/idea-workspace.md).

## Run locally

Use Node.js 22 (22.14.0 or later) and npm 10 or later. From the repository root:

```powershell
npm ci
npm run dev
```

Open [localhost:3000/prototype](http://localhost:3000/prototype) for the responsive, seekable silent preview. The health endpoint is [localhost:3000/api/v1/health](http://localhost:3000/api/v1/health). No provider keys are required.

For a production build and local server:

```powershell
npm run build
npm run start
```

## Repository layout

| Path                     | Purpose                                                                            |
| ------------------------ | ---------------------------------------------------------------------------------- |
| `apps/web`               | Next.js responsive web shell and initial `/api/v1` endpoints                       |
| `packages/contracts`     | Ajv storyboard validation and generated TypeScript types                           |
| `packages/video`         | Reusable Remotion composition, controlled templates, timeline logic and local font |
| `scripts/prototype-*.ts` | Command-line rendering, media inspection and evidence reports                      |
| `docs`                   | Approved product direction, architecture, prototype plan and fixtures              |

The planned architecture adds Expo Android/iOS clients and durable Remotion/FFmpeg production workers. Clients share contracts and application rules; video rendering belongs in workers. Add packages and services when their implementation begins.

Framework setup reference: [Next.js installation documentation](https://nextjs.org/docs/app/getting-started/installation).

The canonical prototype storyboard schema and supplied source/storyboard fixtures currently live in [`docs/step-1`](docs/step-1/README.md). The contracts package consumes that schema; keep generated types synchronized when it changes.

## Render P0

```powershell
npm run prototype:render
npm run prototype:inspect
```

The renderer validates the storyboard and actual source-block references, then exports an H.264 MP4 at 1080×1920, 30 fps, using the fixture's 900-frame timeline. This P0 mode remains deliberately silent with no audio track. Optional measured narration is described below; captions and SRT remain pending.

Outputs go to ignored `prototype-results/p0/`; repeated runs overwrite the same paths. The directory contains `output.mp4`, scene stills, a thumbnail, fixture/stress/decoded contact sheets, input/runtime manifests, encoding metadata, artifact hashes, and validation/timing reports. `prototype:inspect` checks tracked input hashes, completed export status, media properties, and full video decoding; it fails for stale inputs, an incomplete run, or invalid media. Visual review is recorded separately in [P0 verification](docs/step-1/p0-verification.md).

For image iteration without rendering or validating an MP4:

```powershell
npm run prototype:render -- --images-only
```

This records an `images-only` runtime status and cannot pass the complete media inspection, even if an older MP4 remains in the directory.

The CLI uses an existing Chrome installation when available, otherwise Remotion can download its browser. Set `REMOTION_BROWSER_EXECUTABLE` to select a browser executable. `P0_CONCURRENCY` accepts integers 1–8 and defaults to 2. The first browser download requires network access.

Templates use a local Inter font from `@fontsource/inter` 5.3.0 under the included OFL license. `predev` and `prebuild` copy the canonical `packages/video/public` assets to the web public directory; rendering reads the canonical assets directly.

To repeat the responsive browser checks, serve a production build on port 3100:

```powershell
npm run build
node node_modules/next/dist/bin/next start apps/web --port 3100 --hostname 127.0.0.1
```

In another terminal, run `npm run prototype:check-web`. It checks five-scene navigation, playback controls, loaded fonts and text bounds at desktop, 390 px and 320 px viewport widths. Reports and screenshots go to the ignored P0 directory. These are Chromium viewport checks; physical devices and Safari remain untested.

## Generate and render narration

The optional narrated fixture uses ElevenLabs for the same five scenes and preserves their exact narration text. Put `ELEVENLABS_API_KEY` and `MALE_INDIAN_VOICE_KEY` (the male Indian ElevenLabs **voice ID**) in `apps/web/.env.local`. These values stay in the command-line process; they are never passed to the Player. No Gemini, Runway or HeyGen configuration is used.

From the workspace root:

```powershell
npm run narration:generate
npm run prototype:render:narrated
npm run prototype:inspect:narrated
npm run dev
```

Open [the narrated preview](http://localhost:3000/prototype?mode=narrated). Generation is an explicit, potentially billed CLI operation; opening the preview, building and rendering make no provider requests. The regular `/prototype` route and `npm run prototype:render` retain the silent P0 mode.

Narrated exports and measured evidence go to ignored `prototype-results/narrated/`; the video is `output.mp4`. Per-scene MP3s and attempt journals live in ignored `prototype-results/narration/cache/`. Valid cached clips are reused after checking their identity, hashes, full decode, non-silence and duration. The generator sends at most one request for each of the five current scene/cache identities per run and stops on failure. A pending, failed, uncertain or damaged billed result is blocked from automatic regeneration. Preserve its journal and recover the original audio or reconcile the provider history before explicitly authorizing another attempt; deleting the cache can incur duplicate charges.

The shared composition uses actual measured clip durations, a 100 ms lead and a 200 ms tail. It reallocates scene holds to stay near 30 seconds where possible; it never cuts or accelerates speech to meet the 27–33 second target. A timing issue is reported if the required runtime exceeds that range. Missing or stale narration produces an unavailable state instead of a silent narrated preview. Captions, word alignment and SRT remain pending; the authored on-screen titles are not captions.

For production-browser verification, serve on port 3100 as above and run `npm run prototype:check-web:narrated`. This checks media readiness, transitions, playback and volume controls in Chromium; physical devices and human listening remain separate checks. See [narration verification](docs/step-1/narration-verification.md) for measured results and limitations.

## Verify changes

The separate [Uber-style system design test](docs/step-1/fixtures/uber/README.md) has its own `docs/step-1/fixtures/uber/storyboard.fixture.json` and source packet. Open `/prototype/uber` for its five-scene, 30-second silent preview. Validate it with `npm run validate:planning:uber`; its responsive browser check is `npm run prototype:check-web:uber`. The original silent/narrated previews and media remain separate.

```powershell
npm run check
npm run build
```

| Command                      | Purpose                                                                |
| ---------------------------- | ---------------------------------------------------------------------- |
| `npm run check`              | Run formatting, lint, type checks, tests and generated-contract checks |
| `npm run lint`               | Check source lint rules                                                |
| `npm run typecheck`          | Check TypeScript packages                                              |
| `npm run test`               | Run automated tests                                                    |
| `npm run format`             | Apply formatting                                                       |
| `npm run format:check`       | Check formatting without changing files                                |
| `npm run contracts:generate` | Regenerate TypeScript contracts from the canonical schema              |
| `npm run contracts:check`    | Verify generated contracts are current                                 |

The existing planning validator is a separate Python check. With Python 3.10 or later available:

```powershell
python -m pip install -r requirements-dev.txt
npm run validate:planning
```

It validates the planned fixture, source references and malformed cases. It does not establish rendering quality, audio timing, security isolation or production readiness.

The lockfile uses `sharp` 0.35.5 and a global Zod 4.6.7 override; its dependency audit reported zero advisories. That audit does not establish that embedded Zod copies in published Remotion bundles have been patched. P0 accepts authored fixtures rather than untrusted Studio payloads.

## Product direction and next milestone

Read the [V1 PRD](docs/PRD.md), [cross-platform implementation plan](docs/cross-platform-implementation-plan.md) and [Step 1 technical blueprint](docs/step-1/README.md). The [agency addendum](docs/PRD-V2-agency.md) describes later V2 scope; V1 accounts remain individual.

[P0](docs/step-1/prototype-plan.md) is implemented; consult [its verification record](docs/step-1/p0-verification.md) for the checks and visual inspection actually completed. The optional ElevenLabs narration implementation is documented [separately](docs/step-1/narration-verification.md). Five real male-voice clips have been generated, measured and cached for a 30-second narrated timeline; the verification record tracks export and preview evidence separately. Caption alignment and SRT remain pending. This bounded narration increment does not pass the full prototype's G01–G13 acceptance gates.

Keep provider secrets, customer source material and generated media out of Git. Commit sanitized evidence and reproducible inputs when useful; store large outputs separately.
