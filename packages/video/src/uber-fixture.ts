import { validateStoryboard } from '@aivideos/contracts';
import source from '../../../docs/step-1/fixtures/uber/source.fixture.json';
import storyboard from '../../../docs/step-1/fixtures/uber/storyboard.fixture.json';

const result = validateStoryboard(storyboard, [source]);
if (!result.success) {
  throw new Error(`The authored Uber-style fixture is invalid: ${result.errors.join('; ')}`);
}

/** Separate educational test data; the planning fixture remains the P0 default. */
export const uberStoryboard = result.data;
export const uberSource = source;
