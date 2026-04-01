#!/usr/bin/env node

import admin from 'firebase-admin';
import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Cargar configuración de Firebase
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
    title: 'Canción A - Serenata Clásica',
    artist: 'Artista A',
    genres: ['Ranchero', 'Romántico'],
    occasions: ['Serenata', 'Aniversario', 'Cumpleaños'],
    youtubeUrl: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
    dots: 5,
    createdAt: new Date()
  },
  {
    title: 'Canción B - El Mariachi',
    artist: 'Artista B',
    genres: ['Corrido', 'Tradicional'],
    occasions: ['Fiesta', 'Boda'],
    youtubeUrl: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
    dots: 4,
    createdAt: new Date()
  },
  {
    title: 'Canción C - Amor Eterno',
    artist: 'Artista A',
    genres: ['Ranchero', 'Bolero'],
    occasions: ['Serenata', 'Boda', 'Aniversario'],
    youtubeUrl: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
    dots: 5,
    createdAt: new Date()
  },
  {
    title: 'Canción D - La Norteña',
    artist: 'Artista C',
    genres: ['Norteño', 'Corrido'],
    occasions: ['Fiesta', 'Quinceañera'],
    youtubeUrl: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
    dots: 4,
    createdAt: new Date()
  },
  {
    title: 'Canción E - Viva México',
    artist: 'Artista B',
    genres: ['Ranchero', 'Patriótico'],
    occasions: ['Fiesta', 'Celebración nacional'],
    youtubeUrl: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
    dots: 5,
    createdAt: new Date()
  },
  {
    title: 'Canción F - MI Amor Lejano',
    artist: 'Artista C',
    genres: ['Romántico', 'Bolero'],
    occasions: ['Serenata', 'Cumpleaños'],
    youtubeUrl: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
    dots: 5,
    createdAt: new Date()
  },
  {
    title: 'Canción G - Feliz Cumpleaños Mariachi',
    artist: 'Artista D',
    genres: ['Ranchero'],
    occasions: ['Cumpleaños'],
    youtubeUrl: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
    dots: 4,
    createdAt: new Date()
  },
  {
    title: 'Canción H - La Boda del Siglo',
    artist: 'Artista A',
    genres: ['Clásico', 'Tradicional'],
    occasions: ['Boda', 'Aniversario'],
    youtubeUrl: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
    dots: 5,
    createdAt: new Date()
  },
  {
    title: 'Canción I - Quinceañera Bella',
    artist: 'Artista E',
    genres: ['Ranchero', 'Festivo'],
    occasions: ['Quinceañera', 'Fiesta'],
    youtubeUrl: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
    dots: 4,
    createdAt: new Date()
  },
  {
    title: 'Canción J - Amor a Medianoche',
    artist: 'Artista B',
    genres: ['Bolero', 'Romántico'],
    occasions: ['Serenata', 'Aniversario', 'Cumpleaños'],
    youtubeUrl: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
    dots: 5,
    createdAt: new Date()
  },
  {
    title: 'Canción K - El Alma del Mariachi',
    artist: 'Artista D',
    genres: ['Tradicional', 'Ranchero'],
    occasions: ['Fiesta', 'Celebración'],
    youtubeUrl: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
    dots: 4,
    createdAt: new Date()
  },
  {
    title: 'Canción L - Noche de Luna',
    artist: 'Artista C',
    genres: ['Romántico', 'Clásico'],
    occasions: ['Serenata', 'Boda'],
    youtubeUrl: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
    dots: 5,
    createdAt: new Date()
  },
  {
    title: 'Canción M - Cumpleaños Feliz Ranchero',
    artist: 'Artista E',
    genres: ['Ranchero', 'Festivo'],
    occasions: ['Cumpleaños'],
    youtubeUrl: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
    dots: 4,
    createdAt: new Date()
  },
  {
    title: 'Canción N - La Tristeza del Corazón',
    artist: 'Artista A',
    genres: ['Bolero'],
    occasions: ['Serenata', 'Aniversario'],
    youtubeUrl: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
    dots: 5,
    createdAt: new Date()
  },
  {
    title: 'Canción O - Fiesta Mexicana',
    artist: 'Artista D',
    genres: ['Ranchero', 'Festivo'],
    occasions: ['Fiesta', 'Celebración', 'Quinceañera'],
    youtubeUrl: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
    dots: 5,
    createdAt: new Date()
  },
  {
    title: 'Canción P - Boda Soñada',
    artist: 'Artista B',
    genres: ['Romántico', 'Clásico'],
    occasions: ['Boda', 'Aniversario', 'Serenata'],
    youtubeUrl: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
    dots: 5,
    createdAt: new Date()
  },
  {
    title: 'Canción Q - El Corrido de Amor',
    artist: 'Artista C',
    genres: ['Corrido', 'Romántico'],
    occasions: ['Fiesta', 'Serenata'],
    youtubeUrl: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
    dots: 4,
    createdAt: new Date()
  },
  {
    title: 'Canción R - Recuerdos Eternos',
    artist: 'Artista E',
    genres: ['Ranchero', 'Nostálgico'],
    occasions: ['Aniversario', 'Cumpleaños'],
    youtubeUrl: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
    dots: 4,
    createdAt: new Date()
  },
  {
    title: 'Canción S - Sueño de Mariachi',
    artist: 'Artista A',
    genres: ['Tradicional', 'Ranchero'],
    occasions: ['Fiesta', 'Celebración', 'Boda'],
    youtubeUrl: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
    dots: 5,
    createdAt: new Date()
  },
  {
    title: 'Canción T - El Vals de la Quinceañera',
    artist: 'Artista B',
    genres: ['Clásico', 'Romántico'],
    occasions: ['Quinceañera', 'Boda'],
    youtubeUrl: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
    dots: 5,
    createdAt: new Date()
  }
];

async function seedSongs() {
  try {
    console.log('🌱 Iniciando seed de canciones...');
    const batch = db.batch();

    sampleSongs.forEach((song) => {
      const docRef = db.collection('songs').doc();
      batch.set(docRef, song);
    });

    await batch.commit();
    console.log(`✅ Se agregaron ${sampleSongs.length} canciones exitosamente`);
  } catch (error) {
    console.error('❌ Error al agregar canciones:', error);
    process.exit(1);
  }
}

async function cleanupSongs() {
  try {
    console.log('🧹 Iniciando limpieza de canciones de ejemplo...');
    
    // Buscar todas las canciones que sean de ejemplo (creadas recientemente)
    const snapshot = await db.collection('songs').get();
    const batch = db.batch();

    snapshot.forEach((doc) => {
      const song = doc.data();
      // Eliminar canciones que coincidan con nuestros títulos de ejemplo
      if (song.title && (
        song.title.startsWith('Canción ') &&
        (song.artist.startsWith('Artista ') || song.artist === 'Artista A' || song.artist === 'Artista B' || song.artist === 'Artista C' || song.artist === 'Artista D' || song.artist === 'Artista E')
      )) {
        batch.delete(doc.ref);
      }
    });

    await batch.commit();
    console.log('✅ Limpieza completada exitosamente');
  } catch (error) {
    console.error('❌ Error al limpiar canciones:', error);
    process.exit(1);
  }
}

// Ejecutar según parámetro
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
