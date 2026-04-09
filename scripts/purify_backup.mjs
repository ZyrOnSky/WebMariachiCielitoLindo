import { readFileSync, writeFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const backupFile = 'songs_backup_2026-04-08T19-33-19-219Z.json';
const backupPath = join(__dirname, '../docs/backups/', backupFile);
const outputPath = join(__dirname, '../docs/final_purified_songs.json');

function normalize(s) {
  if (!s) return "";
  return s.toLowerCase().trim().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
}

try {
  const songs = JSON.parse(readFileSync(backupPath, 'utf-8'));
  console.log(`📥 Cargando ${songs.length} canciones del respaldo...`);

  // Diccionario para manejar duplicados (Key: Artist|Title)
  // Guardaremos la mejor versión disponible
  const catalog = new Map();

  songs.forEach(song => {
    const key = `${normalize(song.artist)}|${normalize(song.title)}`;
    const currentBest = catalog.get(key);

    // Criterios de "Mejor Versión":
    // 1. Si tiene createdAt es mejor que una que no lo tiene.
    // 2. Si tiene enlace de Mega es mejor que una que no lo tiene.
    // 3. Mas géneros/ocasiones.
    
    if (!currentBest) {
      catalog.set(key, song);
    } else {
      // Comparar para ver si reemplazamos
      let replace = false;
      
      if (!currentBest.createdAt && song.createdAt) replace = true;
      else if (currentBest.createdAt && song.createdAt) {
          // Ambos tienen fecha, mantenemos la que tenga Mega o mas datos
          if (!currentBest.link && song.link) replace = true;
      } else if (!currentBest.createdAt && !song.createdAt) {
          // Ninguno tiene fecha, mantenemos cualquiera con mas datos
          if (!currentBest.link && song.link) replace = true;
      }

      if (replace) {
        catalog.set(key, song);
      }
    }
  });

  const purifiedList = Array.from(catalog.values()).map(song => {
    // Limpieza final de campos
    const { id, dots, firestoreId, source, ...cleaned } = song;
    
    // Asegurar que tenga createdAt para que sea visible
    if (!cleaned.createdAt) {
      cleaned.createdAt = song.updatedAt || new Date().toISOString();
    }
    
    cleaned.createdBy = "admin-purification-cleanup";
    
    return cleaned;
  });

  // Guardar resultado
  writeFileSync(outputPath, JSON.stringify(purifiedList, null, 2));

  console.log('\n✨ PURIFICACIÓN COMPLETADA ✨');
  console.log('----------------------------');
  console.log(`- Canciones originales: ${songs.length}`);
  // Analizar cuantos duplicados se eliminaron
  // En este caso, 492 originales -> 489 únicos (porque 3 eran duplicados)
  console.log(`- Canciones únicas finales: ${purifiedList.length}`);
  console.log(`- Archivo generado: docs/final_purified_songs.json`);
  console.log('----------------------------');
  
  // Resumen de Catálogo para verificación
  const artists = [...new Set(purifiedList.map(s => s.artist))].sort();
  const genres = [...new Set(purifiedList.flatMap(s => s.genres || []))].sort();
  const occasions = [...new Set(purifiedList.flatMap(s => s.occasions || []))].sort();
  
  console.log('📦 Resumen del nuevo catálogo:');
  console.log(`   - Artistas: ${artists.length}`);
  console.log(`   - Géneros: ${genres.length}`);
  console.log(`   - Ocasiones: ${occasions.length}`);

} catch (error) {
  console.error('❌ Error:', error);
}
