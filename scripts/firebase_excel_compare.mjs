import { readFile, writeFile } from 'fs/promises';
import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs, Timestamp } from 'firebase/firestore';

const configText = await readFile(new URL('../firebase-applet-config.json', import.meta.url), 'utf-8');
const firebaseConfig = JSON.parse(configText);
const app = initializeApp(firebaseConfig);
const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);

const songsCol = collection(db, 'songs');
console.log('Fetching songs from Firestore...');
const snapshot = await getDocs(songsCol);
const songs = [];
snapshot.forEach(doc => songs.push({ id: doc.id, ...doc.data() }));
console.log(`Fetched ${songs.length} songs.`);

const jsonPath = new URL('../docs/firebase_songs.json', import.meta.url);
await writeFile(jsonPath, JSON.stringify(songs, (key, value) => {
  if (value instanceof Timestamp) {
    return value.toDate().toISOString();
  }
  return value;
}, 2), 'utf-8');
console.log('Wrote', jsonPath.pathname);

const mdText = await readFile(new URL('../docs/Repertorio Clasificado.md', import.meta.url), 'utf-8');
const lines = mdText.split(/\r?\n/);
const excelCategories = [];
let currentCat = null;
for (const rawLine of lines) {
  const line = rawLine.trim();
  const heading = line.match(/^###\s+(.*)$/);
  if (heading) {
    currentCat = { name: heading[1].trim(), items: [] };
    excelCategories.push(currentCat);
    continue;
  }
  if (!currentCat) continue;
  const item = line.match(/^-\s+\*\*(.*?)\*\*\s+[—-]\s+(.*)$/);
  if (item) {
    currentCat.items.push({ title: item[1].trim(), artist: item[2].trim() });
  }
}

const excelSongsIndex = new Map();
for (const category of excelCategories) {
  for (const item of category.items) {
    const key = `${item.title.toLowerCase()}___${item.artist.toLowerCase()}`;
    const entry = excelSongsIndex.get(key) || { title: item.title, artist: item.artist, categories: new Set() };
    entry.categories.add(category.name);
    excelSongsIndex.set(key, entry);
  }
}

const firebaseCategories = new Map();
const firebaseSongIndex = new Map();
for (const song of songs) {
  const title = String(song.title || '').trim();
  const artist = String(song.artist || '').trim();
  const key = `${title.toLowerCase()}___${artist.toLowerCase()}`;
  const occasions = Array.isArray(song.occasions) ? song.occasions.map(String).map((o) => o.trim()) : [];
  firebaseSongIndex.set(key, { id: song.id, title, artist, categories: occasions, link: song.link || song.youtubeUrl || '', raw: song });
  for (const occasion of occasions) {
    const list = firebaseCategories.get(occasion) || [];
    list.push(key);
    firebaseCategories.set(occasion, list);
  }
}

const excelOnlySongs = [];
const firebaseOnlySongs = [];
const matchedSongs = [];
for (const [key, excelEntry] of excelSongsIndex.entries()) {
  if (firebaseSongIndex.has(key)) {
    matchedSongs.push({ key, excel: excelEntry, firebase: firebaseSongIndex.get(key) });
  } else {
    excelOnlySongs.push(excelEntry);
  }
}
for (const [key, firebaseEntry] of firebaseSongIndex.entries()) {
  if (!excelSongsIndex.has(key)) {
    firebaseOnlySongs.push(firebaseEntry);
  }
}

const reportLines = [];
reportLines.push('# Reporte comparativo Firestore vs Excel');
reportLines.push('');
reportLines.push('Este reporte compara las canciones clasificadas en el Excel con los registros actualmente presentes en Firestore.');
reportLines.push('');
reportLines.push('## Resumen general');
reportLines.push('');
reportLines.push(`- Canciones en Firestore: ${songs.length}`);
reportLines.push(`- Canciones únicas en Excel: ${excelSongsIndex.size}`);
reportLines.push(`- Categorías en Excel: ${excelCategories.length}`);
reportLines.push(`- Categorías en Firestore: ${firebaseCategories.size}`);
reportLines.push(`- Canciones coincidentes exactas (título + artista): ${matchedSongs.length}`);
reportLines.push(`- Canciones presentes solo en Excel: ${excelOnlySongs.length}`);
reportLines.push(`- Canciones presentes solo en Firestore: ${firebaseOnlySongs.length}`);
reportLines.push('');

const excelCategoryCounts = excelCategories.map((cat) => ({ name: cat.name, count: cat.items.length }));
const firebaseCategoryCounts = Array.from(firebaseCategories.entries()).map(([name, list]) => ({ name, count: list.length }));
const topFirebaseCategories = firebaseCategoryCounts.sort((a, b) => b.count - a.count).slice(0, 10);
reportLines.push('## Categorías principales en Firestore');
reportLines.push('');
for (const cat of topFirebaseCategories) {
  reportLines.push(`- **${cat.name}**: ${cat.count} canciones`);
}
reportLines.push('');

const excelCategorySet = new Set(excelCategories.map((cat) => cat.name));
const firebaseCategorySet = new Set(firebaseCategories.keys());
const categoriesOnlyInExcel = Array.from(excelCategorySet).filter((name) => !firebaseCategorySet.has(name));
const categoriesOnlyInFirebase = Array.from(firebaseCategorySet).filter((name) => !excelCategorySet.has(name));
reportLines.push('## Discrepancias de categorías');
reportLines.push('');
reportLines.push(`- Categorías en Excel pero no en Firestore: ${categoriesOnlyInExcel.length}`);
if (categoriesOnlyInExcel.length > 0) {
  reportLines.push('');
  categoriesOnlyInExcel.slice(0, 20).forEach((name) => reportLines.push(`  - ${name}`));
}
reportLines.push('');
reportLines.push(`- Categorías en Firestore pero no en Excel: ${categoriesOnlyInFirebase.length}`);
if (categoriesOnlyInFirebase.length > 0) {
  reportLines.push('');
  categoriesOnlyInFirebase.slice(0, 20).forEach((name) => reportLines.push(`  - ${name}`));
}
reportLines.push('');
reportLines.push('## Hallazgos adicionales');
reportLines.push('');
reportLines.push(`- Canciones en Excel sin registro en Firestore: ${excelOnlySongs.length}`);
reportLines.push(`- Canciones en Firestore sin registro en Excel: ${firebaseOnlySongs.length}`);
reportLines.push('');
if (excelOnlySongs.length > 0) {
  reportLines.push('### Ejemplos de canciones solo en Excel');
  reportLines.push('');
  excelOnlySongs.slice(0, 10).forEach((song) => reportLines.push(`- **${song.title}** — ${song.artist}`));
  reportLines.push('');
}
if (firebaseOnlySongs.length > 0) {
  reportLines.push('### Ejemplos de canciones solo en Firestore');
  reportLines.push('');
  firebaseOnlySongs.slice(0, 10).forEach((song) => reportLines.push(`- **${song.title}** — ${song.artist} — Categorías: ${song.categories.join(', ')}`));
  reportLines.push('');
}

const reportPath = new URL('../docs/firebase_vs_excel_report.md', import.meta.url);
await writeFile(reportPath, reportLines.join('\n'), 'utf-8');
console.log('Wrote report to', reportPath.pathname);
