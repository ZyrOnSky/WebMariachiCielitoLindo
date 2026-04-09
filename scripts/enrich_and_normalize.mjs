import fs from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import ytSearch from 'yt-search';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const dbPath = join(__dirname, '../docs/merged_songs_gemini.json');
const data = JSON.parse(fs.readFileSync(dbPath, 'utf8'));

// Regex and Map to normalize categories
const normalizeCategory = (cat) => {
  cat = cat.trim();
  const mapping = {
    "Velorios Y Sepelios": "Velorios y Sepelios",
    "Aniversarios Y Románticas": "Aniversarios y Románticas",
    "Día De La Madre": "Día de la Madre",
    "Día Del Padre": "Día del Padre",
    "Bodas Y Matrimonios": "Bodas y Matrimonios",
  };
  return mapping[cat] || cat;
}

async function runEnrichment() {
  console.log(`Paso 1: Normalizando ${data.length} canciones...`);
  
  data.forEach(song => {
    // Normalizar Ocasiones/Categorías
    if (song.categories && Array.isArray(song.categories)) {
      const normalizedCategories = song.categories.map(normalizeCategory);
      // Eliminar duplicados lógicos (ej. "Día de la Madre" y "Día De La Madre")
      song.categories = [...new Set(normalizedCategories)];
    }
  });
  
  console.log('✅ Categorías normalizadas.');
  console.log('\nPaso 2: Buscando enlaces de YouTube faltantes...');

  let updatedUrls = 0;
  
  // Procesar una por una para no saturar yt-search
  for (let i = 0; i < data.length; i++) {
    const song = data[i];
    
    // Si no tiene url o está vacía, buscamos
    if (!song.youtubeUrl || song.youtubeUrl.trim() === '' || song.youtubeUrl === 'N/A') {
      try {
        const queryTerm = `${song.title} ${song.artist} mariachi`;
        console.log(`[${i+1}/${data.length}] Buscando: ${queryTerm}...`);
        
        const r = await ytSearch(queryTerm);
        if (r && r.videos && r.videos.length > 0) {
          song.youtubeUrl = r.videos[0].url;
          updatedUrls++;
        } else {
          console.log(`  \x1b[33mNo se encontró video para:\x1b[0m ${song.title}`);
        }
        
        // Pequeño delay de 500ms para evitar limit ratios
        await new Promise(resolve => setTimeout(resolve, 500));
        
      } catch (err) {
        console.error(`  \x1b[31mError buscando ${song.title}:\x1b[0m ${err.message}`);
      }
    }
  }

  // Guardamos cambios
  fs.writeFileSync(dbPath, JSON.stringify(data, null, 2), 'utf8');
  console.log('\n=======================================');
  console.log(`🎉 Proceso completado exitosamente.`);
  console.log(`📝 Enlaces de YouTube agregados: ${updatedUrls}`);
  console.log(`=======================================\n`);
}

runEnrichment();
