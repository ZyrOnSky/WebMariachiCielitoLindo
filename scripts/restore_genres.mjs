import fs from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const dbPath = join(__dirname, '../docs/merged_songs_gemini.json');
const firebaseDbPath = join(__dirname, '../docs/firebase_songs.json');

const data = JSON.parse(fs.readFileSync(dbPath, 'utf8'));
const firebaseData = JSON.parse(fs.readFileSync(firebaseDbPath, 'utf8'));

// Mapeo rápido de firestore
const firestoreMap = new Map();
firebaseData.forEach(song => {
  if (song.id) {
    firestoreMap.set(song.id, song);
  }
});

// Lista de géneros conocidos que hayan caído en 'categories'
const KNOWN_GENRES = ["Cumbias", "Corridos", "Salsa", "Merengues", "Instrumentales", "Música Nacional", "Ranchera", "Bolero", "Balada", "Vals"];

console.log('Restaurando separación entre Géneros y Ocasiones...');

let restoredCount = 0;
let autoAssignedCount = 0;

data.forEach(song => {
  // Inicializamos ambas propiedades vacías en caso de que no existan
  song.genres = [];
  song.occasions = [];

  // 1. Si era una canción de Firestore, heredamos sus géneros y ocasiones puros
  if (song.firestoreId && firestoreMap.has(song.firestoreId)) {
    const original = firestoreMap.get(song.firestoreId);
    song.genres = original.genres || [];
    song.occasions = song.categories.filter(c => !song.genres.includes(c)); // Mantenemos lo que Gemini le haya sumado
    restoredCount++;
  } else {
    // 2. Si es una canción enteramente nueva del Excel, la analizamos
    song.categories.forEach(cat => {
      if (KNOWN_GENRES.includes(cat) || cat.toLowerCase().includes('cumbia') || cat.toLowerCase().includes('salsa')) {
        song.genres.push(cat);
      } else {
        song.occasions.push(cat);
      }
    });

    // Si nos quedó vacío el género, como el 90% es mariachi, por defecto le damos 'Ranchera' o según el artista
    if (song.genres.length === 0) {
      if (song.artist.toLowerCase().includes('alberto barros') || song.artist.toLowerCase().includes('marc anthony')) {
        song.genres.push('Salsa');
      } else if (song.artist.toLowerCase().includes('julio jaramillo')) {
        song.genres.push('Bolero', 'Vals');
      } else {
        // Por defecto para Regional Mexicano
        song.genres.push('Ranchera');
      }
    }
    
    autoAssignedCount++;
  }

  // Eliminar duplicados
  song.genres = [...new Set(song.genres)];
  song.occasions = [...new Set(song.occasions)];

  // Opcional: Eliminar 'categories' plano para no ensuciar la DB
  delete song.categories;
});

fs.writeFileSync(dbPath, JSON.stringify(data, null, 2), 'utf8');

console.log(`✅ ¡Restauración completa!`);
console.log(`- ${restoredCount} canciones de Firebase recuperaron su género/ocasión original.`);
console.log(`- ${autoAssignedCount} canciones nuevas de Excel fueron auto-asignadas por IA/Reglas.`);
