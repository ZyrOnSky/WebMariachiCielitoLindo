#!/usr/bin/env node

import { mkdirSync, readFileSync, writeFileSync } from 'fs';
import { dirname, resolve } from 'path';

function parseArgs(argv) {
  const args = {
    input: 'data/wp-songs-normalized.json',
    output: 'data/wp-songs-enriched.json',
    rules: 'data/wp-enrichment-rules.json',
    pending: 'data/wp-enrichment-pending.json',
  };

  for (let i = 2; i < argv.length; i++) {
    const current = argv[i];
    if (current === '--input' && argv[i + 1]) args.input = argv[++i];
    if (current === '--output' && argv[i + 1]) args.output = argv[++i];
    if (current === '--rules' && argv[i + 1]) args.rules = argv[++i];
    if (current === '--pending' && argv[i + 1]) args.pending = argv[++i];
  }

  return args;
}

function normalizeText(input = '') {
  return String(input).trim().replace(/\s+/g, ' ');
}

function normalizeKey(input = '') {
  return normalizeText(input).toLowerCase();
}

function unique(values) {
  return Array.from(new Set(values.map((v) => normalizeText(v)).filter(Boolean)));
}

function isYoutubeUrl(value = '') {
  const text = String(value || '').trim();
  return /^(https?:\/\/)?(www\.)?(youtube\.com\/watch\?v=|youtube\.com\/shorts\/|youtube\.com\/embed\/|youtu\.be\/).+/i.test(text);
}

function loadJson(path) {
  return JSON.parse(readFileSync(path, 'utf-8'));
}

function buildRuleMaps(rulesRaw = {}) {
  const bySourceId = new Map(Object.entries(rulesRaw.bySourceId || {}));
  const byTitle = new Map(
    Object.entries(rulesRaw.byTitle || {}).map(([title, value]) => [normalizeKey(title), value])
  );

  return {
    bySourceId,
    byTitle,
    genreKeywords: rulesRaw.genreKeywords || {},
    occasionKeywords: rulesRaw.occasionKeywords || {},
  };
}

function detectByKeywords(title, keywordMap) {
  const lowerTitle = normalizeKey(title);
  const out = [];
  for (const [category, keywords] of Object.entries(keywordMap || {})) {
    if (!Array.isArray(keywords)) continue;
    const hasMatch = keywords.some((keyword) => lowerTitle.includes(normalizeKey(keyword)));
    if (hasMatch) out.push(category);
  }
  return out;
}

function mergeSong(song, override) {
  if (!override) return song;
  const next = { ...song };

  if (override.artist) next.artist = normalizeText(override.artist);
  if (Array.isArray(override.artists) && override.artists.length > 0) next.artists = unique(override.artists);
  if (Array.isArray(override.genres) && override.genres.length > 0) next.genres = unique(override.genres);
  if (Array.isArray(override.occasions) && override.occasions.length > 0) next.occasions = unique(override.occasions);

  if (override.youtubeUrl && isYoutubeUrl(override.youtubeUrl)) {
    next.youtubeUrl = normalizeText(override.youtubeUrl);
  }

  return next;
}

function main() {
  const args = parseArgs(process.argv);
  const inputPath = resolve(args.input);
  const outputPath = resolve(args.output);
  const rulesPath = resolve(args.rules);
  const pendingPath = resolve(args.pending);

  const parsed = loadJson(inputPath);
  const rulesRaw = loadJson(rulesPath);
  const ruleMaps = buildRuleMaps(rulesRaw);
  const songs = Array.isArray(parsed.songs) ? parsed.songs : [];

  let fixedYoutube = 0;
  let fixedGenres = 0;
  let fixedOccasions = 0;

  const enrichedSongs = songs.map((originalSong) => {
    const sourceOverride = ruleMaps.bySourceId.get(String(originalSong.sourceId));
    const titleOverride = ruleMaps.byTitle.get(normalizeKey(originalSong.title));

    let song = mergeSong(originalSong, sourceOverride);
    song = mergeSong(song, titleOverride);

    if ((!song.genres || song.genres.length === 0) && rulesRaw.inferMissingGenresFromTitle !== false) {
      const inferredGenres = detectByKeywords(song.title, ruleMaps.genreKeywords);
      if (inferredGenres.length > 0) {
        song.genres = unique(inferredGenres);
        fixedGenres += 1;
      }
    }

    if ((!song.occasions || song.occasions.length === 0) && rulesRaw.inferMissingOccasionsFromTitle !== false) {
      const inferredOccasions = detectByKeywords(song.title, ruleMaps.occasionKeywords);
      if (inferredOccasions.length > 0) {
        song.occasions = unique(inferredOccasions);
        fixedOccasions += 1;
      }
    }

    if (song.youtubeUrl && isYoutubeUrl(song.youtubeUrl) && !originalSong.youtubeUrl) {
      fixedYoutube += 1;
    }

    const artists = Array.isArray(song.artists) ? unique(song.artists) : [];
    if (!song.artist && artists.length > 0) song.artist = artists[0];

    song.reviewFlags = {
      missingArtist: !song.artist,
      missingGenres: !Array.isArray(song.genres) || song.genres.length === 0,
      missingOccasions: !Array.isArray(song.occasions) || song.occasions.length === 0,
      missingYoutube: !song.youtubeUrl,
      missingMega: !song.megaUrl,
    };

    return song;
  });

  const pending = enrichedSongs
    .filter(
      (song) =>
        song.reviewFlags?.missingArtist ||
        song.reviewFlags?.missingGenres ||
        song.reviewFlags?.missingOccasions ||
        song.reviewFlags?.missingYoutube
    )
    .map((song) => ({
      sourceId: song.sourceId,
      title: song.title,
      artist: song.artist || '',
      sourceUrl: song.sourceUrl,
      missing: {
        artist: Boolean(song.reviewFlags?.missingArtist),
        genres: Boolean(song.reviewFlags?.missingGenres),
        occasions: Boolean(song.reviewFlags?.missingOccasions),
        youtubeUrl: Boolean(song.reviewFlags?.missingYoutube),
      },
    }));

  const withYoutube = enrichedSongs.filter((s) => s.youtubeUrl).length;

  const result = {
    meta: {
      ...(parsed.meta || {}),
      enrichedAt: new Date().toISOString(),
      inputPath,
      rulesPath,
      totalSongs: enrichedSongs.length,
      songsWithYoutube: withYoutube,
      songsWithoutYoutube: enrichedSongs.length - withYoutube,
      fixedYoutube,
      fixedGenres,
      fixedOccasions,
      pendingCount: pending.length,
    },
    songs: enrichedSongs,
  };

  mkdirSync(dirname(outputPath), { recursive: true });
  mkdirSync(dirname(pendingPath), { recursive: true });
  writeFileSync(outputPath, JSON.stringify(result, null, 2));
  writeFileSync(pendingPath, JSON.stringify({ generatedAt: new Date().toISOString(), pending }, null, 2));

  console.log(`Enriched songs: ${enrichedSongs.length}`);
  console.log(`Fixed YouTube: ${fixedYoutube}`);
  console.log(`Fixed genres: ${fixedGenres}`);
  console.log(`Fixed occasions: ${fixedOccasions}`);
  console.log(`Pending manual review: ${pending.length}`);
  console.log(`Output: ${outputPath}`);
  console.log(`Pending list: ${pendingPath}`);
}

main();
