import { createHash } from 'node:crypto';
import { mkdir, open, readFile, rename, stat } from 'node:fs/promises';
import { resolve } from 'node:path';
import { mediaBinary, runFile } from './prototype-common';

export const narrationSettings = {
  provider: 'elevenlabs',
  modelId: 'eleven_multilingual_v2',
  outputFormat: 'mp3_44100_128',
  voiceSettings: {
    stability: 0.5,
    similarity_boost: 0.75,
    style: 0,
    use_speaker_boost: true,
    speed: 1,
  },
} as const;

export function textHash(text: string) {
  return createHash('sha256').update(text).digest('hex');
}

export function sceneCacheKey(text: string, voiceId: string) {
  return textHash(JSON.stringify({ version: 1, text, voiceId, ...narrationSettings }));
}

export interface AudioMeasurement {
  durationSeconds: number;
  meanVolumeDb: number;
  maxVolumeDb: number;
}

/** Measure a decoded PCM WAV without optional FFmpeg analysis filters. */
export function measurePcmWav(wav: Buffer): AudioMeasurement {
  if (wav.toString('ascii', 0, 4) !== 'RIFF' || wav.toString('ascii', 8, 12) !== 'WAVE') {
    throw new Error('Audio decoder did not return a PCM WAV.');
  }
  let sampleRate = 0;
  let channels = 0;
  let samples: Buffer | undefined;
  for (let offset = 12; offset + 8 <= wav.length;) {
    const chunk = wav.toString('ascii', offset, offset + 4);
    const size = wav.readUInt32LE(offset + 4);
    const start = offset + 8;
    if (chunk === 'fmt ' && size >= 16 && start + 16 <= wav.length) {
      if (wav.readUInt16LE(start) !== 1 || wav.readUInt16LE(start + 14) !== 16) {
        throw new Error('Audio decoder did not return signed 16-bit PCM.');
      }
      channels = wav.readUInt16LE(start + 2);
      sampleRate = wav.readUInt32LE(start + 4);
    }
    if (chunk === 'data') {
      samples = wav.subarray(start, Math.min(wav.length, start + size));
      break;
    }
    offset = start + size + (size % 2);
  }
  if (!samples?.length || !sampleRate || !channels || samples.length % 2 !== 0) {
    throw new Error('Audio decoder returned no complete PCM samples.');
  }
  let squared = 0;
  let peak = 0;
  for (let offset = 0; offset < samples.length; offset += 2) {
    const value = samples.readInt16LE(offset) / 32768;
    squared += value * value;
    peak = Math.max(peak, Math.abs(value));
  }
  const meanVolumeDb = 20 * Math.log10(Math.sqrt(squared / (samples.length / 2)));
  const maxVolumeDb = 20 * Math.log10(peak);
  return {
    durationSeconds: samples.length / (2 * channels * sampleRate),
    meanVolumeDb,
    maxVolumeDb,
  };
}

/** Local in-memory capability check before any request can claim provider credits. */
export async function preflightAudioDecoder() {
  // A brief diagnostic PCM signal is never saved, published or used as narration.
  const samples = 2205;
  const wav = Buffer.alloc(44 + samples * 2);
  wav.write('RIFF', 0);
  wav.writeUInt32LE(wav.length - 8, 4);
  wav.write('WAVEfmt ', 8);
  wav.writeUInt32LE(16, 16);
  wav.writeUInt16LE(1, 20);
  wav.writeUInt16LE(1, 22);
  wav.writeUInt32LE(22050, 24);
  wav.writeUInt32LE(44100, 28);
  wav.writeUInt16LE(2, 32);
  wav.writeUInt16LE(16, 34);
  wav.write('data', 36);
  wav.writeUInt32LE(samples * 2, 40);
  for (let index = 0; index < samples; index++) {
    wav.writeInt16LE(
      Math.round(8000 * Math.sin((index * 2 * Math.PI * 440) / 22050)),
      44 + index * 2,
    );
  }
  try {
    const decoding = runFile(
      mediaBinary('ffmpeg'),
      [
        '-v',
        'error',
        '-xerror',
        '-i',
        'pipe:0',
        '-map',
        '0:a:0',
        '-c:a',
        'pcm_s16le',
        '-f',
        'wav',
        '-',
      ],
      { encoding: 'buffer', maxBuffer: 1024 * 1024, timeout: 10_000 },
    );
    decoding.child.stdin?.end(wav);
    const decoded = measurePcmWav((await decoding).stdout);
    if (Math.abs(decoded.durationSeconds - 0.1) > 0.001 || decoded.meanVolumeDb < -30) {
      throw new Error('Diagnostic audio measurement failed.');
    }
    await runFile(mediaBinary('ffprobe'), ['-version'], { timeout: 10_000 });
  } catch {
    throw new Error('Local audio decoder/probe preflight failed; no provider request was made.');
  }
}

