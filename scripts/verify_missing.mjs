import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const jsonPath = join(__dirname, '../docs/final_purified_songs.json');

try {
  const songs = JSON.parse(readFileSync(jsonPath, 'utf-8'));
  
  const targets = ["Bidi", "Cariñito", "Tabaco", "Como te voy", "La Conga", "La Murga"];
  
  console.log('🔍 BUSCANDO CANCIONES "FALTANTES" EN EL JSON PURIFICADO');
  console.log('====================================================');

  targets.forEach(query => {
    console.log(`\n🔎 Buscando: "${query}"`);
    const matches = songs.filter(s => s.title.toLowerCase().includes(query.toLowerCase()));
    
    if (matches.length > 0) {
      matches.forEach((song, index) => {
        console.log(`   ✅ ENCONTRADA: "${song.title}" - ${song.artist}`);
      });
    } else {
      console.log(`   ❌ NO ENCONTRADA`);
    }
  });

} catch (error) {
  console.error(error);
}
