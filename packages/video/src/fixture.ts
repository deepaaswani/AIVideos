import { validateStoryboard } from '@aivideos/contracts';
import source from '../../../docs/step-1/fixtures/source.fixture.json';
import storyboard from '../../../docs/step-1/fixtures/storyboard.fixture.json';

const result = validateStoryboard(storyboard, [source]);
if (!result.success) {
  throw new Error(`The authored P0 fixture is invalid: ${result.errors.join('; ')}`);
}

/** Authored sample data; validation includes the actual source block index. */
export const fixtureStoryboard = result.data;
export const fixtureSource = source;
export const COMPOSITION_ID = 'P0Storyboard';
