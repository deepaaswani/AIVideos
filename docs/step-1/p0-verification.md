# P0 verification — controlled silent visual render

Date: October 27, 2026 (Asia/Calcutta).  
Status: P0 implementation, automated media inspection, sampled visual inspection and responsive Chromium checks completed. The complete prototype's acceptance gates remain pending.

This records the bounded P0 result from the [prototype plan](prototype-plan.md). It covers the authored five-scene fixture, the controlled `Title`, `Process` and `Recap` templates, the shared web preview and a local silent export. It does not establish the narrated production pipeline or the full G01–G13 acceptance gates.

## Reference artifact

The generated reference output is `prototype-results/p0/output.mp4`. This directory is ignored by Git; generated video, images and machine reports are not committed. The reference below identifies the inspected output without including machine-specific paths.

| Property | Recorded result |
| --- | --- |
| Size | 751,633 bytes |
| SHA-256 | `cd840c544fd5bcda76f2fe0ef5f8362f6c8fd77dad2d1eaa48e581fbc1f660dc` |
| Container / video codec | MP4 / H.264 |
| Visible dimensions | 1080 × 1920, vertical 9:16 |
| Frame rate / count | 30 fps / 900 decoded frames |
| Duration | 30.000 seconds |
| Pixel format / color space | `yuv420p` / `bt709` |
| Audio | No audio stream; deliberately silent |
| Rendering mode | `silent-authored-fixture` |

The inspector validated the storyboard against the supplied source-block index, matched the recorded render inputs to current source hashes, checked media metadata and decoded the complete MP4 with errors treated as failures. Stale-export rejection was also tested: inspection rejects an export whose recorded input hashes no longer match current inputs.

The ignored evidence package includes `input-manifest.json`, `runtime-manifest.json`, `validation.json`, `encoding-report.json`, `preview-frames.json`, the MP4, a thumbnail, authored-frame contact sheet, decoded-MP4 contact sheet and maximum-length stress frames. Reproduce and inspect the output from the repository root:

```powershell
npm run prototype:render
npm run prototype:inspect
```

## Visual inspection

Codex visually inspected the authored-frame contact sheet, the contact sheet extracted from the actual final MP4 and the stress contact sheet. The reviewed frames showed all five scenes and all three template families without cropped text or diagrams. This is sampled visual inspection, not a human publishing approval or a complete real-time playback review.

| Scene | Template | Reviewed frame |
| --- | --- | --- |
| `scene_hook` | Title | 45 |
| `scene_result` | Process | 195 |
| `scene_steps` | Process | 375 |
| `scene_action` | Process | 585 |
| `scene_recap` | Recap | 795 |

The stress fixture uses unbroken wide `W` glyphs at the schema maximum: a 54-character title, 50-character visual items and a 60-character brand name. The inspected Title, Process and Recap stress frames fit without cropping. These checks cover the supplied inputs and those stress cases; they are not proof that every possible brand, glyph or content combination will fit.

## Code and build verification

- Clean `npm ci` completed successfully.
- `npm run check` passed, including 25 automated tests and generated-contract synchronization.
- `npm run validate:planning` passed the authored fixture and rejected all 12 malformed planning cases.
- `npm run build` passed and included the `/prototype` route.

The automated tests cover fixture/source validation and frame scheduling, including cumulative rounding, contiguous scene boundaries and invalid timing inputs. The preview and CLI share the same video composition and bundled font.

## Local run measurement

The final reference run started at approximately 01:57:26 and completed export at 01:59:23 on October 27, 2026, Asia/Calcutta. Automated media inspection completed at approximately 01:59:29.

| Item | Recorded value |
| --- | --- |
| Runtime | Node.js 22.14.0; Remotion 4.0.539 |
| Host | Windows x64; Intel Core i5-1135G7; 8 logical CPUs; 16 GiB memory |
| Render concurrency | 2 |
| Bundle time | 3.265 seconds |
| MP4 render time | 105.150 seconds |
| Preview/stress image generation | 6.586 seconds |
| Total export time | 116.656 seconds |
| Provider calls | 0 |
| Hosted-provider cost recorded | USD 0 |

This is one local run, not a ten-run performance benchmark or a deployment throughput result. Local compute was used; its monetary allocation was not measured. The export timing excludes the subsequent media inspection.

## Responsive preview verification

`npm run prototype:check-web` passed against the production build at 1440 × 1000, 390 × 844 and 320 × 740 Chromium viewports. At each size, all five scene buttons selected the correct authored content and active state; Play/Pause controls worked, the bundled font loaded, actual text ranges fit the scene safe area, and the page had no horizontal overflow. Desktop and both narrow-screen screenshots were also inspected. The check accounts for visible font overhang instead of treating a larger scroll-height metric as clipping. The detailed measurements and screenshots are in ignored `web-check.json` and `web-*.png` files.

These are headless Chromium viewport checks, not physical Android/iPhone or Safari verification. They also do not establish the full source-to-export mobile workflow in G10.

## Remaining verification

P1 must add intelligible narration, measured scene audio, AAC output and synchronized captions/SRT. Paid providers were not invoked. Physical Android/iPhone testing, durable jobs, access control, recovery and financial behavior, ten-run performance/cost measurements, and the remaining full-prototype gates have not been established by P0.
