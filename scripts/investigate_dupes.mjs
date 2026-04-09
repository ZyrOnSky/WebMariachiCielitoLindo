import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const backupFile = 'songs_backup_2026-04-08T19-33-19-219Z.json';
const backupPath = join(__dirname, '../docs/backups/', backupFile);

try {
  const songs = JSON.parse(readFileSync(backupPath, 'utf-8'));
  
  const targets = ["Usted", "Cielo rojo"];
  
  console.log('🔍 INVESTIGACIÓN DE DUPLICADOS');
  console.log('============================');

  targets.forEach(query => {
    console.log(`\n🔎 Buscando: "${query}"`);
    const matches = songs.filter(s => s.title.toLowerCase().includes(query.toLowerCase()));
    
    matches.forEach((song, index) => {
      console.log(`\n   Coincidencia ${index + 1}:`);
      console.log(`   - ID: ${song.id}`);
      console.log(`   - Artista: ${song.artist}`);
      console.log(`   - YouTube: ${song.youtubeUrl}`);
      console.log(`   - Géneros: ${JSON.stringify(song.genres)}`);
      // console.log(`   - Creado en: ${song.createdAt ? new Date(song.createdAt.seconds * 1000).toISOString() : 'N/A'}`);
    });
  });

} catch (error) {
  console.error(error);
}
