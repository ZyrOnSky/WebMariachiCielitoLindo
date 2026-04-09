import { initializeApp } from 'firebase/app';
import { getFirestore, collection, doc, writeBatch } from 'firebase/firestore';
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

// Cargar el JSON procesado
const mergedSongsFile = join(__dirname, '../docs/merged_songs_gemini.json');
const mergedSongs = JSON.parse(readFileSync(mergedSongsFile, 'utf-8'));

async function seedMergedSongs() {
  try {
    console.log('🌱 Iniciando la actualización/inserción de canciones en Firestore...');
    console.log(`Total de canciones a procesar: ${mergedSongs.length}`);

    const songsCollection = collection(db, 'songs');
    const seedUserId = 'seed-user-excel-' + Date.now();
    let updatedCount = 0;
    let addedCount = 0;

    // Firestore permite un máximo de 500 operaciones por batch.
    // Usaremos un tamaño conservador de 400.
    const BATCH_SIZE = 400;
    
    // Función helper para procesar en bloques
    const chunks = [];
    for (let i = 0; i < mergedSongs.length; i += BATCH_SIZE) {
      chunks.push(mergedSongs.slice(i, i + BATCH_SIZE));
    }

    for (const [index, chunk] of chunks.entries()) {
      const batch = writeBatch(db);
      
      for (const songData of chunk) {
        // Clonamos el objeto y eliminamos atributos de control que no van a la base de datos
        const { firestoreId, source, ...cleanedSong } = songData;
        
        let docRef;
        if (firestoreId) {
          // Actualización de un documento existente
          docRef = doc(db, 'songs', firestoreId);
          cleanedSong.updatedAt = new Date();
          
          batch.set(docRef, cleanedSong, { merge: true });
          updatedCount++;
        } else {
          // Documento nuevo
          docRef = doc(songsCollection);
          cleanedSong.createdAt = new Date();
          cleanedSong.createdBy = seedUserId;
          
          batch.set(docRef, cleanedSong);
          addedCount++;
        }
      }

      await batch.commit();
      console.log(`✅ Lote ${index + 1}/${chunks.length} procesado con éxito.`);
    }

    // --- RECONSTRUIR Y ACTUALIZAR EL DOCUMENTO `catalog/master` ---
    // Extraer valores únicos directamente del nuevo array saneado
    const uniqueArtists = [...new Set(mergedSongs.map(s => s.artist))].filter(Boolean).sort();
    const uniqueGenres = [...new Set(mergedSongs.flatMap(s => s.genres || []))].filter(Boolean).sort();
    const uniqueOccasions = [...new Set(mergedSongs.flatMap(s => s.occasions || []))].filter(Boolean).sort();

    const catalogRef = doc(db, 'catalog', 'master');
    const catalogBatch = writeBatch(db);
    catalogBatch.set(catalogRef, {
      artists: uniqueArtists,
      genres: uniqueGenres,
      occasions: uniqueOccasions
    });
    await catalogBatch.commit();
    console.log(`✅ Catálogo maestro ('catalog/master') reconstruido y actualizado correctamente con la data purificada.`);

    console.log('\n=======================================');
    console.log(`🎉 Inserción y actualización exitosa.`);
    console.log(`📝 Canciones actualizadas: ${updatedCount}`);
    console.log(`✨ Nuevas canciones agregadas: ${addedCount}`);
    console.log(`=======================================\n`);
    
    process.exit(0);

  } catch (error) {
    console.error('❌ Error al procesar las canciones:', error?.code || error);
    if (error?.message) {
      console.error('📋 Mensaje:', error.message);
    }
    
    if (error?.code === 'permission-denied' || error?.code === 'PERMISSION_DENIED') {
      console.error('\n⚠️  Permisos insuficientes:');
      console.error('1. Cambia temporalmente las reglas de Firestore en la consola a:');
      console.error('   allow read, write: if true;');
      console.error('2. Ejecuta nuevamente: npm run seed:merge\n');
    }
    process.exit(1);
  }
}

// Ejecutar
seedMergedSongs();
