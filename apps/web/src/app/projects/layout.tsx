import localFont from 'next/font/local';
const inter = localFont({
  src: [
    { path: '../fonts/inter-latin-400-normal.woff2', weight: '400' },
    { path: '../fonts/inter-latin-500-normal.woff2', weight: '500' },
    { path: '../fonts/inter-latin-600-normal.woff2', weight: '600' },
    { path: '../fonts/inter-latin-700-normal.woff2', weight: '700' },
  ],
  variable: '--font-studio',
  display: 'swap',
});
export default function ProjectLayout({ children }: { children: React.ReactNode }) {
  return <div className={inter.variable}>{children}</div>;
}
