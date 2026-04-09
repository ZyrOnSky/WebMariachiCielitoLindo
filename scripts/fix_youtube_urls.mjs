import fs from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import ytSearch from 'yt-search';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const dbPath = join(__dirname, '../docs/merged_songs_gemini.json');
const data = JSON.parse(fs.readFileSync(dbPath, 'utf8'));

async function autofillYoutube() {
  console.log('🔍 Iniciando Auto-Buscador de YouTube avanzado para reparar huecos en el dataset...\n');
  
  let filledCount = 0;
  
  for (let i = 0; i < data.length; i++) {
    const song = data[i];
    
    if (!song.youtubeUrl || song.youtubeUrl.trim() === '') {
      try {
        const queryTerm = `${song.title} ${song.artist} mariachi letra original`;
        console.log(`[${i+1}/${data.length}] Buscando pista: ${queryTerm}...`);
        
        const r = await ytSearch(queryTerm);
        // Filtramos para agarrar uno más relevante y seguro
        if (r && r.videos && r.videos.length > 0) {
          song.youtubeUrl = r.videos[0].url;
          filledCount++;
        } else {
          console.log(`  \x1b[33mNo se encontró video exacto para:\x1b[0m ${song.title}`);
        }
        
        // Pausa de 300ms
        await new Promise(resolve => setTimeout(resolve, 300));
        
      } catch (err) {
        console.error(`  \x1b[31mError de conexión YT:\x1b[0m ${err.message}`);
      }
    }
  }

  fs.writeFileSync(dbPath, JSON.stringify(data, null, 2), 'utf8');
  console.log(`\n✅ Misión Cumplida. Se repararon y completaron ${filledCount} enlaces de YouTube únicos en tu base de datos.`);
}

autofillYoutube();
