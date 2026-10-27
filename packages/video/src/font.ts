import { useEffect, useState } from 'react';
import { cancelRender, continueRender, delayRender, staticFile } from 'remotion';

let fontReady: Promise<void> | undefined;

function loadLocalFont(): Promise<void> {
  fontReady ??= new FontFace(
    'P0Sans',
    `url("${staticFile('prototype/fonts/inter-latin-600-normal.woff2')}")`,
    { weight: '600', style: 'normal' },
  )
    .load()
    .then(async (font) => {
      document.fonts.add(font);
      await document.fonts.ready;
    });
  return fontReady;
}

/** Keep browser previews and offline render frames on the same bundled font. */
export function useLocalFont() {
  const [handle] = useState(() =>
    typeof window === 'undefined' ? null : delayRender('Loading bundled P0 font'),
  );
  useEffect(() => {
    if (handle === null) return;
    loadLocalFont()
      .then(() => continueRender(handle))
      .catch(cancelRender);
  }, [handle]);
}
