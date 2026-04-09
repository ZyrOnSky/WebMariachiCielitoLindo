import fs from 'fs';
import path from 'path';
import ytSearch from 'yt-search';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DATA_DIR = path.resolve(__dirname, '../data');

const PENDING_PATH = path.join(DATA_DIR, 'wp-enrichment-pending.json');
const RULES_PATH = path.join(DATA_DIR, 'wp-enrichment-rules.json');

const delay = (ms) => new Promise(res => setTimeout(res, ms));

async function run() {
  console.log('🤖 Iniciando Auto-Fetcher de YouTube...');

  if (!fs.existsSync(PENDING_PATH)) {
    console.error('❌ No se encontró el archivo de pendientes.');
    return;
  }
  if (!fs.existsSync(RULES_PATH)) {
    console.error('❌ No se encontró el archivo de reglas.');
    return;
  }

  const pendingData = JSON.parse(fs.readFileSync(PENDING_PATH, 'utf-8'));
  const rulesData = JSON.parse(fs.readFileSync(RULES_PATH, 'utf-8'));

  if (!rulesData.bySourceId) {
    rulesData.bySourceId = {};
  }

  const songsToFetch = pendingData.pending.filter(s => s.missing?.youtubeUrl);
  console.log(`🔎 Se encontraron ${songsToFetch.length} canciones sin YouTube.`);

  let successCount = 0;
  let failCount = 0;

  for (let i = 0; i < songsToFetch.length; i++) {
    const song = songsToFetch[i];
    
    // Si ya existe por alguna razón manual en las reglas pero estaba mal, lo sobreescribimos
    // O si ya tiene un valor válido (no vacío), lo saltamos.
    if (rulesData.bySourceId[song.sourceId] && rulesData.bySourceId[song.sourceId].youtubeUrl) {
        if (rulesData.bySourceId[song.sourceId].youtubeUrl.length > 10) {
            console.log(`[${i + 1}/${songsToFetch.length}] ⏭️ Saltando ${song.title} (Ya en reglas)`);
            continue;
        }
    }

    const artist = song.artist !== 'Desconocido' ? song.artist : '';
    const query = `${song.title} ${artist} mariachi`;
    
    try {
      console.log(`[${i + 1}/${songsToFetch.length}] Buscando: "${query}"...`);
      const r = await ytSearch(query);
      const videos = r.videos;
      
      if (videos.length > 0) {
        const topVideo = videos[0];
        
        if (!rulesData.bySourceId[song.sourceId]) {
          rulesData.bySourceId[song.sourceId] = {};
        }
        
        rulesData.bySourceId[song.sourceId].youtubeUrl = topVideo.url;
        successCount++;
        console.log(`   ✅ Encontrado: ${topVideo.title} -> ${topVideo.url}`);
      } else {
        failCount++;
        console.log(`   ⚠️ Sin resultados para: ${song.title}`);
      }
    } catch (e) {
      failCount++;
      console.error(`   ❌ Error buscando ${song.title}:`, e.message);
    }

    // Guardar el json cada 10 canciones para no perder progreso en caso de fallo
    if ((i + 1) % 10 === 0) {
      fs.writeFileSync(RULES_PATH, JSON.stringify(rulesData, null, 2));
    }

    // Pequeño delay para no abrumar a YouTube ni que nos tire error 429
    await delay(1000); 
  }

  // Guardado final
  fs.writeFileSync(RULES_PATH, JSON.stringify(rulesData, null, 2));
  
  console.log('\n🎉 Auto-Fetch terminado!');
  console.log(`✅ Agregados: ${successCount}`);
  console.log(`⚠️ Fallidos/Sin resultados: ${failCount}`);
  console.log('📝 Recuerda correr: npm run wp:enrich para aplicar los cambios.');
}

run();