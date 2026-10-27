import type { Metadata } from 'next';
import PrototypePreview from './prototype-preview';
import { loadPrototypeNarration } from '@/lib/prototype-narration';

export const metadata: Metadata = {
  title: 'Storyboard preview | Video Studio',
  description: 'Authored storyboard preview with silent P0 and locally generated narration modes.',
};

export default async function PrototypePage({
  searchParams,
}: {
  searchParams: Promise<{ mode?: string | string[] }>;
}) {
  const mode = (await searchParams).mode === 'narrated' ? 'narrated' : 'silent';
  const result =
    mode === 'narrated'
      ? await loadPrototypeNarration()
      : { narration: undefined, error: undefined };
  return (
    <PrototypePreview mode={mode} narration={result.narration} narrationError={result.error} />
  );
}
