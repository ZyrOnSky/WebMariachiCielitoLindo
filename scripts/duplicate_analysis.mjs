import { readFile } from 'fs/promises';

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
    'juvenil o nuevo': 'juvenil',
  };
  return canonical[text] || text;
};

const countDuplicates = (items, keyFn) => {
  const counts = new Map();
  for (const item of items) {
    const key = keyFn(item);
    counts.set(key, (counts.get(key) || 0) + 1);
  }
  const duplicates = Array.from(counts.entries()).filter(([, v]) => v > 1);
  return { total: items.length, unique: counts.size, duplicates: duplicates.length, sample: duplicates.slice(0, 10) };
};

const main = async () => {
  const excel = JSON.parse(await readFile(new URL('../docs/excel_normalized.json', import.meta.url), 'utf-8'));
  const firestore = JSON.parse(await readFile(new URL('../docs/firebase_songs.json', import.meta.url), 'utf-8'));

  const excelCats = new Set();
  excel.forEach((item) => {
    (item.normalizedCategories || []).forEach((cat) => excelCats.add(normalizeCategory(cat)));
  });
  const firestoreCats = new Set();
  firestore.forEach((item) => {
    (item.occasions || []).forEach((cat) => firestoreCats.add(normalizeCategory(cat)));
  });

  const excelTitleStats = countDuplicates(excel, (item) => normalize(item.normalizedTitle));
  const excelArtistStats = countDuplicates(excel, (item) => normalizeArtist(item.normalizedArtist));
  const excelKeyStats = countDuplicates(excel, (item) => `${normalize(item.normalizedTitle)}___${normalizeArtist(item.normalizedArtist)}`);

  const firestoreInputs = firestore.map((item) => ({
    normalizedTitle: normalize(item.title || ''),
    normalizedArtist: normalizeArtist(item.artist || ''),
    occasions: (item.occasions || []).map(normalizeCategory),
  }));
  const firestoreTitleStats = countDuplicates(firestoreInputs, (item) => item.normalizedTitle);
  const firestoreArtistStats = countDuplicates(firestoreInputs, (item) => item.normalizedArtist);
  const firestoreKeyStats = countDuplicates(firestoreInputs, (item) => `${item.normalizedTitle}___${item.normalizedArtist}`);

  console.log('Excel title duplicates:', excelTitleStats);
  console.log('Excel artist duplicates:', excelArtistStats);
  console.log('Excel title+artist duplicates:', excelKeyStats);
  console.log('Firestore title duplicates:', firestoreTitleStats);
  console.log('Firestore artist duplicates:', firestoreArtistStats);
  console.log('Firestore title+artist duplicates:', firestoreKeyStats);
  console.log('Excel normalized categories:', excelCats.size, Array.from(excelCats).sort());
  console.log('Firestore normalized categories:', firestoreCats.size, Array.from(firestoreCats).sort());
};

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
