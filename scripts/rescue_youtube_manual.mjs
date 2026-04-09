import { readFileSync, writeFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const firebasePath = join(__dirname, '../docs/firebase_songs.json');
const mergedPath = join(__dirname, '../docs/merged_songs_gemini.json');

// Cargar archivos
const firebaseData = JSON.parse(readFileSync(firebasePath, 'utf8'));
const mergedData = JSON.parse(readFileSync(mergedPath, 'utf8'));

console.log(`🔍 Iniciando rescate de enlaces manuales...`);
console.log(`Leídas ${firebaseData.length} canciones de Firebase (Fuentes confiables).`);
console.log(`Leídas ${mergedData.length} canciones del nuevo listado consolidado.`);

// Crear un mapa de búsqueda basado en Título + Artista (Normalizado)
const generateKey = (title, artist) => {
  const clean = (str) => (str || '').toString().toLowerCase().trim()
    .normalize("NFD").replace(/[\u0300-\u036f]/g, "") // Quitar acentos para el match
    .replace(/[^\w\s]/gi, ''); // Quitar puntuación
  return `${clean(title)}|${clean(artist)}`;
};

const trustedYoutubeMap = new Map();
let trustedLinksFound = 0;

firebaseData.forEach(song => {
  if (song.youtubeUrl && song.youtubeUrl.trim() !== '' && song.youtubeUrl !== 'N/A') {
    const key = generateKey(song.title, song.artist);
    trustedYoutubeMap.set(key, song.youtubeUrl);
    trustedLinksFound++;
  }
});

console.log(`✅ Mapa de confianza creado con ${trustedLinksFound} enlaces verificados.`);

// Actualizar el archivo consolidado
let restoredCount = 0;
const updatedMergedData = mergedData.map(song => {
  const key = generateKey(song.title, song.artist);
  if (trustedYoutubeMap.has(key)) {
    const oldUrl = song.youtubeUrl;
    const newUrl = trustedYoutubeMap.get(key);
    
    // Si el link es diferente al que puso la IA, restauramos el manual
    if (oldUrl !== newUrl) {
      song.youtubeUrl = newUrl;
      restoredCount++;
    }
  }
  return song;
});

writeFileSync(mergedPath, JSON.stringify(updatedMergedData, null, 2), 'utf8');

console.log(`\n=======================================`);
console.log(`🎉 ¡RESCATE COMPLETADO!`);
console.log(`🔗 Enlaces restaurados desde tu trabajo manual: ${restoredCount}`);
console.log(`📦 El archivo 'merged_songs_gemini.json' ya contiene tu curación personal.`);
console.log(`=======================================\n`);
