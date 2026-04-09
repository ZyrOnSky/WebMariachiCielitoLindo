#!/usr/bin/env node

import { initializeApp } from 'firebase/app';
import { getFirestore, collection, addDoc, getDocs, deleteDoc, query, where } from 'firebase/firestore';
import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Cargar configuraciÃ³n de Firebase
const firebaseConfig = JSON.parse(
  readFileSync(join(__dirname, '../firebase-applet-config.json'), 'utf-8')
);

// Inicializar Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// Datos de ejemplo para canciones
const sampleSongs = [
  {
    title: 'CanciÃ³n A - Serenata ClÃ¡sica',
    artist: 'Artista A',
    genres: ['Ranchero', 'RomÃ¡ntico'],
    occasions: ['Serenata', 'Aniversario', 'CumpleaÃ±os'],
    youtubeUrl: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
    createdAt: new Date()
  },
  {
    title: 'CanciÃ³n B - El Mariachi',
    artist: 'Artista B',
    genres: ['Corrido', 'Tradicional'],
    occasions: ['Fiesta', 'Boda'],
    youtubeUrl: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
    createdAt: new Date()
  },
  {
    title: 'CanciÃ³n C - Amor Eterno',
    artist: 'Artista A',
    genres: ['Ranchero', 'Bolero'],
    occasions: ['Serenata', 'Boda', 'Aniversario'],
    youtubeUrl: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
    createdAt: new Date()
  },
  {
    title: 'CanciÃ³n D - La NorteÃ±a',
    artist: 'Artista C',
    genres: ['NorteÃ±o', 'Corrido'],
    occasions: ['Fiesta', 'QuinceaÃ±era'],
    youtubeUrl: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
    createdAt: new Date()
  },
  {
    title: 'CanciÃ³n E - Viva MÃ©xico',
    artist: 'Artista B',
    genres: ['Ranchero', 'PatriÃ³tico'],
    occasions: ['Fiesta', 'CelebraciÃ³n nacional'],
    youtubeUrl: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
    createdAt: new Date()
  },
  {
    title: 'CanciÃ³n F - MI Amor Lejano',
    artist: 'Artista C',
    genres: ['RomÃ¡ntico', 'Bolero'],
    occasions: ['Serenata', 'CumpleaÃ±os'],
    youtubeUrl: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
    createdAt: new Date()
  },
  {
    title: 'CanciÃ³n G - Feliz CumpleaÃ±os Mariachi',
    artist: 'Artista D',
    genres: ['Ranchero'],
    occasions: ['CumpleaÃ±os'],
    youtubeUrl: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
    createdAt: new Date()
  },
  {
    title: 'CanciÃ³n H - La Boda del Siglo',
    artist: 'Artista A',
    genres: ['ClÃ¡sico', 'Tradicional'],
    occasions: ['Boda', 'Aniversario'],
    youtubeUrl: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
    createdAt: new Date()
  },
  {
    title: 'CanciÃ³n I - QuinceaÃ±era Bella',
    artist: 'Artista E',
    genres: ['Ranchero', 'Festivo'],
    occasions: ['QuinceaÃ±era', 'Fiesta'],
    youtubeUrl: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
    createdAt: new Date()
  },
  {
    title: 'CanciÃ³n J - Amor a Medianoche',
    artist: 'Artista B',
    genres: ['Bolero', 'RomÃ¡ntico'],
    occasions: ['Serenata', 'Aniversario', 'CumpleaÃ±os'],
    youtubeUrl: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
    createdAt: new Date()
  },
  {
    title: 'CanciÃ³n K - El Alma del Mariachi',
    artist: 'Artista D',
    genres: ['Tradicional', 'Ranchero'],
    occasions: ['Fiesta', 'CelebraciÃ³n'],
    youtubeUrl: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
    createdAt: new Date()
  },
  {
    title: 'CanciÃ³n L - Noche de Luna',
    artist: 'Artista C',
    genres: ['RomÃ¡ntico', 'ClÃ¡sico'],
    occasions: ['Serenata', 'Boda'],
    youtubeUrl: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
    createdAt: new Date()
  },
  {
    title: 'CanciÃ³n M - CumpleaÃ±os Feliz Ranchero',
    artist: 'Artista E',
    genres: ['Ranchero', 'Festivo'],
    occasions: ['CumpleaÃ±os'],
    youtubeUrl: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
    createdAt: new Date()
  },
  {
    title: 'CanciÃ³n N - La Tristeza del CorazÃ³n',
    artist: 'Artista A',
    genres: ['Bolero'],
    occasions: ['Serenata', 'Aniversario'],
    youtubeUrl: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
    createdAt: new Date()
  },
  {
    title: 'CanciÃ³n O - Fiesta Mexicana',
    artist: 'Artista D',
    genres: ['Ranchero', 'Festivo'],
    occasions: ['Fiesta', 'CelebraciÃ³n', 'QuinceaÃ±era'],
    youtubeUrl: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
    createdAt: new Date()
  },
  {
    title: 'CanciÃ³n P - Boda SoÃ±ada',
    artist: 'Artista B',
    genres: ['RomÃ¡ntico', 'ClÃ¡sico'],
    occasions: ['Boda', 'Aniversario', 'Serenata'],
    youtubeUrl: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
    createdAt: new Date()
  },
  {
    title: 'CanciÃ³n Q - El Corrido de Amor',
    artist: 'Artista C',
    genres: ['Corrido', 'RomÃ¡ntico'],
    occasions: ['Fiesta', 'Serenata'],
    youtubeUrl: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
    createdAt: new Date()
  },
  {
    title: 'CanciÃ³n R - Recuerdos Eternos',
    artist: 'Artista E',
    genres: ['Ranchero', 'NostÃ¡lgico'],
    occasions: ['Aniversario', 'CumpleaÃ±os'],
    youtubeUrl: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
    createdAt: new Date()
  },
  {
    title: 'CanciÃ³n S - SueÃ±o de Mariachi',
    artist: 'Artista A',
    genres: ['Tradicional', 'Ranchero'],
    occasions: ['Fiesta', 'CelebraciÃ³n', 'Boda'],
    youtubeUrl: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
    createdAt: new Date()
  },
  {
    title: 'CanciÃ³n T - El Vals de la QuinceaÃ±era',
    artist: 'Artista B',
    genres: ['ClÃ¡sico', 'RomÃ¡ntico'],
    occasions: ['QuinceaÃ±era', 'Boda'],
    youtubeUrl: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
    createdAt: new Date()
  }
];

