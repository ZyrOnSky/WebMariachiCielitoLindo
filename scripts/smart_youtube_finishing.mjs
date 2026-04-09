import fs from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import ytSearch from 'yt-search';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const dbPath = join(__dirname, '../docs/merged_songs_gemini.json');
const data = JSON.parse(fs.readFileSync(dbPath, 'utf8'));

async function smartYoutubeFinishing() {
  console.log('🚀 Iniciando Buscador Inteligente V3 (Evitador de Duplicados)...');
  
  // 1. Mapear todos los videos que ya existen para NO REPETIRLOS
  const usedUrls = new Set();
  data.forEach(song => {
    if (song.youtubeUrl && song.youtubeUrl.trim() !== '') {
      usedUrls.add(song.youtubeUrl.trim());
    }
  });
  
  console.log(`📊 Videos verificados actualmente: ${usedUrls.size}`);
  console.log(`🎯 Objetivo: Llenar los huecos restantes evitando duplicidad.\n`);

  let updatedCount = 0;
  let skippedCount = 0;

  for (let i = 0; i < data.length; i++) {
    const song = data[i];

    // Solo procesamos si no tiene video
    if (!song.youtubeUrl || song.youtubeUrl.trim() === '') {
      try {
        // Criterio de búsqueda ultra-específico
        const queryTerm = `${song.title} ${song.artist} mariachi audio oficial`;
        console.log(`[${i + 1}/${data.length}] Buscando para: ${song.title} - ${song.artist}...`);

        const r = await ytSearch(queryTerm);
        
        if (r && r.videos && r.videos.length > 0) {
          // Tomamos las primeras 5 opciones para tener margen de maniobra
          const candidates = r.videos.slice(0, 5);
          
          // Buscamos el primer candidato que no esté en nuestra lista de usados
          let selectedVideo = null;
          for (const vid of candidates) {
            if (!usedUrls.has(vid.url)) {
              selectedVideo = vid;
              break;
            }
          }

          if (selectedVideo) {
            song.youtubeUrl = selectedVideo.url;
            usedUrls.add(selectedVideo.url);
            updatedCount++;
            console.log(`  ✅ Enlace asignado: ${selectedVideo.title.substring(0, 40)}...`);
          } else {
            console.log(`  ⚠️  Se encontraron videos, pero todos ya están usados en otras canciones.`);
            skippedCount++;
          }
        } else {
          console.log(`  ❌ No se encontraron resultados en YouTube.`);
          skippedCount++;
        }

        // Delay para evitar Rate Limiting (Google es estricto)
        await new Promise(resolve => setTimeout(resolve, 800));

        // Guardar cada 10 canciones por si falla el terminal o la conexión
        if (updatedCount % 10 === 0 && updatedCount > 0) {
          fs.writeFileSync(dbPath, JSON.stringify(data, null, 2), 'utf8');
        }

      } catch (err) {
        console.error(`  🚨 Error en búsqueda: ${err.message}`);
      }
    }
  }

  // Guardado Final
  fs.writeFileSync(dbPath, JSON.stringify(data, null, 2), 'utf8');

  console.log(`\n=======================================`);
  console.log(`🎉 ¡PROCESO FINALIZADO CON ÉXITO!`);
  console.log(`✅ Nuevos videos únicos agregados: ${updatedCount}`);
  console.log(`🛑 Canciones sin resultados aptos: ${skippedCount}`);
  console.log(`📦 Base de datos 'merged_songs_gemini.json' actualizada.`);
  console.log(`=======================================\n`);
}

smartYoutubeFinishing();
