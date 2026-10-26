import { validateStoryboard } from '@aivideos/contracts';
import fixture from '../../../../docs/step-1/fixtures/storyboard.fixture.json';

export default function Home() {
  const result = validateStoryboard(fixture);
  if (!result.success) {
    throw new Error('The checked-in storyboard fixture is invalid.');
  }

  return (
    <main>
      <header>
        <span className="mark" aria-hidden="true">
          V
        </span>
        <span>Video Studio</span>
        <span className="badge">Development</span>
      </header>
      <section className="intro" aria-labelledby="title">
        <p className="eyebrow">AIVideos / project foundation</p>
        <h1 id="title">From source to storyboard.</h1>
        <p className="lede">
          The project foundation is ready. The next milestone is a controlled video render from the
          approved storyboard fixture.
        </p>
      </section>
      <section className="panel" aria-labelledby="fixture-title">
        <div className="panel-heading">
          <p className="eyebrow">Validated planning fixture</p>
          <span className="status">Contract valid</span>
        </div>
        <h2 id="fixture-title">{result.data.title}</h2>
        <dl>
          <div>
            <dt>Scenes</dt>
            <dd>{result.data.scenes.length}</dd>
          </div>
          <div>
            <dt>Planned duration</dt>
            <dd>{result.data.targetDurationSeconds} seconds</dd>
          </div>
          <div>
            <dt>Format</dt>
            <dd>Vertical · 9:16</dd>
          </div>
        </dl>
        <p className="note">
          This is authored sample data. Video rendering, narration, accounts, and generation are
          still to be implemented.
        </p>
      </section>
      <footer>
        <span>Next.js web · Shared TypeScript contracts</span>
        <a href="/api/v1/health">API health</a>
      </footer>
    </main>
  );
}
