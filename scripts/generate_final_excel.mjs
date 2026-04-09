import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const XLSX = require('xlsx');

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const jsonPath = join(__dirname, '../docs/final_purified_songs.json');
const outputPath = join(__dirname, '../docs/Repertorio_Final_Mariachi.xlsx');

try {
  const songs = JSON.parse(readFileSync(jsonPath, 'utf-8'));
  console.log(`📊 Generando Excel con ${songs.length} canciones...`);

  const data = songs.map(s => ({
    'TÍTULO': s.title,
    'ARTISTA': s.artist,
    'GÉNEROS': (s.genres || []).join(', '),
    'OCASIONES': (s.occasions || []).join(', '),
    'ENLACE YOUTUBE': s.youtubeUrl || '',
    'ENLACE MEGA (NOTAS)': s.link || ''
  }));

  // Crear libro y hoja
  const worksheet = XLSX.utils.json_to_sheet(data);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Repertorio');

  // Ajustar ancho de columnas (opcional, básico)
  const wscols = [
    { wch: 35 }, // Título
    { wch: 30 }, // Artista
    { wch: 40 }, // Géneros
    { wch: 40 }, // Ocasiones
    { wch: 50 }, // YouTube
    { wch: 50 }  // Mega
  ];
  worksheet['!cols'] = wscols;

  XLSX.writeFile(workbook, outputPath);
  console.log(`✅ Excel generado exitosamente en: ${outputPath}`);

} catch (error) {
  console.error('❌ Error al generar Excel:', error);
}
