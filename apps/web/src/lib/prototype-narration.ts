import 'server-only';
import { createHash } from 'node:crypto';
import { existsSync } from 'node:fs';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { fixtureStoryboard, validateNarrationManifest } from '@aivideos/video/data';

/** Read local generated artifacts only. A preview request never contacts a paid provider. */
export async function loadPrototypeNarration() {
  const webDir = existsSync(resolve(process.cwd(), 'apps/web/package.json'))
    ? resolve(process.cwd(), 'apps/web')
    : process.cwd();
  const manifestPath = resolve(webDir, '../../prototype-results/narrated/narration.json');
  if (!existsSync(manifestPath)) {
    try {
      const report = JSON.parse(
        await readFile(
          resolve(webDir, '../../prototype-results/narrated/generation-report.json'),
          'utf8',
        ),
      ) as { status?: string; reason?: unknown };
      if (report.status === 'failed') {
        const httpStatus =
          typeof report.reason === 'string' ? /HTTP (\d{3})/.exec(report.reason)?.[1] : undefined;
        return {
          error: `Narration unavailable: generation failed${httpStatus ? ` (ElevenLabs HTTP ${httpStatus})` : ''}. Resolve the provider billing or access issue and reconcile the recorded attempt before authorizing another generation. No audio has been substituted.`,
        };
      }
    } catch {
      // Missing or malformed reports cannot turn absent narration into a playable mode.
    }
    return { error: 'Narration has not been generated. Run npm run narration:generate locally.' };
  }
  try {
    const manifest = validateNarrationManifest(
      fixtureStoryboard,
      JSON.parse(await readFile(manifestPath, 'utf8')),
    );
    for (const [index, clip] of manifest.clips.entries()) {
      const textHash = createHash('sha256')
        .update(fixtureStoryboard.scenes[index]!.narration)
        .digest('hex');
      const audio = await readFile(resolve(webDir, 'public', clip.audioSrc.slice(1)));
      if (
        clip.textSha256 !== textHash ||
        audio.length === 0 ||
        createHash('sha256').update(audio).digest('hex') !== clip.audioSha256
      ) {
        throw new Error('Stale narration artifact.');
      }
    }
    return { narration: manifest };
  } catch {
    return {
      error:
        'Narration is unavailable, invalid, or stale. Run npm run narration:generate locally to validate the cache. No audio has been substituted.',
    };
  }
}
