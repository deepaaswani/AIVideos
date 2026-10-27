import assert from 'node:assert/strict';
import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { basename, dirname, resolve } from 'node:path';
import { test } from 'node:test';
import {
  getOrGenerateScene,
  measurePcmWav,
  sceneCacheKey,
  type SceneCacheOptions,
} from './narration-cache';

async function withCache(run: (options: SceneCacheOptions) => Promise<void>) {
  const cacheRoot = await mkdtemp(resolve(tmpdir(), 'aivideos-narration-test-'));
  try {
    await run({
      cacheRoot,
      sceneId: 'scene_hook',
      text: 'The authored narration.',
      voiceId: 'test-only-voice',
      apiKey: 'test-only-key',
      measure: async () => ({ durationSeconds: 4.2, meanVolumeDb: -17, maxVolumeDb: -2 }),
    });
  } finally {
    const resolvedCacheRoot = resolve(cacheRoot);
    if (
      dirname(resolvedCacheRoot) !== resolve(tmpdir()) ||
      !basename(resolvedCacheRoot).startsWith('aivideos-narration-test-')
    ) {
      throw new Error('Refusing cleanup outside the generated narration test directory.');
    }
    await rm(resolvedCacheRoot, { recursive: true, force: true });
  }
}

test('valid per-scene cache reuses measured, hashed audio without requiring an API key', async () => {
  await withCache(async (options) => {
    let requests = 0;
    const fetcher: typeof fetch = async () => {
      requests++;
      return new Response('test MP3 bytes');
    };
    const initial = await getOrGenerateScene({ ...options, fetcher });
    assert.equal(initial.reused, false);
    const reused = await getOrGenerateScene({ ...options, apiKey: undefined, fetcher });
    assert.equal(reused.reused, true);
    assert.equal(requests, 1);
    assert.equal(reused.audioSha256, initial.audioSha256);
  });
});

test('uncertain provider outcome is journaled and never automatically retried', async () => {
  await withCache(async (options) => {
    let requests = 0;
    const fetcher: typeof fetch = async () => {
      requests++;
      throw new Error('opaque connection failure');
    };
    await assert.rejects(
      getOrGenerateScene({ ...options, fetcher }),
      /billing outcome is uncertain/,
    );
    await assert.rejects(getOrGenerateScene({ ...options, fetcher }), /automatic retry is blocked/);
    assert.equal(requests, 1);
  });
});

test('credential/credit/voice failure stops without exposing raw provider data or retrying', async () => {
  await withCache(async (options) => {
    let requests = 0;
    const fetcher: typeof fetch = async () => {
      requests++;
      return new Response(
        JSON.stringify({
          detail: { status: 'quota_exceeded', message: 'sensitive-account-value' },
        }),
        { status: 401 },
      );
    };
    await assert.rejects(getOrGenerateScene({ ...options, fetcher }), (error: Error) => {
      assert.match(error.message, /HTTP 401, quota_exceeded/);
      assert.doesNotMatch(error.message, /sensitive-account-value|test-only-key|test-only-voice/);
      return true;
    });
    await assert.rejects(getOrGenerateScene({ ...options, fetcher }), /automatic retry is blocked/);
    assert.equal(requests, 1);
  });
});

test('corrupt cached bytes fail closed without a replacement paid request', async () => {
  await withCache(async (options) => {
    let requests = 0;
    const fetcher: typeof fetch = async () => {
      requests++;
      return new Response('test MP3 bytes');
    };
    const initial = await getOrGenerateScene({ ...options, fetcher });
    await writeFile(initial.audioPath, 'changed bytes');
    await assert.rejects(getOrGenerateScene({ ...options, fetcher }), /metadata\/hash mismatch/);
    assert.equal(requests, 1);
  });
});

