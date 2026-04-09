import { initializeApp } from 'firebase/app';
import { getFirestore, collection, addDoc, serverTimestamp, doc, setDoc } from 'firebase/firestore';
import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

try {
  const configPath = join(__dirname, '../firebase-applet-config.json');
  const firebaseConfig = JSON.parse(readFileSync(configPath, 'utf-8'));
  const app = initializeApp(firebaseConfig);
  const db = getFirestore(app);

  const dataPath = join(__dirname, '../data/wp-songs-ai-final.json');
  const data = JSON.parse(readFileSync(dataPath, 'utf-8'));

  async function runMigration() {
    console.log(`\n?? Iniciando la MigraciÃ³n Masiva a Firestore de ${data.songs.length} canciones...`);

    // 1. Extraer catÃ¡logo general de artistas, gÃ©neros y ocasiones
    const genres = new Set();
    const occasions = new Set();
    const artists = new Set();

    data.songs.forEach(s => {
      if (s.artist) artists.add(s.artist);
      (s.genres || []).forEach(g => genres.add(g));
      (s.occasions || []).forEach(o => occasions.add(o));
    });

    const catalogDoc = {
      genres: Array.from(genres).sort(),
      occasions: Array.from(occasions).sort(),
      artists: Array.from(artists).sort(),
    };

    console.log('?? Subiendo diccionario global "catalog/master"...');
    await setDoc(doc(db, 'catalog', 'master'), catalogDoc);
    console.log('âœ… CatÃ¡logo maestro subido.');

    // 2. Subir canciones
    const songsRef = collection(db, 'songs');
    let count = 0;

    for (const song of data.songs) {
      const docData = {
        title: song.title.substring(0, 99),
        artist: song.artist.substring(0, 99),
        genres: (song.genres || []).map(g => g.substring(0, 29)),
        occasions: (song.occasions || []).map(o => o.substring(0, 29)),
        createdAt: serverTimestamp(),
        createdBy: 'admin-migration-script'
      };

      if (song.megaUrl) docData.link = song.megaUrl.substring(0, 499);
      if (song.youtubeUrl) docData.youtubeUrl = song.youtubeUrl.substring(0, 499);

      await addDoc(songsRef, docData);
      count++;
      process.stdout.write(`\r?? Canto migrado: ${count} / ${data.songs.length}`);
    }

    console.log(`\n\nâœ✨ Â¡MigraciÃ³n exitosÃ­sima! Las ${count} maravillas han sido alojadas en Google Cloud.`);
    process.exit(0);
  }

  runMigration();

} catch (err) {
  console.error("âŒ Error en script de migraciÃ³n:", err);
  process.exit(1);
}
