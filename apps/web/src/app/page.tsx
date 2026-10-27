import type { Metadata } from 'next';
import localFont from 'next/font/local';
import Homepage from '@/components/home/homepage';
import { loadPrototypeNarration } from '@/lib/prototype-narration';

const inter = localFont({
  src: [
    { path: './fonts/inter-latin-400-normal.woff2', weight: '400', style: 'normal' },
    { path: './fonts/inter-latin-500-normal.woff2', weight: '500', style: 'normal' },
    { path: './fonts/inter-latin-600-normal.woff2', weight: '600', style: 'normal' },
    { path: './fonts/inter-latin-700-normal.woff2', weight: '700', style: 'normal' },
    { path: './fonts/inter-latin-800-normal.woff2', weight: '800', style: 'normal' },
  ],
  variable: '--font-home',
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'Video Studio | From brief to brilliant video',
  description:
    'A thoughtful studio for educational videos. Explore storyboards, natural narration and motion that makes ideas clear.',
};

export default async function Home() {
  const result = await loadPrototypeNarration();
  return <Homepage className={inter.variable} narration={result.narration} />;
}
