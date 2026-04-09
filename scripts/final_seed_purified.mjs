import { initializeApp } from 'firebase/app';
import { getFirestore, collection, writeBatch, doc } from 'firebase/firestore';
import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Cargar configuración de Firebase
const firebaseConfig = JSON.parse(
  readFileSync(join(__dirname, '../firebase-applet-config.json'), 'utf-8')
);

// Inicializar Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function runFinalSeed() {
  try {
    const jsonPath = join(__dirname, '../docs/final_purified_songs.json');
    const songs = JSON.parse(readFileSync(jsonPath, 'utf-8'));

    console.log('🚀 INICIANDO CARGA MAESTRA DE CANCIONES...');
    console.log(`📦 Canciones a cargar: ${songs.length}`);

    const songsCollection = collection(db, 'songs');
    const BATCH_SIZE = 400;

    // 1. Cargar Canciones en lotes
    for (let i = 0; i < songs.length; i += BATCH_SIZE) {
      const batch = writeBatch(db);
      const chunk = songs.slice(i, i + BATCH_SIZE);

      chunk.forEach(songData => {
        const docRef = doc(songsCollection); // ID auto-generado
        // Convertimos el string de createdAt a Objeto Date para Firestore si es necesario
        const dataToSave = { ...songData };
        if (typeof dataToSave.createdAt === 'string') {
          dataToSave.createdAt = new Date(dataToSave.createdAt);
        }
        batch.set(docRef, dataToSave);
      });

      await batch.commit();
      console.log(`✅ Lote ${Math.floor(i / BATCH_SIZE) + 1} cargado (${chunk.length} canciones).`);
    }

    // 2. Reconstruir Catálogo Maestro
    console.log('\n📦 Generando Catálogo Maestro (Filtros)...');
    const artists = [...new Set(songs.map(s => s.artist))].filter(Boolean).sort();
    const genres = [...new Set(songs.flatMap(s => s.genres || []))].filter(Boolean).sort();
    const occasions = [...new Set(songs.flatMap(s => s.occasions || []))].filter(Boolean).sort();

    const catalogRef = doc(db, 'catalog', 'master');
    const catalogBatch = writeBatch(db);
    catalogBatch.set(catalogRef, {
      artists,
      genres,
      occasions,
      updatedAt: new Date()
    });
    
    await catalogBatch.commit();
    console.log('✅ Catálogo Maestro creado con éxito.');

    console.log('\n✨ OPERACIÓN DE SEED COMPLETADA ✨');
    console.log(`- Canciones en base de datos: ${songs.length}`);
    console.log(`- Artistas: ${artists.length}`);
    console.log('-----------------------------------');

    process.exit(0);

  } catch (error) {
    console.error('❌ Error durante el seed:', error);
    if (error.code === 'permission-denied') {
      console.error('\n⚠️ ACCESO DENEGADO: Recuerda abrir las reglas de Firestore (allow write: if true) antes de ejecutar.');
    }
    process.exit(1);
  }
}

runFinalSeed();
