#!/usr/bin/env node

import { mkdirSync, writeFileSync } from 'fs';
import { dirname, resolve } from 'path';

const DEFAULT_API_BASE = 'https://mariachicielitolindoec.com/wp-json/wp/v2';
const SONG_ENDPOINT = 'cancion';

function parseArgs(argv) {
  const args = {
    apiBase: DEFAULT_API_BASE,
    output: 'data/wp-songs-normalized.json',
    scanPages: false,
    perPage: 100,
  };

  for (let i = 2; i < argv.length; i++) {
    const current = argv[i];
    if (current === '--scan-pages') args.scanPages = true;
    if (current === '--api-base' && argv[i + 1]) args.apiBase = argv[++i];
    if (current === '--output' && argv[i + 1]) args.output = argv[++i];
    if (current === '--per-page' && argv[i + 1]) args.perPage = Math.max(1, Math.min(100, Number(argv[++i]) || 100));
  }

  return args;
}

function stripHtml(html = '') {
  return String(html)
    .replace(/<[^>]*>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function decodeHtmlEntities(text = '') {
  return String(text)
    .replace(/&#038;/g, '&')
    .replace(/&#8217;/g, "'")
    .replace(/&#8220;/g, '"')
    .replace(/&#8221;/g, '"')
    .replace(/&#8211;/g, '-')
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#039;/g, "'")
    .replace(/&nbsp;/g, ' ')
    .trim();
}

function normalizeText(input = '') {
  return decodeHtmlEntities(stripHtml(input)).replace(/\s+/g, ' ').trim();
}

function extractMegaUrl(text = '') {
  const megaRegex = /(https?:\/\/(?:mega\.nz|mega\.co\.nz)\/[^\s"'<>\])]+)/i;
  const match = String(text).match(megaRegex);
  return match ? match[1].trim() : '';
}

function extractYoutubeUrl(text = '') {
  const ytRegex = /(https?:\/\/(?:www\.)?(?:youtube\.com\/(?:watch\?v=|shorts\/|embed\/)|youtu\.be\/)[^\s"'<>\])]+)/i;
  const match = String(text).match(ytRegex);
  return match ? match[1].trim() : '';
}

async function fetchJson(url) {
  const response = await fetch(url, {
    headers: {
      Accept: 'application/json',
      'User-Agent': 'WMCL-Migration-Prep/2.0',
    },
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Request failed (${response.status}) ${url}\n${body.slice(0, 400)}`);
  }

  return {
    data: await response.json(),
    headers: response.headers,
  };
}

async function fetchAllPages(apiBase, endpoint, perPage) {
  const page1Url = `${apiBase}/${endpoint}?per_page=${perPage}&page=1`;
  const first = await fetchJson(page1Url);
  const totalPages = Number(first.headers.get('x-wp-totalpages') || 1);
  const all = Array.isArray(first.data) ? [...first.data] : [];

  for (let page = 2; page <= totalPages; page++) {
    const url = `${apiBase}/${endpoint}?per_page=${perPage}&page=${page}`;
    const current = await fetchJson(url);
    if (!Array.isArray(current.data) || current.data.length === 0) break;
    all.push(...current.data);
  }

  return all;
}

async function fetchTaxonomyMap(apiBase, taxonomy, perPage) {
  const items = await fetchAllPages(apiBase, taxonomy, perPage);
  const map = new Map();
  for (const item of items) {
    map.set(item.id, normalizeText(item.name || ''));
  }
  return map;
}

function getTaxNames(ids, taxMap) {
  if (!Array.isArray(ids)) return [];
  const names = ids
    .map((id) => taxMap.get(id))
    .filter(Boolean)
    .map((name) => normalizeText(name));
  return Array.from(new Set(names));
}

async function extractMegaFromPublicPage(url) {
  try {
    const response = await fetch(url, {
      headers: {
        Accept: 'text/html',
        'User-Agent': 'WMCL-Migration-Prep/2.0',
      },
    });
    if (!response.ok) return '';
    const html = await response.text();
    return extractMegaUrl(html);
  } catch {
    return '';
  }
}

async function main() {
  const args = parseArgs(process.argv);

  console.log('Starting WordPress extraction...');
  console.log(`API base: ${args.apiBase}`);
  console.log(`Per page: ${args.perPage}`);
  console.log(`Scan public pages for Mega: ${args.scanPages ? 'yes' : 'no'}`);

  const [songsRaw, artistMap, genreMap, occasionMap] = await Promise.all([
    fetchAllPages(args.apiBase, SONG_ENDPOINT, args.perPage),
    fetchTaxonomyMap(args.apiBase, 'artista', args.perPage),
    fetchTaxonomyMap(args.apiBase, 'genero', args.perPage),
    fetchTaxonomyMap(args.apiBase, 'ocaciones', args.perPage),
  ]);

  const normalized = [];
  let withMega = 0;
  let withYoutube = 0;

  for (const item of songsRaw) {
    const title = normalizeText(item?.title?.rendered || '');
    const artists = getTaxNames(item?.artista, artistMap);
    const genres = getTaxNames(item?.genero, genreMap);
    const occasions = getTaxNames(item?.ocaciones, occasionMap);

    let megaUrl = '';
    megaUrl ||= extractMegaUrl(JSON.stringify(item?.acf || {}));
    megaUrl ||= extractMegaUrl(item?.content?.rendered || '');
    megaUrl ||= extractMegaUrl(item?.excerpt?.rendered || '');

    let youtubeUrl = '';
    youtubeUrl ||= extractYoutubeUrl(JSON.stringify(item?.acf || {}));
    youtubeUrl ||= extractYoutubeUrl(item?.content?.rendered || '');
    youtubeUrl ||= extractYoutubeUrl(item?.excerpt?.rendered || '');

    if (!megaUrl && args.scanPages && item?.link) {
      megaUrl = await extractMegaFromPublicPage(item.link);
    }

    if (megaUrl) withMega += 1;
    if (youtubeUrl) withYoutube += 1;

    normalized.push({
      source: 'wordpress',
      sourceId: item.id,
      sourceUrl: item.link || '',
      title,
      artist: artists[0] || '',
      artists,
      genres,
      occasions,
      megaUrl,
      youtubeUrl,
      reviewFlags: {
        missingArtist: !artists[0],
        missingGenres: genres.length === 0,
        missingOccasions: occasions.length === 0,
        missingYoutube: !youtubeUrl,
        missingMega: !megaUrl,
      },
    });
  }

  const outputPath = resolve(args.output);
  mkdirSync(dirname(outputPath), { recursive: true });
  writeFileSync(
    outputPath,
    JSON.stringify(
      {
        meta: {
          extractedAt: new Date().toISOString(),
          apiBase: args.apiBase,
          totalSongs: normalized.length,
          songsWithMega: withMega,
          songsWithoutMega: normalized.length - withMega,
          songsWithYoutube: withYoutube,
          songsWithoutYoutube: normalized.length - withYoutube,
          scanPages: args.scanPages,
        },
        songs: normalized,
      },
      null,
      2
    )
  );

  console.log(`Done. Exported ${normalized.length} songs.`);
  console.log(`With Mega URL: ${withMega}`);
  console.log(`Without Mega URL: ${normalized.length - withMega}`);
  console.log(`With YouTube URL: ${withYoutube}`);
  console.log(`Without YouTube URL: ${normalized.length - withYoutube}`);
  console.log(`Output: ${outputPath}`);
}

main().catch((error) => {
  console.error('Migration prep failed.');
  console.error(error);
  process.exit(1);
});
