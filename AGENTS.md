# Repository guidance

## Product and scope

- Use `docs/PRD.md` as the V1 product baseline and `docs/step-1/README.md` for the pipeline blueprint. V1 accounts are individual; agency collaboration belongs to V2.
- This repository currently contains a development foundation. Describe planned functionality and measured results accurately. The next implementation milestone is the P0 controlled fixture renderer.
- Preserve existing planning documents unless the task calls for a documentation change.

## Architecture

- Use the npm workspace root for dependency installation and shared commands. The runtime baseline is Node.js 22.
- Keep responsive web UI and initial versioned API routes in `apps/web`; keep shared schemas, validation and generated types in `packages/contracts`.
- The canonical prototype schema is `docs/step-1/contracts/storyboard.schema.json`. Regenerate types with `npm run contracts:generate` after schema changes; do not edit generated types manually.
- Keep application rules independent of route handlers. Future native clients share contracts and APIs, not DOM components.
- Run long video production and inference in workers, not browser requests. Model output is structured data for controlled templates, never executable rendering code.
- Keep provider/admin credentials on the server. Do not commit secrets, customer material or large generated media. Provider calls and publishing require authorization within the task scope.

## Validation

- Before handing off code changes, run `npm run check` and `npm run build` when applicable. Report any checks that could not run and why.
- When changing the planning schema or fixtures, also run `npm run validate:planning` after installing `requirements-dev.txt`.
- Add focused tests for meaningful behavior or regressions; do not duplicate implementation details in tests.
- Keep the lockfile synchronized with dependency changes and use `npm ci` for a clean installation.
