import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs, doc, getDoc } from 'firebase/firestore';
import { readFileSync, writeFileSync } from 'fs';
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

async function createBackup() {
  try {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backupSongsPath = join(__dirname, `../docs/backups/songs_backup_${timestamp}.json`);
    const backupCatalogPath = join(__dirname, `../docs/backups/catalog_backup_${timestamp}.json`);

    console.log('📡 Conectando con Firestore para descargar el respaldo...');

    // 1. Descargar Canciones
    console.log('📥 Obteniendo colección "songs"...');
    const songsSnapshot = await getDocs(collection(db, 'songs'));
    const songsData = [];
    songsSnapshot.forEach((doc) => {
      songsData.push({
        id: doc.id,
        ...doc.data()
      });
    });

    console.log(`✅ Se recuperaron ${songsData.length} canciones.`);
    writeFileSync(backupSongsPath, JSON.stringify(songsData, null, 2));
    console.log(`💾 Respaldo de canciones guardado en: ${backupSongsPath}`);

    // 2. Descargar Catálogo (Filtros, Artistas, etc)
    console.log('📥 Obteniendo documento "catalog/master"...');
    const catalogDoc = await getDoc(doc(db, 'catalog', 'master'));
    if (catalogDoc.exists()) {
      const catalogData = catalogDoc.data();
      writeFileSync(backupCatalogPath, JSON.stringify(catalogData, null, 2));
      console.log(`💾 Respaldo de catálogo guardado en: ${backupCatalogPath}`);
    } else {
      console.warn('⚠️ No se encontró el documento "catalog/master".');
    }

    console.log('\n✨ OPERACIÓN COMPLETADA CON ÉXITO ✨');
    console.log('-----------------------------------');
    console.log(`Resumen de respaldo (${timestamp}):`);
    console.log(`- Canciones: ${songsData.length}`);
    console.log(`- Ruta: docs/backups/songs_backup_${timestamp}.json`);
    console.log('-----------------------------------');

  } catch (error) {
    console.error('❌ Error durante el respaldo:', error);
    process.exit(1);
  }
}

createBackup();
