import type { Metadata } from 'next';
import { uberStoryboard } from '@aivideos/video/data';
import UberPreview from './uber-preview';

export const metadata: Metadata = {
  title: 'Uber-style system design test | Video Studio',
  description:
    'A separate, silent authored prototype explaining a simplified ride-hailing architecture.',
};

export default function UberPrototypePage() {
  return <UberPreview storyboard={uberStoryboard} />;
}
