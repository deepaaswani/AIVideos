import { lookup } from 'node:dns/promises';
import { isIP } from 'node:net';
import https from 'node:https';
import { load } from 'cheerio';
import { IdeaError } from './errors';

// Only globally routable IPv4 addresses are accepted. Reject IPv6 rather than risk
// alternative representations of private addresses in this small pilot importer.
export function isPublicArticleAddress(address: string): boolean {
  if (isIP(address) !== 4) return false;
  const [a = 0, b = 0, c = 0] = address.split('.').map(Number);
  return !(
    a === 0 ||
    a === 10 ||
    a === 127 ||
    a >= 224 ||
    (a === 100 && b >= 64 && b <= 127) ||
    (a === 169 && b === 254) ||
    (a === 172 && b >= 16 && b <= 31) ||
    (a === 192 && (b === 168 || b === 0 || (b === 88 && c === 99))) ||
    (a === 198 && (b === 18 || b === 19 || b === 51)) ||
    (a === 203 && b === 0 && c === 113)
  );
}
export function articleUrl(input: unknown): URL {
  if (typeof input !== 'string' || input.length > 2048)
    throw new IdeaError('INVALID_URL', 'Enter a public HTTPS article URL.');
  let url: URL;
  try {
    url = new URL(input);
  } catch {
    throw new IdeaError('INVALID_URL', 'Enter a complete HTTPS article URL.');
  }
  if (
    url.protocol !== 'https:' ||
    url.username ||
    url.password ||
    (url.port && url.port !== '443') ||
    !url.hostname.includes('.') ||
    url.hostname.endsWith('.local')
  )
    throw new IdeaError('INVALID_URL', 'Use a public HTTPS article on its standard port.');
  url.hash = '';
  return url;
}
type ArticlePage = { status: number; location: string | null; contentType: string; body: string };
async function retrieve(url: URL, signal: AbortSignal): Promise<ArticlePage> {
  const records = await lookup(url.hostname, { all: true, family: 4 });
  if (!records.length || records.some((record) => !isPublicArticleAddress(record.address)))
    throw new IdeaError(
      'URL_NOT_PUBLIC',
      'This address cannot be imported. Paste the article text instead.',
    );
  const pinned = records[0];
  if (!pinned) throw new IdeaError('URL_NOT_PUBLIC', 'This address cannot be imported.');
  return new Promise((resolve, reject) => {
    const request = https.get(
      url,
      {
        signal,
        family: 4,
        headers: {
          Accept: 'text/html, text/plain',
          'Accept-Encoding': 'identity',
          'User-Agent': 'VideoStudioArticleImporter/1.0',
        },
        lookup: (_hostname, _options, callback) => callback(null, pinned.address, 4),
      },
      (response) => {
        const status = response.statusCode ?? 500,
          location = response.headers.location ?? null;
        if (status >= 300 && status < 400) {
          response.resume();
          resolve({ status, location, contentType: '', body: '' });
          return;
        }
        const contentType = response.headers['content-type'] ?? '';
        if (
          !/^(text\/html|text\/plain|application\/xhtml\+xml)(;|$)/i.test(contentType) ||
          (response.headers['content-encoding'] &&
            response.headers['content-encoding'] !== 'identity')
        ) {
          response.destroy();
          reject(
            new IdeaError(
              'ARTICLE_TYPE_UNSUPPORTED',
              'This page is not a readable article. Paste its text instead.',
            ),
          );
          return;
        }
        let length = 0;
        const chunks: Buffer[] = [];
        response.on('data', (chunk: Buffer) => {
          length += chunk.length;
          if (length > 1000000) {
            response.destroy();
            reject(
              new IdeaError(
                'ARTICLE_TOO_LARGE',
                'This page is too large. Paste the relevant text instead.',
              ),
            );
          } else chunks.push(chunk);
        });
        response.on('end', () =>
          resolve({ status, location, contentType, body: Buffer.concat(chunks).toString('utf8') }),
        );
        response.on('error', reject);
      },
    );
    request.on('error', reject);
  });
}
export async function importArticle(input: unknown) {
  let url = articleUrl(input);
  const signal = AbortSignal.timeout(12000);
  try {
    for (let redirects = 0; redirects <= 3; redirects++) {
      signal.throwIfAborted();
      const page = await retrieve(url, signal);
      if (page.status >= 300 && page.status < 400) {
        if (!page.location || redirects === 3)
          throw new IdeaError(
            'ARTICLE_REDIRECT_LIMIT',
            'This page redirects too often. Paste its text instead.',
          );
        url = articleUrl(new URL(page.location, url).href);
        continue;
      }
      if (page.status !== 200)
        throw new IdeaError(
          'ARTICLE_UNAVAILABLE',
          'This article is unavailable or requires sign-in. Paste accessible text instead.',
        );
      let text = page.body,
        title = 'Imported article';
      if (!page.contentType.startsWith('text/plain')) {
        const $ = load(page.body);
        $('script,style,noscript,nav,header,footer,aside,form,iframe,svg').remove();
        title = ($('h1').first().text() || $('title').text() || title)
          .replace(/\s+/g, ' ')
          .trim()
          .slice(0, 200);
        const main = $('article').first().length
          ? $('article').first()
          : $('main').first().length
            ? $('main').first()
            : $('body');
        main.find('p,h1,h2,h3,li,br').each((_index, element) => {
          $(element).append('\n');
        });
        text = main.text();
      }
      text = text
        .replace(/[\t ]+/g, ' ')
        .replace(/\n\s*\n/g, '\n\n')
        .trim();
      if (text.length < 50)
        throw new IdeaError(
          'ARTICLE_TEXT_MISSING',
          'We could not extract enough text. Paste the article content instead.',
        );
      return {
        title,
        text: text.slice(0, 16000),
        url: url.href,
        retrievedAt: new Date().toISOString(),
        truncated: text.length > 16000,
      };
    }
  } catch (error) {
    if (error instanceof IdeaError) throw error;
    throw new IdeaError(
      'ARTICLE_IMPORT_FAILED',
      'The article could not be read. Paste the text to continue.',
      422,
    );
  }
  throw new IdeaError('ARTICLE_IMPORT_FAILED', 'Paste the article text to continue.', 422);
}
