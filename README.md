# AIVideos

The repository foundation for AI Educational Video Studio: a product for creating editable, branded educational videos from a person's source material. The final product name remains undecided.

This base provides a responsive Next.js development shell, a versioned health endpoint, shared storyboard validation and generated TypeScript contracts. The production pipeline, authentication, persistent storage, native apps and provider integrations remain implementation milestones.

## Run locally

Use Node.js 22 (22.14.0 or later) and npm 10 or later. From the repository root:

```powershell
npm ci
npm run dev
```

Open [localhost:3000](http://localhost:3000). The development health endpoint is [localhost:3000/api/v1/health](http://localhost:3000/api/v1/health). No environment variables or provider keys are required for this base.

For a production build and local server:

```powershell
npm run build
npm run start
```

## Repository layout

| Path                 | Purpose                                                               |
| -------------------- | --------------------------------------------------------------------- |
| `apps/web`           | Next.js responsive web shell and initial `/api/v1` endpoints          |
| `packages/contracts` | Ajv storyboard validation and generated TypeScript types              |
| `docs`               | Approved product direction, architecture, prototype plan and fixtures |

The planned architecture adds Expo Android/iOS clients and durable Remotion/FFmpeg production workers. Clients share contracts and application rules; video rendering belongs in workers. Add packages and services when their implementation begins.

Framework setup reference: [Next.js installation documentation](https://nextjs.org/docs/app/getting-started/installation).

The canonical prototype storyboard schema and supplied source/storyboard fixtures currently live in [`docs/step-1`](docs/step-1/README.md). The contracts package consumes that schema; keep generated types synchronized when it changes.

## Verify changes

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

## Product direction and next milestone

Read the [V1 PRD](docs/PRD.md), [cross-platform implementation plan](docs/cross-platform-implementation-plan.md) and [Step 1 technical blueprint](docs/step-1/README.md). The [agency addendum](docs/PRD-V2-agency.md) describes later V2 scope; V1 accounts remain individual.

The next implementation milestone is [P0: the controlled fixture render](docs/step-1/prototype-plan.md): five scenes, three template families and one 30-second vertical video. Fixture audio or an intentionally silent visual test must be labelled accurately. Live narration and generation follow after the deterministic rendering path can be inspected.

Keep provider secrets, customer source material and generated media out of Git. Commit sanitized evidence and reproducible inputs when useful; store large outputs separately.
