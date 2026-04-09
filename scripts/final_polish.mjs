import fs from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const dbPath = join(__dirname, '../docs/merged_songs_gemini.json');
let data = JSON.parse(fs.readFileSync(dbPath, 'utf8'));

console.log(`🧹 Iniciando Pulido Final y Corrección de Errores Ortográficos...`);

const corrections = [
  { from: /Que Dios de bendiga/i, to: 'Que Dios te bendiga' },
  { from: /Cómo No Creer En Dios/i, to: 'Cómo No Creer en Dios' },
];

let typoFixed = 0;
data = data.map(song => {
  let changed = false;
  corrections.forEach(c => {
    if (c.from.test(song.title)) {
      song.title = c.to;
      changed = true;
    }
  });
  if (changed) typoFixed++;
  return song;
});

console.log(`✅ Corregidos ${typoFixed} errores de escritura (incluyendo "Que Dios te bendiga").`);

// 2. Detección de Redundancias Críticas (Mismo título, artistas muy similares o redundantes)
// Si una canción existe bajo "Mariachi Vargas..." y bajo "Desconocido" o "Varios Artistas...", eliminamos la genérica.
const songMap = new Map();
const toDelete = new Set();

// Clasificar canciones por título
data.forEach((song, index) => {
  const titleKey = song.title.toLowerCase().trim();
  if (!songMap.has(titleKey)) songMap.set(titleKey, []);
  songMap.get(titleKey).push({ song, index });
});

let redundantFixed = 0;
songMap.forEach((versions, title) => {
  if (versions.length > 1) {
    // Buscar si hay una versión de "Mariachi Vargas" o "Vicente Fernández" vs una de "Desconocido"
    const highQuality = versions.find(v => 
      ['Mariachi Vargas de Tecalitlán', 'Vicente Fernández', 'Luis Miguel', 'Javier Solís'].includes(v.song.artist)
    );
    const generic = versions.find(v => 
      ['Desconocido / Varios', 'Varios Artistas Cristianos', 'Varios Artistas'].includes(v.song.artist)
    );

    if (highQuality && generic) {
      // Fusionar géneros y ocasiones antes de borrar la genérica para no perder metadata
      highQuality.song.genres = [...new Set([...highQuality.song.genres, ...generic.song.genres])];
      highQuality.song.occasions = [...new Set([...highQuality.song.occasions, ...generic.song.occasions])];
      toDelete.add(generic.index);
      redundantFixed++;
    }
    
    // Caso específico: Mariachi Vargas vs Mariachi Estelar para la misma canción (redundancia común en este dataset)
    const vargas = versions.find(v => v.song.artist === 'Mariachi Vargas de Tecalitlán');
    const estelar = versions.find(v => v.song.artist === 'Mariachi Estelar');
    if (vargas && estelar) {
        vargas.song.genres = [...new Set([...vargas.song.genres, ...estelar.song.genres])];
        vargas.song.occasions = [...new Set([...vargas.song.occasions, ...estelar.song.occasions])];
        toDelete.add(estelar.index);
        redundantFixed++;
    }
  }
});

// Eliminar las marcadas
const finalData = data.filter((_, index) => !toDelete.has(index));

fs.writeFileSync(dbPath, JSON.stringify(finalData, null, 2), 'utf8');

console.log(`✅ Eliminadas ${redundantFixed} canciones redundantes (fusiones de metadatos completadas).`);
console.log(`📦 Catálogo final reducido a ${finalData.length} canciones únicas y corregidas.`);
