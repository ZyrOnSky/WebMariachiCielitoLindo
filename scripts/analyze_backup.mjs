import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Ajusta el nombre del archivo según el último respaldo generado
const backupFile = 'songs_backup_2026-04-08T19-33-19-219Z.json';
const backupPath = join(__dirname, '../docs/backups/', backupFile);

try {
  const songs = JSON.parse(readFileSync(backupPath, 'utf-8'));
  
  console.log('📊 INFORME DE ANÁLISIS DE INTEGRIDAD');
  console.log('====================================');
  console.log(`Total de canciones en DB: ${songs.length}`);
  
  const duplicates = [];
  const noYoutube = [];
  const noGenres = [];
  const noOccasions = [];
  const seen = new Set();

  songs.forEach(song => {
    const key = `${song.title.toLowerCase().trim()}|${song.artist.toLowerCase().trim()}`;
    if (seen.has(key)) {
      duplicates.push(`${song.title} - ${song.artist}`);
    }
    seen.add(key);

    if (!song.youtubeUrl || song.youtubeUrl.trim() === '') {
      noYoutube.push(song.title);
    }
    
    if (!song.genres || song.genres.length === 0) {
      noGenres.push(song.title);
    }
    
    if (!song.occasions || song.occasions.length === 0) {
      noOccasions.push(song.title);
    }
  });

  console.log(`\n❌ Duplicados encontrados: ${duplicates.length}`);
  if (duplicates.length > 0) {
    duplicates.forEach(d => console.log(`   - ${d}`));
  }

  console.log(`\n⚠️ Sin enlace de YouTube: ${noYoutube.length}`);
  console.log(`\n🏷️ Sin Géneros: ${noGenres.length}`);
  console.log(`\n🎉 Sin Ocasiones: ${noOccasions.length}`);
  
  // Análisis por Artistas (Top 10)
  const artistCounts = {};
  songs.forEach(s => {
    artistCounts[s.artist] = (artistCounts[s.artist] || 0) + 1;
  });
  
  const topArtists = Object.entries(artistCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10);
    
  console.log('\n🌟 Top 10 Artistas con más canciones:');
  topArtists.forEach(([name, count]) => console.log(`   - ${name}: ${count}`));

  console.log('\n====================================');
  
} catch (error) {
  console.error('Error durante el análisis:', error);
}
