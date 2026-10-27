# Optional ElevenLabs narration — implementation and verification

Date: October 27, 2026 (Asia/Calcutta).

The existing five-scene authored fixture now has an optional narration path using the user's configured male Indian ElevenLabs voice ID. This is a bounded implementation alongside silent P0, rather than completion of all P1 or full-prototype acceptance gates. The original narration text, planning schema and fixture are unchanged. Captions, word alignment and SRT are not implemented. The planning blueprint's original Kokoro choice remains historical; this explicitly requested increment uses ElevenLabs only.

## Provider execution and measured narration

The successful `npm run narration:generate` execution used the updated configured male voice for all five authored scenes, with `eleven_multilingual_v2` and `mp3_44100_128`. The current ignored `prototype-results/narrated/generation-report.json` records **five** text-to-speech requests, **five** generated clips, no cache hits on that generation and **zero automatic retries**. The exact narration text is preserved. Monetary charges/credits used were not returned by the endpoint and are not inferred.

| Scene | Measured MP3 duration | Mean PCM signal level |
| --- | --- | --- |
| `scene_hook` | 3.944490 seconds | −24.085 dBFS |
| `scene_result` | 6.295510 seconds | −24.580 dBFS |
| `scene_steps` | 5.851429 seconds | −24.046 dBFS |
| `scene_action` | 6.817959 seconds | −24.475 dBFS |
| `scene_recap` | 4.440816 seconds | −24.328 dBFS |

The shared measured timeline is **900 frames / 30.000 seconds** at 30 fps, inside the 27–33 second target, with no timing issue reported. Audio hashes, full decoding and non-silent PCM levels were validated. The ignored `cache-reuse-check.json` separately records **five valid cache hits and zero provider requests**, demonstrating local reuse. No silent or artificial narration was substituted.

The initial attempt with the prior voice remains a separate historical failure: one `scene_hook` POST was rejected with **HTTP 402**, no audio was received and the other four scenes were not requested. Its safe category was unspecified; its exact account/credit/voice-permission cause was not established. The failed report is preserved as `generation-report-initial-http402.json`, and its hashed attempt journal remains blocked from automatic retry. A later authorized read-only access check made two metadata requests and no speech-generation requests. Across the recorded work there were six generation POST attempts: one rejected historical attempt and five successful requests with the updated voice. Neither credential nor voice ID appears in the sanitized reports.

## Narrated export result

`npm run prototype:render:narrated` exported `prototype-results/narrated/output.mp4`, and the separate narrated media inspector passed. The ignored `validation.json`, `encoding-report.json` and `runtime-manifest.json` establish the following reference:

| Property | Recorded result |
| --- | --- |
| File size | 1,495,316 bytes |
| SHA-256 | `346af598165e75ccb11e79d6b2c46466372f7f4e027d7c0b19abced59981209c` |
| Container / video codec | MP4 / H.264 |
| Visible dimensions | 1080 × 1920 |
| Frame rate / count | 30 fps / 900 decoded frames |
| Duration | 30.000 seconds |
| Audio | AAC, 48 kHz, stereo |
| Pixel format | `yuv420p` |
| Local export time | 123.613 seconds, including 108.933 seconds rendering |
| Provider calls during render | 0 |

The inspector fully decoded the video and audio, verified current source/input hashes, checked that every measured clip fits its scene with complete decoded sample coverage, and found audible signal in every scene. The exported audio correlated with each original MP3 waveform above 0.99996, with measured alignment lag of 0–0.375 ms. No narration was truncated to reach the target runtime.

The narrated decoded scene contact sheet, all four transition pairs and maximum-length stress contact sheet were visually inspected; they retained the expected layouts and fade behavior without cropped content. This is sampled visual inspection. Human listening, pronunciation/intelligibility review and physical-device compatibility are not established. Silent P0 remains a separately labelled output.

## Commands and behavior

From the npm workspace root, with Node.js 22:

```powershell
npm run narration:generate
npm run prototype:render:narrated
npm run prototype:inspect:narrated
npm run dev
```

