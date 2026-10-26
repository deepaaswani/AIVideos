import { readFile, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { compile } from 'json-schema-to-typescript';
import { format, resolveConfig } from 'prettier';

const schemaUrl = new URL('../docs/step-1/contracts/storyboard.schema.json', import.meta.url);
const outputUrl = new URL('../packages/contracts/src/storyboard.generated.ts', import.meta.url);
const schema = JSON.parse(await readFile(schemaUrl, 'utf8'));
const generated = await compile({ ...schema, title: 'Storyboard' }, 'Storyboard', {
  bannerComment:
    '/* Generated from docs/step-1/contracts/storyboard.schema.json.\n * Run npm run contracts:generate to update. Do not edit by hand.\n */',
  additionalProperties: false,
  cwd: fileURLToPath(new URL('../docs/step-1/contracts/', import.meta.url)),
});
const formatted = await format(generated, {
  ...(await resolveConfig(fileURLToPath(outputUrl))),
  parser: 'typescript',
});

if (process.argv.includes('--check')) {
  const existing = await readFile(outputUrl, 'utf8').catch(() => '');
  if (existing.replaceAll('\r\n', '\n') !== formatted) {
    console.error('Generated storyboard types are stale. Run npm run contracts:generate.');
    process.exitCode = 1;
  } else {
    console.log('Generated storyboard types match the canonical schema.');
  }
} else {
  await writeFile(outputUrl, formatted);
  console.log('Generated packages/contracts/src/storyboard.generated.ts');
}