async function seedSongs() {
  try {
    console.log('ðŸŒ± Iniciando seed de canciones...');
    const songsCollection = collection(db, 'songs');
    const seedUserId = 'seed-user-' + Date.now();

    for (const song of sampleSongs) {
      // Agregar campos requeridos por las reglas de Firestore
      const songWithMeta = {
        ...song,
        createdBy: seedUserId,
        createdAt: new Date()
      };
      await addDoc(songsCollection, songWithMeta);
    }

    console.log(`âœ… Se agregaron ${sampleSongs.length} canciones exitosamente (Seed UID: ${seedUserId})`);
    process.exit(0);
  } catch (error) {
    console.error('âŒ Error al agregar canciones:', error.code);
    console.error('ðŸ“ Mensaje:', error.message);
    if (error.code === 'PERMISSION_DENIED') {
      console.error('\nâš ï¸  Soluciones:');
      console.error('1. Cambia las reglas de Firestore TEMPORALMENTE a:');
      console.error('   allow read, write: if true;');
      console.error('2. O autentÃ­cate primero en la aplicaciÃ³n web');
      console.error('3. Ejecuta nuevamente: npm run seed:songs seed\n');
    }
    process.exit(1);
  }
}

async function cleanupSongs() {
  try {
    console.log('ðŸ§¹ Iniciando limpieza de canciones de ejemplo...');
    
    const songsCollection = collection(db, 'songs');
    const snapshot = await getDocs(songsCollection);

    let deletedCount = 0;
    for (const doc of snapshot.docs) {
      const song = doc.data();
      // Eliminar canciones que coincidan con nuestros tÃ­tulos de ejemplo
      if (song.title && song.title.startsWith('CanciÃ³n ') &&
          song.artist && (song.artist.startsWith('Artista '))) {
        await deleteDoc(doc.ref);
        deletedCount++;
      }
    }

    console.log(`âœ… Se eliminaron ${deletedCount} canciones de ejemplo`);
    process.exit(0);
  } catch (error) {
    console.error('âŒ Error al limpiar canciones:', error.code, error.message);
    if (error.code === 'PERMISSION_DENIED') {
      console.error('\nâš ï¸  Error de permisos. AsegÃºrate de que las reglas de Firestore permitan escrituras.');
    }
    process.exit(1);
  }
}

// Ejecutar segÃºn parÃ¡metro
const command = process.argv[2];

if (command === 'seed') {
  seedSongs();
} else if (command === 'cleanup') {
  cleanupSongs();
} else {
  console.log('Uso:');
  console.log('  npm run seed:songs seed    # Agregar canciones de ejemplo');
  console.log('  npm run seed:songs cleanup # Eliminar canciones de ejemplo');
  process.exit(0);
}

