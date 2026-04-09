import fs from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const dbPath = join(__dirname, '../docs/merged_songs_gemini.json');
const data = JSON.parse(fs.readFileSync(dbPath, 'utf8'));

console.log('🧹 Limpiando los 4 enlaces duplicados detectados para re-busqueda...');

const targetUrls = [
  'https://youtube.com/watch?v=rYclZ_Y0rH4',
  'https://youtube.com/watch?v=2XsWAoNcrFY',
  'https://youtube.com/watch?v=yulDcMq5xWA',
  'https://youtube.com/watch?v=WR8hx7u2xWw'
];

let cleared = 0;
data.forEach(song => {
  if (targetUrls.includes(song.youtubeUrl)) {
    song.youtubeUrl = '';
    cleared++;
  }
});

fs.writeFileSync(dbPath, JSON.stringify(data, null, 2), 'utf8');
console.log(`✅ Se han reseteado ${cleared} campos. Ahora el buscador encontrará versiones únicas para ellos.`);
