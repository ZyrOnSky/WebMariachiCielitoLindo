import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const backupFile = 'songs_backup_2026-04-08T19-33-19-219Z.json';
const backupPath = join(__dirname, '../docs/backups/', backupFile);

try {
  const songs = JSON.parse(readFileSync(backupPath, 'utf-8'));
  const ghostSongs = songs.filter(s => !s.createdAt);

  console.log('🧐 INSPECCIÓN DE CAMPOS EN FANTASMAS');
  console.log('====================================');

  // Tomamos una muestra de 3 fantasmas únicos
  const sample = ghostSongs.slice(0, 3);
  
  sample.forEach((song, i) => {
    console.log(`\n--- Muestra ${i+1}: ${song.title} ---`);
    console.log(JSON.stringify(song, null, 2));
  });

  // Verificamos si existe 'dots' o 'complexidad'
  const hasDots = ghostSongs.filter(s => s.dots !== undefined).length;
  const hasLink = ghostSongs.filter(s => !!s.link).length;
  const hasYoutube = ghostSongs.filter(s => !!s.youtubeUrl).length;

  console.log('\n📊 Estadísticas en fantasmas:');
  console.log(`- Con campo 'dots': ${hasDots}/${ghostSongs.length}`);
  console.log(`- Con enlace Mega: ${hasLink}/${ghostSongs.length}`);
  console.log(`- Con YouTube: ${hasYoutube}/${ghostSongs.length}`);

} catch (error) {
  console.error(error);
}
