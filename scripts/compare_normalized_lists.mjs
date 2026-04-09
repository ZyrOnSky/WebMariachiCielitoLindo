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
    'quinceanera': 'quinceañeras',
    'quinceaneras': 'quinceañeras',
    'quinceañaeras': 'quinceañeras',
    'bodas': 'bodas',
    'serenata': 'serenata',
    'ambientacion': 'ambientación',
    'funerales': 'funerales',
    'cumpleanos': 'cumpleaños',
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
    'romanticas (aniversarios enamorados pedidas de mano)': 'aniversarios',
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
    'juvenil o nuevo': 'juvenil',
  };
  return canonical[text] || text;
};

const loadJson = async (path) => JSON.parse(await readFile(new URL(path, import.meta.url), 'utf-8'));

const main = async () => {
  const excel = await loadJson('../docs/excel_normalized.json');
  const firestore = await loadJson('../docs/firebase_songs.json');

  const excelIndexed = new Map();
  excel.forEach((item) => {
    const key = `${normalize(item.normalizedTitle)}___${normalize(item.normalizedArtist)}`;
    excelIndexed.set(key, item);
  });

  const firestoreIndexed = new Map();
  firestore.forEach((item) => {
    const title = normalize(item.title || '');
    const artist = normalizeArtist(item.artist || '');
    const key = `${title}___${artist}`;
    const occasions = Array.isArray(item.occasions) ? item.occasions.map(normalizeCategory) : [];
    firestoreIndexed.set(key, { ...item, normalizedTitle: title, normalizedArtist: artist, normalizedOccasions: occasions });
  });

  const exactMatches = [];
  const excelOnly = [];
  const firestoreOnly = [];
  const potentiallySimilar = [];

  for (const [key, item] of excelIndexed.entries()) {
    if (firestoreIndexed.has(key)) {
      exactMatches.push({ excel: item, firestore: firestoreIndexed.get(key) });
    } else {
      excelOnly.push(item);
    }
  }
  for (const [key, item] of firestoreIndexed.entries()) {
    if (!excelIndexed.has(key)) {
      firestoreOnly.push(item);
    }
  }

  const excelCategorySet = new Set(excel.map((item) => normalizeCategory(item.normalizedCategories[0] || '')));
  const firestoreCategorySet = new Set(firestore.flatMap((item) => item.occasions ? item.occasions.map(normalizeCategory) : []));

  const summary = [];
  summary.push('# Comparación actualizada de listas normalizadas');
  summary.push('');
  summary.push(`- Registros únicos normalizados en Excel: ${excel.length}`);
  summary.push(`- Registros en Firestore: ${firestore.length}`);
  summary.push(`- Coincidencias exactas por título+artista: ${exactMatches.length}`);
  summary.push(`- Canciones normalizadas de Excel sin match en Firestore: ${excelOnly.length}`);
  summary.push(`- Canciones de Firestore sin match en Excel: ${firestoreOnly.length}`);
  summary.push('');
  summary.push('## Categorías normalizadas en Excel vs Firestore');
  summary.push('');
  summary.push(`- Categorías normalizadas detectadas en Excel: ${excelCategorySet.size}`);
  summary.push(`- Categorías normalizadas detectadas en Firestore: ${firestoreCategorySet.size}`);
  summary.push('');
  summary.push('### Categorías únicas en Excel');
  summary.push('');
  Array.from(excelCategorySet).sort().forEach((cat) => summary.push(`- ${cat}`));
  summary.push('');
  summary.push('### Categorías únicas en Firestore');
  summary.push('');
  Array.from(firestoreCategorySet).sort().forEach((cat) => summary.push(`- ${cat}`));
  summary.push('');
  summary.push('## Ejemplos');
  summary.push('');
  summary.push('### Ejemplos de coincidencias exactas');
  summary.push('');
  exactMatches.slice(0, 20).forEach(({ excel, firestore }) => {
    summary.push(`- **${excel.title}** — ${excel.artist} | Categoría Excel: ${excel.normalizedCategories.join(', ')} | Categorías Firestore: ${firestore.normalizedOccasions.join(', ')}`);
  });
  summary.push('');
  summary.push('### Ejemplos sólo en Excel');
  summary.push('');
  excelOnly.slice(0, 20).forEach((item) => {
    summary.push(`- **${item.title}** — ${item.artist} | Categoría Excel: ${item.normalizedCategories.join(', ')} | Sugerido: ${normalizeCategory(item.normalizedCategories[0] || '')}`);
  });
  summary.push('');
  summary.push('### Ejemplos sólo en Firestore');
  summary.push('');
  firestoreOnly.slice(0, 20).forEach((item) => {
    summary.push(`- **${item.title}** — ${item.artist} | Categorías Firestore: ${item.normalizedOccasions.join(', ')} | YouTube: ${item.youtubeUrl || 'N/A'}`);
  });

  await writeFile(new URL('../docs/normalized_firestore_comparison.md', import.meta.url), summary.join('\n'), 'utf-8');
  console.log('Comparison report written to docs/normalized_firestore_comparison.md');
};

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
