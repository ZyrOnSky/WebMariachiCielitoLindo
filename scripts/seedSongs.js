#!/usr/bin/env node

import admin from 'firebase-admin';
import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Cargar configuraciÃ³n de Firebase
const firebaseConfig = JSON.parse(
  readFileSync(join(__dirname, '../firebase-applet-config.json'), 'utf-8')
);

// Inicializar Firebase Admin
admin.initializeApp({
  credential: admin.credential.cert(firebaseConfig)
});

const db = admin.firestore();

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
    const batch = db.batch();

    sampleSongs.forEach((song) => {
      const docRef = db.collection('songs').doc();
      batch.set(docRef, song);
    });

    await batch.commit();
    console.log(`âœ… Se agregaron ${sampleSongs.length} canciones exitosamente`);
  } catch (error) {
    console.error('âŒ Error al agregar canciones:', error);
    process.exit(1);
  }
}

async function cleanupSongs() {
  try {
    console.log('ðŸ§¹ Iniciando limpieza de canciones de ejemplo...');
    
    // Buscar todas las canciones que sean de ejemplo (creadas recientemente)
    const snapshot = await db.collection('songs').get();
    const batch = db.batch();

    snapshot.forEach((doc) => {
      const song = doc.data();
      // Eliminar canciones que coincidan con nuestros tÃ­tulos de ejemplo
      if (song.title && (
        song.title.startsWith('CanciÃ³n ') &&
        (song.artist.startsWith('Artista ') || song.artist === 'Artista A' || song.artist === 'Artista B' || song.artist === 'Artista C' || song.artist === 'Artista D' || song.artist === 'Artista E')
      )) {
        batch.delete(doc.ref);
      }
    });

    await batch.commit();
    console.log('âœ… Limpieza completada exitosamente');
  } catch (error) {
    console.error('âŒ Error al limpiar canciones:', error);
    process.exit(1);
  }
}

// Ejecutar segÃºn parÃ¡metro
const command = process.argv[2];

if (command === 'seed') {
  seedSongs().then(() => process.exit(0));
} else if (command === 'cleanup') {
  cleanupSongs().then(() => process.exit(0));
} else {
  console.log('Uso:');
  console.log('  npm run seed:songs -- seed    # Agregar canciones de ejemplo');
  console.log('  npm run seed:songs -- cleanup # Eliminar canciones de ejemplo');
  process.exit(0);
}

