import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs, writeBatch, doc, deleteDoc } from 'firebase/firestore';
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

function normalize(s) {
  if (!s) return "";
  return s.toLowerCase().trim().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
}

async function rescueSongs() {
  try {
    console.log('🛰️  Iniciando operación de rescate de base de datos...');
    
    // 1. Obtener todas las canciones actuales
    const snapshot = await getDocs(collection(db, 'songs'));
    const allSongs = [];
    snapshot.forEach(d => allSongs.push({ id: d.id, ...d.data() }));

    const visibleSongs = allSongs.filter(s => !!s.createdAt);
    const ghostSongs = allSongs.filter(s => !s.createdAt);

    console.log(`📊 Panorama actual: ${visibleSongs.length} visibles y ${ghostSongs.length} fantasmas.`);

    // 2. Mapear visibles para detectar duplicados
    const visibleKeys = new Set(visibleSongs.map(s => `${normalize(s.title)}|${normalize(s.artist)}`));

    const toDelete = [];
    const toRescue = [];

    ghostSongs.forEach(song => {
      const key = `${normalize(song.title)}|${normalize(song.artist)}`;
      if (visibleKeys.has(key)) {
        toDelete.push(song);
      } else {
        toRescue.push(song);
      }
    });

    console.log(`🧹 Por borrar (duplicados): ${toDelete.length}`);
    console.log(`🚑 Por rescatar (únicos): ${toRescue.length}`);

    // 3. Procesar en lotes de 400 (limite Firestore es 500)
    const BATCH_SIZE = 400;
    const allOperations = [
      ...toDelete.map(s => ({ type: 'delete', doc: s })),
      ...toRescue.map(s => ({ type: 'rescue', doc: s }))
    ];

    for (let i = 0; i < allOperations.length; i += BATCH_SIZE) {
      const batch = writeBatch(db);
      const chunk = allOperations.slice(i, i + BATCH_SIZE);

      chunk.forEach(op => {
        const docRef = doc(db, 'songs', op.doc.id);
        if (op.type === 'delete') {
          batch.delete(docRef);
        } else {
          // Usar updatedAt si existe, si no, usar la fecha actual
          const rescueTime = op.doc.updatedAt 
            ? (op.doc.updatedAt.toDate ? op.doc.updatedAt.toDate() : new Date())
            : new Date();

          batch.update(docRef, {
            createdAt: rescueTime,
            createdBy: 'admin-rescue-system',
            // No agregamos 'dots' por petición del usuario
          });
        }
      });

      await batch.commit();
      console.log(`✅ Procesado lote ${Math.floor(i / BATCH_SIZE) + 1} (${chunk.length} operaciones).`);
    }

    console.log('\n✨ OPERACIÓN DE RESCATE FINALIZADA ✨');
    console.log(`- Canciones eliminadas: ${toDelete.length}`);
    console.log(`- Canciones rescatadas y visibles: ${toRescue.length}`);
    console.log(`- Total de canciones finales visibles: ${visibleSongs.length + toRescue.length}`);
    console.log('-------------------------------------------');

    process.exit(0);
  } catch (error) {
    console.error('❌ Error fatal en la operación:', error);
    process.exit(1);
  }
}

rescueSongs();