interface CachedScene extends AudioMeasurement {
  version: 1;
  key: string;
  sceneId: string;
  textSha256: string;
  audioSha256: string;
}

interface Attempt {
  version: 1;
  sceneId: string;
  key: string;
  startedAt: string;
  status: 'pending' | 'uncertain' | 'rejected' | 'received' | 'cached';
  httpStatus?: number;
  errorCode?: string;
}

async function exists(path: string) {
  try {
    await stat(path);
    return true;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') return false;
    throw error;
  }
}

/** Flush request intent to disk before sending a potentially billable POST. */
async function durableWrite(path: string, value: string | Uint8Array, exclusive = false) {
  const handle = await open(path, exclusive ? 'wx' : 'w');
  try {
    await handle.writeFile(value);
    await handle.sync();
  } finally {
    await handle.close();
  }
}

async function durableJson(path: string, value: unknown, exclusive = false) {
  await durableWrite(path, `${JSON.stringify(value, null, 2)}\n`, exclusive);
}

export async function measureAudio(path: string): Promise<AudioMeasurement> {
  const probe = await runFile(mediaBinary('ffprobe'), [
    '-v',
    'error',
    '-show_streams',
    '-show_format',
    '-of',
    'json',
    path,
  ]);
  const metadata = JSON.parse(probe.stdout) as {
    streams: { codec_type: string; codec_name: string }[];
    format: { duration: string };
  };
  const audios = metadata.streams.filter((stream) => stream.codec_type === 'audio');
  const durationSeconds = Number(metadata.format.duration);
  if (
    metadata.streams.length !== 1 ||
    audios.length !== 1 ||
    audios[0]?.codec_name !== 'mp3' ||
    !Number.isFinite(durationSeconds) ||
    durationSeconds <= 0 ||
    durationSeconds > 60
  ) {
    throw new Error('Expected one valid MP3 narration clip lasting at most 60 seconds.');
  }
  // Decode the entire clip and measure actual signal, rather than trusting a file extension.
  const decoded = await runFile(
    mediaBinary('ffmpeg'),
    ['-v', 'error', '-xerror', '-i', path, '-map', '0:a:0', '-c:a', 'pcm_s16le', '-f', 'wav', '-'],
    { encoding: 'buffer', maxBuffer: 24 * 1024 * 1024 },
  );
  const {
    meanVolumeDb,
    maxVolumeDb,
    durationSeconds: decodedSeconds,
  } = measurePcmWav(decoded.stdout);
  if (
    !Number.isFinite(meanVolumeDb) ||
    !Number.isFinite(maxVolumeDb) ||
    meanVolumeDb < -50 ||
    maxVolumeDb < -35
  ) {
    throw new Error('Narration clip is silent or too quiet; paid generation will not be retried.');
  }
  return { durationSeconds: Math.max(durationSeconds, decodedSeconds), meanVolumeDb, maxVolumeDb };
}

export interface SceneCacheOptions {
  cacheRoot: string;
  sceneId: string;
  text: string;
  voiceId: string;
  apiKey?: string;
  fetcher?: typeof fetch;
  measure?: (path: string) => Promise<AudioMeasurement>;
  onRequest?: () => void;
}

const safeProviderCodes = new Set([
  'invalid_api_key',
  'quota_exceeded',
  'insufficient_credits',
  'voice_not_found',
  'voice_access_denied',
  'missing_permissions',
  'subscription_required',
  'rate_limit_exceeded',
  'too_many_concurrent_requests',
  'invalid_uid',
  'payment_required',
]);

