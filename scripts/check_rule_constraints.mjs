import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const jsonPath = join(__dirname, '../docs/listas_json/final_purified_songs.json');

try {
  const songs = JSON.parse(readFileSync(jsonPath, 'utf-8'));
  
  const oversized = songs.filter(s => 
    (s.genres && s.genres.length > 10) || 
    (s.occasions && s.occasions.length > 10) ||
    (s.title && s.title.length > 100) ||
    (s.artist && s.artist.length > 100)
  );

  console.log(`🔍 REVISIÓN DE RESTRICCIONES EN EL JSON`);
  console.log(`Total de canciones: ${songs.length}`);
  console.log(`⚠️ Canciones que exceden los límites de las reglas de Firestore (max 10 etiquetas / 100 chars): ${oversized.length}`);

  oversized.slice(0, 5).forEach(s => {
    console.log(`- ${s.title} (${s.artist})`);
    console.log(`  Géneros: ${s.genres ? s.genres.length : 0}, Ocasiones: ${s.occasions ? s.occasions.length : 0}`);
    console.log(`  Title Len: ${s.title ? s.title.length : 0}, Artist Len: ${s.artist ? s.artist.length : 0}`);
  });

} catch (error) {
  console.error(error);
}
