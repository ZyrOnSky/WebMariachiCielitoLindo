import { readFile, writeFile } from 'fs/promises';

const normalize = (text = '') =>
  text
    .toString()
    .normalize('NFKD')
    .replace(/\p{Diacritic}/gu, '')
    .replace(/\s+/g, ' ')
    .replace(/[“”‘’«»"'`]/g, '')
    .replace(/[–—_]/g, '-')
    .replace(/[.,;:!?()\[\]{}]/g, '')
    .replace(/\s*[-–—]\s*/g, ' - ')
    .trim()
    .toLowerCase();

const normalizeArtist = (artist = '') => {
  const text = normalize(artist);
  return text
    .replace(/^el\s+/, '')
    .replace(/^la\s+/, '')
    .replace(/^los\s+/, '')
    .replace(/^las\s+/, '')
    .replace(/\bmariachi\b\s*/g, '')
    .replace(/\s+/g, ' ')
    .trim();
};

const normalizeCategory = (category = '') => {
  const text = normalize(category)
    .replace(/\s*\(.*\)$/, '')
    .replace(/\b(canciones|para|de|y)\b/g, '')
    .replace(/\s+/g, ' ')
    .trim();

  const canonical = {
    'quinceanera': 'quinceaneras',
    'quinceañera': 'quinceañeras',
    'bodas': 'bodas',
    'serenata': 'serenata',
    'ambientacion': 'ambientación',
    'funerales': 'funerales',
    'cumpleanos': 'cumpleaños',
    'dia de la madre': 'día de la madre',
    'dia del padre': 'día del padre',
    'religioso': 'religioso',
    'aniversarios': 'aniversarios',
    'graduaciones': 'graduaciones',
    'despecho': 'despecho',
    'fiestas': 'fiestas',
    'velorios y sepelios': 'funerales',
    'canciones para mama': 'día de la madre',
    'canciones para papa': 'día del padre',
    'romanticas': 'bodas',
  };
  return canonical[text] || text;
};

const loadExcel = async () => {
  const md = await readFile(new URL('../docs/Repertorio Clasificado.md', import.meta.url), 'utf-8');
  const lines = md.split(/\r?\n/);
  const categories = [];
  let current = null;
  for (const rawLine of lines) {
    const line = rawLine.trim();
    const heading = line.match(/^###\s+(.*)$/);
    if (heading) {
      current = { name: heading[1].trim(), normalizedName: normalizeCategory(heading[1].trim()), items: [] };
      categories.push(current);
      continue;
    }
    if (!current) continue;
    const item = line.match(/^[-*]\s+\*\*(.*?)\*\*\s+[—-]\s+(.*)$/);
    if (item) {
      current.items.push({
        title: item[1].trim(),
        normalizedTitle: normalize(item[1].trim()),
        artist: item[2].trim(),
        normalizedArtist: normalizeArtist(item[2].trim()),
        originalCategory: current.name,
        normalizedCategory: current.normalizedName,
      });
    }
  }
  return categories;
};

const loadFirebase = async () => {
  const json = await readFile(new URL('../docs/firebase_songs.json', import.meta.url), 'utf-8');
  const songs = JSON.parse(json);
  return songs.map((song) => ({
    id: song.id,
    title: String(song.title || '').trim(),
    normalizedTitle: normalize(String(song.title || '')),
    artist: String(song.artist || '').trim(),
    normalizedArtist: normalizeArtist(String(song.artist || '')),
    occasions: Array.isArray(song.occasions) ? song.occasions.map((o) => String(o || '').trim()) : [],
    normalizedOccasions: Array.isArray(song.occasions) ? song.occasions.map((o) => normalizeCategory(String(o || ''))) : [],
    link: song.youtubeUrl || song.link || '',
    raw: song,
  }));
};

const getBestCategoryMatch = (category, firebaseCategories) => {
  const normalized = normalizeCategory(category);
  if (firebaseCategories.has(normalized)) return normalized;
  for (const candidate of firebaseCategories.keys()) {
    if (candidate.includes(normalized) || normalized.includes(candidate)) return candidate;
  }
  return null;
};

const main = async () => {
  const excelCategories = await loadExcel();
  const firebaseSongs = await loadFirebase();
  const firebaseCategories = new Map();
  firebaseSongs.forEach((song) => {
    for (const cat of song.normalizedOccasions) {
      const list = firebaseCategories.get(cat) || [];
      list.push(song);
      firebaseCategories.set(cat, list);
    }
  });

  const firebaseSongIndex = new Map();
  firebaseSongs.forEach((song) => {
    firebaseSongIndex.set(`${song.normalizedTitle}___${song.normalizedArtist}`, song);
  });

  const normalizedExcelSongs = [];
  const songKeys = new Set();

  for (const category of excelCategories) {
    for (const item of category.items) {
      const key = `${item.normalizedTitle}___${item.normalizedArtist}`;
      const existing = normalizedExcelSongs.find((song) => song.key === key);
      if (existing) {
        existing.originalCategories.add(item.originalCategory);
        existing.normalizedCategories.add(item.normalizedCategory);
        continue;
      }
      songKeys.add(key);
      const exactMatch = firebaseSongIndex.get(key);
      const normalizedCategory = normalizeCategory(item.originalCategory);
      const mappedCategory = getBestCategoryMatch(item.originalCategory, firebaseCategories);
      normalizedExcelSongs.push({
        key,
        title: item.title,
        normalizedTitle: item.normalizedTitle,
        artist: item.artist,
        normalizedArtist: item.normalizedArtist,
        originalCategories: new Set([item.originalCategory]),
        normalizedCategories: new Set([normalizedCategory]),
        mappedCategory,
        firestoreMatch: exactMatch ? { id: exactMatch.id, occasions: exactMatch.occasions, link: exactMatch.link } : null,
        youtubeUrl: exactMatch?.link || '',
      });
    }
  }

  const merged = normalizedExcelSongs.map((item) => ({
    title: item.title,
    normalizedTitle: item.normalizedTitle,
    artist: item.artist,
    normalizedArtist: item.normalizedArtist,
    originalCategories: Array.from(item.originalCategories),
    normalizedCategories: Array.from(item.normalizedCategories),
    mappedCategory: item.mappedCategory || null,
    firestoreMatch: item.firestoreMatch,
    youtubeUrl: item.youtubeUrl,
  }));

  const onlyExcel = merged.filter((item) => !item.firestoreMatch);
  const matched = merged.filter((item) => item.firestoreMatch);
  const categoriesOnlyExcel = Array.from(new Set(excelCategories.map((c) => c.name))).filter((c) => !getBestCategoryMatch(c, firebaseCategories));

  await writeFile(new URL('../docs/excel_normalized.json', import.meta.url), JSON.stringify(merged, null, 2), 'utf-8');

  const report = [];
  report.push('# Migración preparada: Excel vs Firestore');
  report.push('');
  report.push('## Resumen');
  report.push('');
  report.push(`- Canciones únicas en Excel (después de normalizar título y artista): ${merged.length}`);
  report.push(`- Canciones con coincidencia exacta en Firestore: ${matched.length}`);
  report.push(`- Canciones sin coincidencia en Firestore: ${onlyExcel.length}`);
  report.push(`- Categorías originales de Excel: ${excelCategories.length}`);
  report.push(`- Categorías de Firestore detectadas: ${firebaseCategories.size}`);
  report.push(`- Categorías de Excel sin mapeo sugerido: ${categoriesOnlyExcel.length}`);
  report.push('');
  report.push('## Categorías de Excel sin correspondencia directa en Firestore');
  report.push('');
  categoriesOnlyExcel.slice(0, 40).forEach((cat) => report.push(`- ${cat}`));
  report.push('');
  report.push('## Ejemplos de canciones sin coincidencia en Firestore');
  report.push('');
  onlyExcel.slice(0, 20).forEach((item) => {
    report.push(`- **${item.title}** — ${item.artist} | Categorías: ${Array.from(item.originalCategories).join(', ')} | Mapeo categoría sugerido: ${item.mappedCategory || 'ninguno'}`);
  });
  report.push('');
  report.push('## Ejemplos de coincidencias exactas en Firestore');
  report.push('');
  matched.slice(0, 20).forEach((item) => report.push(`- **${item.title}** — ${item.artist} | Firestore ID: ${item.firestoreMatch.id} | Categorías Firestore: ${item.firestoreMatch.occasions.join(', ')}`));
  report.push('');
  report.push('## Próximos pasos');
  report.push('');
  report.push('- Revisar `docs/excel_normalized.json` y confirmar los mapeos sugeridos de categorías.');
  report.push('- Ejecutar `scripts/find_youtube_urls.mjs` para obtener enlaces de YouTube para canciones sin `youtubeUrl`.');

  await writeFile(new URL('../docs/migration_report.md', import.meta.url), report.join('\n'), 'utf-8');
  console.log('Prepared migration files: docs/excel_normalized.json, docs/migration_report.md');
};

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
