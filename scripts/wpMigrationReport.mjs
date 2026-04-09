#!/usr/bin/env node

import { readFileSync, writeFileSync, mkdirSync } from 'fs';
import { dirname, resolve } from 'path';

function parseArgs(argv) {
  const args = {
    input: 'data/wp-songs-normalized.json',
    output: 'data/wp-songs-report.md',
    preview: 40,
    missingMegaPreview: 80,
    missingYoutubePreview: 80,
  };

  for (let i = 2; i < argv.length; i++) {
    const current = argv[i];
    if (current === '--input' && argv[i + 1]) args.input = argv[++i];
    if (current === '--output' && argv[i + 1]) args.output = argv[++i];
    if (current === '--preview' && argv[i + 1]) args.preview = Math.max(1, Number(argv[++i]) || 40);
    if (current === '--missing-mega-preview' && argv[i + 1]) args.missingMegaPreview = Math.max(1, Number(argv[++i]) || 80);
    if (current === '--missing-youtube-preview' && argv[i + 1]) args.missingYoutubePreview = Math.max(1, Number(argv[++i]) || 80);
  }

  return args;
}

function escapeMdCell(value) {
  return String(value ?? '')
    .replace(/\|/g, '\\|')
    .replace(/\n/g, ' ')
    .trim();
}

function topN(list, n = 10) {
  const map = new Map();
  for (const item of list) {
    const key = String(item || '').trim();
    if (!key) continue;
    map.set(key, (map.get(key) || 0) + 1);
  }
  return Array.from(map.entries())
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .slice(0, n);
}

function renderTopList(title, entries) {
  const lines = [`### ${title}`];
  if (!entries.length) {
    lines.push('- Sin datos');
    return lines.join('\n');
  }

  for (const [name, count] of entries) {
    lines.push(`- ${name}: ${count}`);
  }
  return lines.join('\n');
}

function main() {
  const args = parseArgs(process.argv);
  const inputPath = resolve(args.input);
  const outputPath = resolve(args.output);

  const raw = readFileSync(inputPath, 'utf-8');
  const parsed = JSON.parse(raw);
  const meta = parsed.meta || {};
  const songs = Array.isArray(parsed.songs) ? parsed.songs : [];

  const total = songs.length;
  const withMega = songs.filter((s) => s.megaUrl).length;
  const withoutMega = total - withMega;
  const withYoutube = songs.filter((s) => s.youtubeUrl).length;
  const withoutYoutube = total - withYoutube;
  const withoutArtist = songs.filter((s) => !s.artist).length;
  const withoutGenres = songs.filter((s) => !Array.isArray(s.genres) || s.genres.length === 0).length;
  const withoutOccasions = songs.filter((s) => !Array.isArray(s.occasions) || s.occasions.length === 0).length;

  const topArtists = topN(songs.map((s) => s.artist), 12);
  const topGenres = topN(songs.flatMap((s) => (Array.isArray(s.genres) ? s.genres : [])), 12);
  const topOccasions = topN(songs.flatMap((s) => (Array.isArray(s.occasions) ? s.occasions : [])), 12);

  const previewRows = songs.slice(0, args.preview);
  const missingMegaRows = songs.filter((s) => !s.megaUrl).slice(0, args.missingMegaPreview);
  const missingYoutubeRows = songs.filter((s) => !s.youtubeUrl).slice(0, args.missingYoutubePreview);

  const lines = [];
  lines.push('# WordPress Migration Report');
  lines.push('');
  lines.push('## Resumen');
  lines.push(`- Fecha de extraccion: ${meta.extractedAt || 'N/A'}`);
  lines.push(`- API base: ${meta.apiBase || 'N/A'}`);
  lines.push(`- Total canciones: ${total}`);
  lines.push(`- Con megaUrl: ${withMega}`);
  lines.push(`- Sin megaUrl: ${withoutMega}`);
  lines.push(`- Con youtubeUrl: ${withYoutube}`);
  lines.push(`- Sin youtubeUrl: ${withoutYoutube}`);
  lines.push(`- Sin artista principal: ${withoutArtist}`);
  lines.push(`- Sin generos: ${withoutGenres}`);
  lines.push(`- Sin ocasiones: ${withoutOccasions}`);
  lines.push('');

  lines.push(renderTopList('Top artistas', topArtists));
  lines.push('');
  lines.push(renderTopList('Top generos', topGenres));
  lines.push('');
  lines.push(renderTopList('Top ocasiones', topOccasions));
  lines.push('');

  lines.push('## Vista previa (primeras canciones)');
  lines.push('');
  lines.push('| # | Title | Artist | Genres | Occasions | Mega | YouTube | Source URL |');
  lines.push('|---|---|---|---|---|---|---|---|');
  previewRows.forEach((song, idx) => {
    const genres = (song.genres || []).join(', ');
    const occasions = (song.occasions || []).join(', ');
    const mega = song.megaUrl ? 'SI' : 'NO';
    const youtube = song.youtubeUrl ? 'SI' : 'NO';
    lines.push(
      `| ${idx + 1} | ${escapeMdCell(song.title)} | ${escapeMdCell(song.artist)} | ${escapeMdCell(genres)} | ${escapeMdCell(occasions)} | ${mega} | ${youtube} | ${escapeMdCell(song.sourceUrl)} |`
    );
  });
  lines.push('');

  lines.push('## Canciones sin youtubeUrl (muestra)');
  lines.push('');
  if (!missingYoutubeRows.length) {
    lines.push('- Todas las canciones tienen youtubeUrl.');
  } else {
    missingYoutubeRows.forEach((song) => {
      lines.push(`- ${song.title} (${song.artist || 'Sin artista'}) - ${song.sourceUrl || 'Sin URL de origen'}`);
    });
  }
  lines.push('');

  lines.push('## Canciones sin megaUrl (muestra)');
  lines.push('');
  if (!missingMegaRows.length) {
    lines.push('- Todas las canciones tienen megaUrl.');
  } else {
    missingMegaRows.forEach((song) => {
      lines.push(`- ${song.title} (${song.artist || 'Sin artista'}) - ${song.sourceUrl || 'Sin URL de origen'}`);
    });
  }
  lines.push('');

  lines.push('## Notas');
  lines.push('- Este reporte es de preparacion de migracion, aun no inserta nada en Firestore.');
  lines.push('- Para enriquecer categorias y YouTube, ejecuta: npm run wp:enrich.');
  lines.push('- Si quieres mejorar deteccion de Mega, vuelve a correr extraccion con --scan-pages.');

  mkdirSync(dirname(outputPath), { recursive: true });
  writeFileSync(outputPath, lines.join('\n'), 'utf-8');

  console.log(`Report generated: ${outputPath}`);
}

main();
