import { readFileSync, writeFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const dbPath = join(__dirname, '../docs/merged_songs_gemini.json');
let data = JSON.parse(readFileSync(dbPath, 'utf8'));

// Diccionario pesado de corrección de artistas 
const artistFixMap = {
  'Luis migel': 'Luis Miguel',
  'jose jose': 'José José',
  'Jose Jose': 'José José',
  'jesse uribe': 'Jessi Uribe',
  'Jesse Uribe': 'Jessi Uribe',
  'Chino y Nacho': 'Chino & Nacho',
  'Cristian Nodal': 'Christian Nodal',
  'Marco Antonio Solis': 'Marco Antonio Solís',
  'Javier Solis': 'Javier Solís',
  'Olga Tañon': 'Olga Tañón',
  'Mariachi Sol de México': 'Mariachi Sol De México',
  'Mariachi Sol De Mexico': 'Mariachi Sol De México',
  'Mariachi Sol de Mexico': 'Mariachi Sol De México',
  'Mariachi Vargas De Tecalitlan': 'Mariachi Vargas de Tecalitlán',
  'Mariachi Vargas': 'Mariachi Vargas de Tecalitlán',
  'Mariachi estelar': 'Mariachi Estelar',
  'Mariachi camperos': 'Mariachi Camperos',
  'Mariachi Camperos de Nati Cano': 'Mariachi Camperos',
  'Miguel A. Mejias': 'Miguel A. Mejía',
  'Pedro Fernandez': 'Pedro Fernández',
  'Vicente Fernandez': 'Vicente Fernández',
  'Juan Gabriel ': 'Juan Gabriel',
  'MCL': 'Desconocido / Varios',
  'LHDM': 'Desconocido / Varios',
  'Mariachi': 'Desconocido / Varios',
  'Musica Nacional': 'Desconocido / Varios',
  'Música Nacional': 'Desconocido / Varios',
  'Instrumental': 'Desconocido / Varios',
  'Cristiana': 'Desconocido / Varios',
  'Cristiano': 'Desconocido / Varios',
  'Cumbia': 'Desconocido / Varios'
};

// Mapa para limpiar inconsistencias ligeras de géneros
const genreFixMap = {
  'cumbias': 'Cumbia',
  'banda': 'Ranchera / Banda',
  'Banda': 'Ranchera / Banda',
  'Música Cristiana/Católica': 'Música Cristiana',
  'Folklorico (Venezolano)': 'Folclore',
  'Pop': 'Balada Pop',
  'Bolero Ranchero': 'Bolero',
  'Vals Ranchero': 'Ranchera / Vals',
  'Son Jalisciense': 'Son',
  'Son Jarocho': 'Son',
  'Paso Doble': 'Instrumental'
};

let cleanedYoutubeCount = 0;

data = data.map(song => {
  // 1. Limpieza de Artista
  let cleanArtist = song.artist ? song.artist.trim() : 'Desconocido / Varios';
  if (artistFixMap[cleanArtist]) {
    cleanArtist = artistFixMap[cleanArtist];
  }
  
  // Capitalización de primera letra si no está mapeado y corregir minúsculas raras
  cleanArtist = cleanArtist.replace(/\b\w/g, c => c.toUpperCase());
  song.artist = cleanArtist;

  // 2. Limpieza de Géneros
  if (song.genres && Array.isArray(song.genres)) {
    let cleanGenres = song.genres.map(g => {
      let gTrim = g.trim();
      return genreFixMap[gTrim] || gTrim;
    });
    // Eliminar duplicados de géneros por si la fusión generó 2 cumbias
    song.genres = [...new Set(cleanGenres)];
  }

  // 3. Arreglo de Youtube (Borrar las aberraciones del crawler de youtube en excel)
  if (song.source === 'excel' && song.youtubeUrl) {
    // Es mejor que el usuario ponga a mano los correctos, a que todos re-apunten al mismo video erróneo
    song.youtubeUrl = '';
    cleanedYoutubeCount++;
  }

  return song;
});

writeFileSync(dbPath, JSON.stringify(data, null, 2), 'utf8');
console.log(`✅ Base de datos limpiada. Se normalizaron artistas, géneros y se reiniciaron ${cleanedYoutubeCount} videos erróneos procedentes del Excel.`);
