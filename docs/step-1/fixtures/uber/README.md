# Uber-style system design test

This independent authored fixture explains a simplified ride-hailing architecture in five scenes: the rider request, nearby-driver discovery, dispatch and acceptance, trip state/events, and reliable payments. Its 30-second timing is estimated. The original planning storyboard, narration cache and exported MP4 remain separate.

- `storyboard.fixture.json` contains the new test storyboard, with its own project, source and scene IDs.
- `source.fixture.json` provides authored source blocks and primary-source URLs for every scene.
- `/prototype/uber` is the separate playable silent preview. The existing `/prototype` and `/prototype?mode=narrated` routes keep their planning fixture.

From the workspace root:

```powershell
python -m pip install -r requirements-dev.txt
npm run validate:planning:uber
npm run dev
```

Open [the Uber test preview](http://localhost:3000/prototype/uber). Against a production server on port 3100, run `npm run prototype:check-web:uber` to check all scenes, playback and responsive layouts. Its reports/screenshots are isolated in ignored `prototype-results/uber-preview/`.

This test has no generated narration, synchronized captions, SRT or exported MP4. Opening it makes no provider requests. Existing render/narration commands continue to target the original planning prototype; this addition does not replace that fixture or its media.

The content is an original educational summary informed by these public Uber Engineering posts:

- [Fulfillment platform rearchitecture](https://www.uber.com/us/en/blog/fulfillment-platform-rearchitecture/) — intent, offers, lifecycle state and events.
- [Fulfillment platform storage](https://www.uber.com/us/en/blog/building-ubers-fulfillment-platform/) — location updates, trip actions and transactional consistency.
- [H3](https://www.uber.com/us/en/blog/h3/) — geographic grids for marketplace analysis and dispatch.
- [DeepETA](https://www.uber.com/us/en/blog/deepeta-how-uber-predicts-arrival-times/) — arrival estimates used in matching.
- [Payments platform](https://www.uber.com/mx/en/blog/payments-platform/) — idempotency, consistency and auditability.

The app/backend boundary and spatial-index lookup are simplified teaching choices. The fixture does not claim to reproduce Uber's current production architecture, its precise nearby-driver index, full dispatch algorithm, traffic scale or complete payment lifecycle.

## Verification

On October 27, 2026, both planning validators passed their selected fixtures and rejected all 12 malformed cases each. `npm run check` passed all 40 tests, and `npm run build` included `/prototype/uber`. The Uber browser check passed all five scene seeks, playback, font/text bounds and responsive layouts at 1440×1000, 390×844 and 320×740; the screenshots were visually inspected. The original silent and narrated browser checks also passed after this addition. The original storyboard/source files and both existing MP4 exports retain their prior SHA-256 hashes. No provider requests were made for the Uber test. These checks cover a silent browser preview, not a new exported video or narrated timing.