/** No retry loop: an existing attempt without valid audio always requires manual reconciliation. */
export async function getOrGenerateScene(options: SceneCacheOptions) {
  const { cacheRoot, sceneId, text, voiceId, apiKey } = options;
  const key = sceneCacheKey(text, voiceId);
  const directory = resolve(cacheRoot, key);
  const audioPath = resolve(directory, 'audio.mp3');
  const metadataPath = resolve(directory, 'metadata.json');
  const attemptPath = resolve(directory, 'attempt.json');
  const measure = options.measure ?? measureAudio;
  await mkdir(directory, { recursive: true });

  if (await exists(audioPath)) {
    const actualHash = createHash('sha256')
      .update(await readFile(audioPath))
      .digest('hex');
    if (await exists(metadataPath)) {
      const cached = JSON.parse(await readFile(metadataPath, 'utf8')) as CachedScene;
      if (
        cached.version !== 1 ||
        cached.key !== key ||
        cached.sceneId !== sceneId ||
        cached.textSha256 !== textHash(text) ||
        cached.audioSha256 !== actualHash
      )
        throw new Error(`${sceneId}: cached audio metadata/hash mismatch; no paid retry was made.`);
      const measured = await measure(audioPath);
      if (Math.abs(measured.durationSeconds - cached.durationSeconds) > 0.001) {
        throw new Error(`${sceneId}: cached duration mismatch; no paid retry was made.`);
      }
      return { ...cached, ...measured, audioPath, reused: true };
    }
    if (!(await exists(attemptPath))) {
      throw new Error(
        `${sceneId}: orphaned audio has no provider-attempt record; no paid retry was made.`,
      );
    }
    // A full response was saved before local validation. Recover locally after a crash.
    const measured = await measure(audioPath);
    const recovered: CachedScene = {
      version: 1,
      key,
      sceneId,
      textSha256: textHash(text),
      audioSha256: actualHash,
      ...measured,
    };
    await durableJson(metadataPath, recovered);
    const attempt = JSON.parse(await readFile(attemptPath, 'utf8')) as Attempt;
    await durableJson(attemptPath, { ...attempt, status: 'cached' });
    return { ...recovered, audioPath, reused: true };
  }

  if (await exists(attemptPath)) {
    throw new Error(
      `${sceneId}: a prior provider attempt has no valid cached audio. Reconcile its billing/history before any explicit new generation; automatic retry is blocked.`,
    );
  }
  if (!apiKey?.trim())
    throw new Error('ELEVENLABS_API_KEY is missing; no provider request was made.');
  const attempt: Attempt = {
    version: 1,
    sceneId,
    key,
    startedAt: new Date().toISOString(),
    status: 'pending',
  };
  try {
    await durableJson(attemptPath, attempt, true);
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'EEXIST') {
      throw new Error(
        `${sceneId}: another process already claimed this provider attempt; no duplicate request was made.`,
      );
    }
    throw error;
  }

  let response: Response;
  options.onRequest?.();
  try {
    response = await (options.fetcher ?? fetch)(
      `https://api.elevenlabs.io/v1/text-to-speech/${encodeURIComponent(voiceId)}?output_format=${narrationSettings.outputFormat}`,
      {
        method: 'POST',
        redirect: 'error',
        headers: { 'xi-api-key': apiKey, 'Content-Type': 'application/json', Accept: 'audio/mpeg' },
        body: JSON.stringify({
          text,
          model_id: narrationSettings.modelId,
          voice_settings: narrationSettings.voiceSettings,
        }),
        signal: AbortSignal.timeout(120_000),
      },
    );
  } catch {
    await durableJson(attemptPath, { ...attempt, status: 'uncertain' });
    throw new Error(
      `${sceneId}: provider connection failed or timed out; billing outcome is uncertain. Automatic retry is blocked.`,
    );
  }
  if (!response.ok) {
    let errorCode = 'unspecified';
    try {
      const errorBody = (await response.json()) as { detail?: { status?: unknown } };
      const code = errorBody.detail?.status;
      if (typeof code === 'string' && safeProviderCodes.has(code)) errorCode = code;
    } catch {
      /* Do not log provider response bodies, which may contain account data. */
    }
    await durableJson(attemptPath, {
      ...attempt,
      status: 'rejected',
      httpStatus: response.status,
      errorCode,
    });
    throw new Error(
      `${sceneId}: ElevenLabs rejected generation (HTTP ${response.status}, ${errorCode}). Check credentials, credits and voice permissions. Automatic retry is blocked.`,
    );
  }
  try {
    const audio = new Uint8Array(await response.arrayBuffer());
    if (audio.length === 0) throw new Error('Empty provider response.');
    // Only the atomic final name may be recovered after a crash. A partially
    // written response remains a .part file and can never pass as complete audio.
    const partialPath = `${audioPath}.part`;
    await durableWrite(partialPath, audio, true);
    await rename(partialPath, audioPath);
    await durableJson(attemptPath, { ...attempt, status: 'received', httpStatus: response.status });
  } catch {
    await durableJson(attemptPath, {
      ...attempt,
      status: 'uncertain',
      httpStatus: response.status,
    });
    throw new Error(
      `${sceneId}: provider audio could not be saved completely; billing outcome is uncertain. Automatic retry is blocked.`,
    );
  }
  let measured: AudioMeasurement;
  try {
    measured = await measure(audioPath);
  } catch {
    throw new Error(
      `${sceneId}: saved provider audio failed local media validation. It was preserved for inspection; no paid retry will be made.`,
    );
  }
  const metadata: CachedScene = {
    version: 1,
    key,
    sceneId,
    textSha256: textHash(text),
    audioSha256: createHash('sha256')
      .update(await readFile(audioPath))
      .digest('hex'),
    ...measured,
  };
  await durableJson(metadataPath, metadata);
  await durableJson(attemptPath, { ...attempt, status: 'cached', httpStatus: response.status });
  return { ...metadata, audioPath, reused: false };
}