test('saved full provider response can recover from failed local measurement without another POST', async () => {
  await withCache(async (options) => {
    let requests = 0;
    const fetcher: typeof fetch = async () => {
      requests++;
      return new Response('test MP3 bytes');
    };
    await assert.rejects(
      getOrGenerateScene({
        ...options,
        fetcher,
        measure: async () => {
          throw new Error('local tool unavailable');
        },
      }),
      /preserved for inspection/,
    );
    const recovered = await getOrGenerateScene({ ...options, fetcher });
    assert.equal(recovered.reused, true);
    assert.equal(requests, 1);
    const journal = await readFile(
      resolve(options.cacheRoot, recovered.key, 'attempt.json'),
      'utf8',
    );
    assert.equal(JSON.parse(journal).status, 'cached');
  });
});

test('cache identity changes for exact text and voice changes', () => {
  assert.notEqual(sceneCacheKey('one', 'voice-a'), sceneCacheKey('two', 'voice-a'));
  assert.notEqual(sceneCacheKey('one', 'voice-a'), sceneCacheKey('one', 'voice-b'));
  assert.equal(sceneCacheKey('one', 'voice-a'), sceneCacheKey('one', 'voice-a'));
});

test('decoded PCM measurement detects actual duration, audible levels and silence', () => {
  const wav = Buffer.alloc(48);
  wav.write('RIFF', 0);
  wav.writeUInt32LE(40, 4);
  wav.write('WAVEfmt ', 8);
  wav.writeUInt32LE(16, 16);
  wav.writeUInt16LE(1, 20);
  wav.writeUInt16LE(1, 22);
  wav.writeUInt32LE(2, 24);
  wav.writeUInt32LE(4, 28);
  wav.writeUInt16LE(2, 32);
  wav.writeUInt16LE(16, 34);
  wav.write('data', 36);
  wav.writeUInt32LE(4, 40);
  wav.writeInt16LE(16384, 44);
  wav.writeInt16LE(-16384, 46);
  const audible = measurePcmWav(wav);
  assert.equal(audible.durationSeconds, 1);
  assert.ok(Math.abs(audible.meanVolumeDb - -6.020599913) < 0.0001);
  assert.equal(audible.meanVolumeDb, audible.maxVolumeDb);
  wav.fill(0, 44);
  const silent = measurePcmWav(wav);
  assert.equal(silent.meanVolumeDb, Number.NEGATIVE_INFINITY);
  assert.equal(silent.maxVolumeDb, Number.NEGATIVE_INFINITY);
  assert.throws(() => measurePcmWav(Buffer.from('not a WAV')), /PCM WAV/);
});

test('an interrupted partial response is never recovered or automatically retried', async () => {
  await withCache(async (options) => {
    const key = sceneCacheKey(options.text, options.voiceId);
    const directory = resolve(options.cacheRoot, key);
    await mkdir(directory, { recursive: true });
    await writeFile(resolve(directory, 'audio.mp3.part'), 'incomplete response');
    await writeFile(
      resolve(directory, 'attempt.json'),
      JSON.stringify({ version: 1, status: 'pending', key }),
    );
    let requests = 0;
    let measurements = 0;
    const fetcher: typeof fetch = async () => {
      requests++;
      return new Response('replacement');
    };
    await assert.rejects(
      getOrGenerateScene({
        ...options,
        fetcher,
        measure: async () => {
          measurements++;
          return { durationSeconds: 4.2, meanVolumeDb: -17, maxVolumeDb: -2 };
        },
      }),
      /automatic retry is blocked/,
    );
    assert.equal(requests, 0);
    assert.equal(measurements, 0);
  });
});

test('competing generators claim one journal and issue at most one paid POST', async () => {
  await withCache(async (options) => {
    let requests = 0;
    const fetcher: typeof fetch = async () => {
      requests++;
      await new Promise((done) => setTimeout(done, 50));
      return new Response('test MP3 bytes');
    };
    const results = await Promise.allSettled([
      getOrGenerateScene({ ...options, fetcher }),
      getOrGenerateScene({ ...options, fetcher }),
    ]);
    assert.equal(results.filter((result) => result.status === 'fulfilled').length, 1);
    assert.equal(requests, 1);
  });
});
