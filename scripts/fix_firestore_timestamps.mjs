import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs, writeBatch, doc, Timestamp } from 'firebase/firestore';
import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const firebaseConfig = JSON.parse(
  readFileSync(join(__dirname, '../firebase-applet-config.json'), 'utf-8')
);

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function fixTimestamps() {
  try {
    console.log('🛠️ Iniciando corrección de tipos de Timestamp en toda la base de datos...');
    const snapshot = await getDocs(collection(db, 'songs'));
    
    let docsToUpdate = [];
    
    snapshot.forEach(d => {
      const data = d.data();
      if (data.createdAt && typeof data.createdAt === 'object' && !data.createdAt.toDate) {
        // Es un objeto anidado estilo JSON, no un timestamp real
        let realTimestamp;
        if (data.createdAt.seconds) {
           realTimestamp = new Timestamp(data.createdAt.seconds, data.createdAt.nanoseconds || 0);
        } else {
           realTimestamp = Timestamp.fromDate(new Date());
        }
        docsToUpdate.push({ id: d.id, realTimestamp });
      } else if (typeof data.createdAt === 'string') {
        docsToUpdate.push({ id: d.id, realTimestamp: Timestamp.fromDate(new Date(data.createdAt)) });
      }
    });

    console.log(`Encontrados ${docsToUpdate.length} documentos con el formato de fecha corrupto.`);

    const BATCH_SIZE = 400;
    for (let i = 0; i < docsToUpdate.length; i += BATCH_SIZE) {
      const batch = writeBatch(db);
      const chunk = docsToUpdate.slice(i, i + BATCH_SIZE);

      chunk.forEach(updateData => {
        batch.update(doc(db, 'songs', updateData.id), {
          createdAt: updateData.realTimestamp
        });
      });

      await batch.commit();
      console.log(`✅ Lote parcheado.`);
    }

    console.log('✅ Todos los timestamps arreglados. Ya no deberías tener problemas con las reglas.');
    process.exit(0);

  } catch (err) {
    console.error('Error:', err);
    process.exit(1);
  }
}

fixTimestamps();
