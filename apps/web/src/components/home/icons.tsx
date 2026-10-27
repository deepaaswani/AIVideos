import type { ReactNode } from 'react';

const paths: Record<string, ReactNode> = {
  arrow: <path d="M5 12h14M13 6l6 6-6 6" />,
  northeast: <path d="M6 18 18 6M6 6h12v12" />,
  play: <path d="m9 5 11 7-11 7Z" />,
  spark: (
    <>
      <path d="m12 3 2.5 6.5L21 12l-6.5 2.5L12 21l-2.5-6.5L3 12l6.5-2.5Z" />
      <path d="m20 2 .5 1.5L22 4l-1.5.5L20 6l-.5-1.5L18 4l1.5-.5Z" />
    </>
  ),
  check: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="m8 12 3 3 5-6" />
    </>
  ),
  bulb: (
    <>
      <path d="M8 16c0-3-3-3.5-3-7a7 7 0 0 1 14 0c0 3.5-3 4-3 7ZM9 20h6M10 23h4M12 7v5" />
    </>
  ),
  script: (
    <>
      <rect x="5" y="3" width="14" height="18" rx="3" />
      <path d="M9 8h6M9 12h6M9 16h3" />
    </>
  ),
  film: (
    <>
      <rect x="3" y="6" width="18" height="15" rx="3" />
      <path d="M3 10h18M7 2l3 4M14 2l3 4M9 14l6 3-6 3Z" />
    </>
  ),
  upload: <path d="M12 15V3m-4 4 4-4 4 4M5 12v7a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-7" />,
  grid: (
    <>
      <rect x="3" y="3" width="7" height="7" rx="2" />
      <rect x="14" y="3" width="7" height="7" rx="2" />
      <rect x="3" y="14" width="7" height="7" rx="2" />
      <path d="M17.5 14v7M14 17.5h7" />
    </>
  ),
  mic: (
    <>
      <rect x="9" y="2" width="6" height="13" rx="3" />
      <path d="M5 10v2a7 7 0 0 0 14 0v-2M12 19v3M8 22h8" />
    </>
  ),
  captions: (
    <>
      <rect x="2" y="5" width="20" height="14" rx="3" />
      <path d="M10 10a3 3 0 1 0 0 4M19 10a3 3 0 1 0 0 4" />
    </>
  ),
  menu: <path d="M5 7h14M5 12h14M5 17h14" />,
  close: <path d="m6 6 12 12M18 6 6 18" />,
  book: <path d="M12 5v16M12 5C9 2 4 3 2 4v15c3-1 7-1 10 2 3-3 7-3 10-2V4c-2-1-7-2-10 1Z" />,
  cpu: (
    <>
      <rect x="6" y="6" width="12" height="12" rx="3" />
      <path d="M9 2v4m6-4v4M9 18v4m6-4v4M2 9h4m-4 6h4m12-6h4m-4 6h4M10 10h4v4h-4Z" />
    </>
  ),
  drops: (
    <>
      <path d="M12 3S5 10 5 14a7 7 0 0 0 14 0c0-4-7-11-7-11Z" />
      <path d="M9 14a3 3 0 0 0 3 3" />
    </>
  ),
};

export function Icon({ name, size = 20 }: { name: string; size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {paths[name] ?? paths.spark}
    </svg>
  );
}
