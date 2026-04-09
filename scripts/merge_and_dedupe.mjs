import { readFile, writeFile } from 'fs/promises';

const normalize = (text = '') =>
  String(text)
    .normalize('NFKD')
    .replace(/\p{Diacritic}/gu, '')
    .replace(/\s+/g, ' ')
    .replace(/[“”‘’«»"'`]/g, '')
    .replace(/[–—_]/g, '-')
    .replace(/[.,;:!?()\[\]{}]/g, '')
    .replace(/\s*[-–—]\s*/g, ' - ')
    .trim()
    .toLowerCase();

const normalizeArtist = (artist = '') =>
  normalize(artist)
    .replace(/^el\s+/, '')
    .replace(/^la\s+/, '')
    .replace(/^los\s+/, '')
    .replace(/^las\s+/, '')
    .replace(/\bmariachi\b\s*/g, '')
    .replace(/\s+/g, ' ')
    .trim();

const normalizeCategory = (category = '') => {
  const text = normalize(category)
    .replace(/\s*\(.*\)$/, '')
    .replace(/\b(canciones|para|de|y)\b/g, '')
    .replace(/\s+/g, ' ')
    .trim();

  const canonical = {
    'quinceanera': 'quinceañeras',
    'quinceaneras': 'quinceañeras',
    'quinceañaeras': 'quinceañeras',
    'bodas': 'bodas',
    'boda': 'bodas',
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
    'romanticas': 'aniversarios',
    'romanticas aniversarios enamorados pedidas mano': 'aniversarios',
    'entrada': 'entrada',
    'reconciliaciones': 'despecho',
    'cristiana': 'religioso',
    'la boda': 'bodas',
    'catolico y cantos a la virgen': 'religioso',
    'despedidas': 'fiestas',
    'corridos': 'corridos',
    'cumbias': 'cumbias',
    'merengues': 'merengues',
    'salsa': 'salsa',
    'musica nacional': 'música nacional',
    'instrumentales o de espectaculos': 'instrumentales',
    'instrumentales': 'instrumentales',
    'juvenil o nuevo': 'juvenil',
    'juvenil': 'juvenil',
    'mama': 'día de la madre',
    'papa': 'día del padre',
  };

  return canonical[text] || text;
};

const titleArtistKey = (title, artist) => `${normalize(title)}___${normalizeArtist(artist)}`;

const mergeLists = (excel, firestore) => {
  const firestoreMap = new Map();
  firestore.forEach((item) => {
    const key = titleArtistKey(item.title || '', item.artist || '');
    const normalizedOccasions = Array.isArray(item.occasions)
      ? Array.from(new Set(item.occasions.map(normalizeCategory).filter(Boolean)))
      : [];
    firestoreMap.set(key, {
      ...item,
      normalizedTitle: normalize(item.title || ''),
      normalizedArtist: normalizeArtist(item.artist || ''),
      normalizedOccasions,
      source: 'firestore',
    });
  });

  const merged = [];
  const processed = new Set();

  excel.forEach((item) => {
    const key = titleArtistKey(item.normalizedTitle, item.normalizedArtist);
    const excelCats = Array.from(new Set((item.normalizedCategories || []).map(normalizeCategory).filter(Boolean)));
    const firestoreMatch = firestoreMap.get(key);
    if (firestoreMatch) {
      processed.add(key);
      merged.push({
        title: item.title,
        artist: item.artist,
        normalizedTitle: item.normalizedTitle,
        normalizedArtist: item.normalizedArtist,
        categories: Array.from(new Set([...(firestoreMatch.normalizedOccasions || []), ...excelCats])),
        source: 'excel+firestore',
        youtubeUrl: firestoreMatch.youtubeUrl || firestoreMatch.link || item.youtubeUrl || '',
        firestoreId: firestoreMatch.id,
        firestoreCategories: firestoreMatch.normalizedOccasions,
        excelCategories: excelCats,
      });
    } else {
      merged.push({
        title: item.title,
        artist: item.artist,
        normalizedTitle: item.normalizedTitle,
        normalizedArtist: item.normalizedArtist,
        categories: excelCats,
        source: 'excel',
        youtubeUrl: item.youtubeUrl || '',
        firestoreId: null,
        firestoreCategories: [],
        excelCategories: excelCats,
      });
    }
  });

  firestore.forEach((item) => {
    const key = titleArtistKey(item.title || '', item.artist || '');
    if (processed.has(key)) return;
    const normalizedOccasions = Array.isArray(item.occasions)
      ? Array.from(new Set(item.occasions.map(normalizeCategory).filter(Boolean)))
      : [];
    merged.push({
      title: item.title || '',
      artist: item.artist || '',
      normalizedTitle: normalize(item.title || ''),
      normalizedArtist: normalizeArtist(item.artist || ''),
      categories: normalizedOccasions,
      source: 'firestore',
      youtubeUrl: item.youtubeUrl || item.link || '',
      firestoreId: item.id,
      firestoreCategories: normalizedOccasions,
      excelCategories: [],
    });
  });

  return merged;
};

const main = async () => {
  const excel = JSON.parse(await readFile(new URL('../docs/excel_normalized.json', import.meta.url), 'utf-8'));
  const firestore = JSON.parse(await readFile(new URL('../docs/firebase_songs.json', import.meta.url), 'utf-8'));
  const merged = mergeLists(excel, firestore);
  const mergedJsonPath = new URL('../docs/merged_songs.json', import.meta.url);
  await writeFile(mergedJsonPath, JSON.stringify(merged, null, 2), 'utf-8');

  const report = [];
  report.push('# Fusión limpia de Excel y Firestore');
  report.push('');
  report.push(`- Registros de Excel normalizados: ${excel.length}`);
  report.push(`- Registros en Firestore: ${firestore.length}`);
  report.push(`- Registros fusionados (union con deduplicación exacta): ${merged.length}`);
  report.push('');
  report.push('## Uniones y fuentes');
  report.push('');
  report.push(`- Registros combinados (Excel + Firestore): ${merged.filter((item) => item.source === 'excel+firestore').length}`);
  report.push(`- Registros exclusivos de Excel: ${merged.filter((item) => item.source === 'excel').length}`);
  report.push(`- Registros exclusivos de Firestore: ${merged.filter((item) => item.source === 'firestore').length}`);
  report.push('');
  report.push('## Ejemplos de fusiones exactas');
  report.push('');
  merged.filter((item) => item.source === 'excel+firestore').slice(0, 20).forEach((item) => {
    report.push(`- **${item.title}** — ${item.artist} | Categorías fusionadas: ${item.categories.join(', ')} | YouTube: ${item.youtubeUrl || 'N/A'}`);
  });
  report.push('');
  report.push('## Ejemplos exclusivos de Excel');
  report.push('');
  merged.filter((item) => item.source === 'excel').slice(0, 20).forEach((item) => {
    report.push(`- **${item.title}** — ${item.artist} | Categorías: ${item.categories.join(', ')} | YouTube: ${item.youtubeUrl || 'N/A'}`);
  });
  report.push('');
  report.push('## Ejemplos exclusivos de Firestore');
  report.push('');
  merged.filter((item) => item.source === 'firestore').slice(0, 20).forEach((item) => {
    report.push(`- **${item.title}** — ${item.artist} | Categorías: ${item.categories.join(', ')} | YouTube: ${item.youtubeUrl || 'N/A'}`);
  });

  await writeFile(new URL('../docs/merge_report.md', import.meta.url), report.join('\n'), 'utf-8');
  console.log('Wrote docs/merged_songs.json and docs/merge_report.md');
};

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
