# Repository guidance

## Product and scope

- Use `docs/PRD.md` as the V1 product baseline and `docs/step-1/README.md` for the pipeline blueprint. V1 accounts are individual; agency collaboration belongs to V2.
- P0's controlled fixture renderer is implemented. Describe measured results using `docs/step-1/p0-verification.md`; P1 narration/captions and later increments remain pending. P0 does not establish full prototype acceptance.
- Preserve existing planning documents unless the task calls for a documentation change.

## Architecture

- Use the npm workspace root for dependency installation and shared commands. The runtime baseline is Node.js 22.
- Keep responsive web UI and initial versioned API routes in `apps/web`; keep shared schemas, validation and generated types in `packages/contracts`.
- Keep reusable Remotion templates and timeline calculations in `packages/video`. The web Player and command-line renderer use the same composition and source-validated authored fixture. Preserve the explicit silent-test label.
- The canonical prototype schema is `docs/step-1/contracts/storyboard.schema.json`. Regenerate types with `npm run contracts:generate` after schema changes; do not edit generated types manually.
- Keep application rules independent of route handlers. Future native clients share contracts and APIs, not DOM components.
- Run long video production and inference in workers, not browser requests. Model output is structured data for controlled templates, never executable rendering code.
- Keep provider/admin credentials on the server. Do not commit secrets, customer material or large generated media. Provider calls and publishing require authorization within the task scope.

## Validation

- Before handing off code changes, run `npm run check` and `npm run build` when applicable. Report any checks that could not run and why.
- When changing the planning schema or fixtures, also run `npm run validate:planning` after installing `requirements-dev.txt`.
- Add focused tests for meaningful behavior or regressions; do not duplicate implementation details in tests.
- Keep the lockfile synchronized with dependency changes and use `npm ci` for a clean installation.
- After template/timeline/render changes, run `npm run prototype:render`, inspect the exported MP4 and contact sheets, and record actual evidence. `npm run prototype:inspect` rejects stale input hashes and validates the full MP4; `--images-only` is layout iteration, not video verification. Keep generated media in ignored `prototype-results/`.
