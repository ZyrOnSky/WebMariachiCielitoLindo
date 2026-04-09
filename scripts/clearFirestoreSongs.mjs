#!/usr/bin/env node

import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs, deleteDoc } from 'firebase/firestore';
import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

console.log('🔥 Iniciando purga de la colección "songs" en Firestore...');

try {
  // Cargar configuración de Firebase
  const configPath = join(__dirname, '../firebase-applet-config.json');
  const firebaseConfig = JSON.parse(readFileSync(configPath, 'utf-8'));

  // Inicializar Firebase
  const app = initializeApp(firebaseConfig);
  const db = getFirestore(app);

  async function clearDatabase() {
    try {
      const songsRef = collection(db, 'songs');
      const snapshot = await getDocs(songsRef);
      
      if (snapshot.empty) {
        console.log('✅ La base de datos ya está vacía. No hay canciones para borrar.');
        process.exit(0);
      }

      console.log(`⚠️ Se encontraron ${snapshot.size} canciones de prueba / anteriores.`);
      console.log('Procediendo a eliminarlas una por una...');
      
      let deletedCount = 0;
      for (const snapshotDoc of snapshot.docs) {
        await deleteDoc(snapshotDoc.ref);
        deletedCount++;
        process.stdout.write(`\r🗑️ Borrando: ${deletedCount} / ${snapshot.size}`);
      }
      
      console.log('\n✨ ¡Limpieza completada! La base de datos ha quedado totalmente en blanco.');
      process.exit(0);
    } catch (error) {
      console.error('\n❌ Error al limpiar la base de datos:', error);
      process.exit(1);
    }
  }

  clearDatabase();

} catch (err) {
  console.error('❌ No se pudo cargar la configuración de Firebase:', err.message);
  process.exit(1);
}