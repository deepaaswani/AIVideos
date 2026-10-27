import { cp, mkdir } from 'node:fs/promises';

const source = new URL('../packages/video/public/prototype/', import.meta.url);
const destination = new URL('../apps/web/public/prototype/', import.meta.url);
await mkdir(destination, { recursive: true });
await cp(source, destination, { recursive: true });
console.log('Synced bundled video assets for the web preview.');