The generator alone reads `ELEVENLABS_API_KEY` and `MALE_INDIAN_VOICE_KEY` from `apps/web/.env.local` and makes paid calls. `MALE_INDIAN_VOICE_KEY` is the ElevenLabs voice ID. Opening `/prototype?mode=narrated`, building, rendering and inspecting are offline with respect to paid providers. `/prototype` and `npm run prototype:render` preserve silent P0 at `prototype-results/p0/output.mp4`.

The narrated output location is `prototype-results/narrated/output.mp4`, with separate input/runtime manifests, measured audio report, encoding verification, scene images, decoded MP4 and transition contact sheets. MP3s are cached under `prototype-results/narration/cache/`, keyed by exact narration text, voice identity, model and settings. The generator verifies hashes, full decode, PCM signal level and duration before reuse. The web and CLI validate fixture text and audio hashes; invalid/missing media causes an explicit error.

Timing uses whole frames, a 100 ms scene lead, measured clip duration rounded up, and a 200 ms tail. Spare visual holds can move between scenes to keep 30 seconds. Speech is never trimmed or accelerated; an unavoidable total above 33 seconds produces an explicit timing issue. The manifest contains only sanitized local media metadata. Generated audio and reports are ignored by Git.

After serving a production build on port 3100:

```powershell
npm run prototype:check-web
npm run prototype:check-web:narrated
```

The narrated inspector requires AAC, full video/audio decoding, sufficient signal in every scene, alignment of exported audio with each original MP3 waveform, current input hashes, expected duration/frame count and enough time for every clip. Its decoded contact sheets sample the actual MP4 on both sides of transitions. The browser checker verifies all five scene seeks, audio media readiness, playback advancement, volume/mute controls, continuous transitions, no overlapping speech elements, local-only network traffic and desktop/narrow viewports. These checks are recorded separately from generation; headless media playback does not establish human listening or physical-device compatibility.

## Repository verification

- `npm run check` passed formatting, ESLint, TypeScript, **39 tests** (9 cache/PCM, 20 contracts, 10 video/timeline) and generated-contract synchronization. TSX processes required execution outside the Windows sandbox because `uv_os_get_passwd` failed with `ENOMEM` inside it.
- `npm run build` passed. The `/prototype` route reads local generated metadata server-side on demand.
- `npm run prototype:render` passed and ran complete P0 media inspection. The separately labelled silent MP4 remains 1080×1920 H.264, 30 fps, 900 frames / 30 seconds, no audio stream. Its SHA-256 is unchanged from the original P0 reference: `cd840c544fd5bcda76f2fe0ef5f8362f6c8fd77dad2d1eaa48e581fbc1f660dc`.
- The final P0 MP4's decoded scene and transition contact sheets, plus stress contact sheet, were visually inspected. Five scenes and all four transitions retained their expected layouts and fade behavior. This is sampled visual inspection.
- `npm run prototype:check-web` passed all five scene seeks, playback and layout checks at 1440×1000, 390×844 and 320×740 against the production server.
- `npx tsx scripts/narrated-web-check.ts --expect-unavailable` passed at desktop and 390 px width: an accurate unavailable alert, no Player or audio substitution, working Silent P0 mode link, no horizontal overflow, and only local network requests. Its screenshot was visually inspected.
- Before successful generation, `npm run prototype:render:narrated` was checked to reject missing real audio and leave no narrated MP4. After generation it exported successfully and passed all narrated automated media checks, as recorded above.
- `npm run prototype:check-web:narrated` passed at 1440×1000, 390×844 and 320×740: all five scene seeks and measured audio sources, actual audio/frame advancement, volume/mute controls, continuous desktop playback across all five scenes without overlapping clips, and local-only network requests. The checker now waits for real audio/frame readiness instead of a fixed cold-start delay. The narrated Player holds the last frame after playback; silent P0 keeps its prior reset behavior. Screenshots were visually inspected. Headless Chromium output is muted by its launcher, so human listening remains a separate check.
- An offline FFmpeg/FFprobe capability check passed, including PCM decoding and signal measurement. A scan of all 15 production browser assets and both preview HTTP responses found neither configured credential value. No values were printed.

No planning schema or authored fixture changed; planning type regeneration was not needed. No new runtime dependency was introduced. The narration scripts do not import into client bundles. Credentials and generated media remain ignored by Git.
