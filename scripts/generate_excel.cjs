const fs = require('fs');
const { execSync } = require('child_process');

// Auto-install exceljs si no lo tenemos
try {
  require.resolve('exceljs');
} catch (e) {
  console.log('Instalando exceljs temporalmente...');
  execSync('npm install --no-save exceljs', { stdio: 'inherit' });
}

const ExcelJS = require('exceljs');
const path = require('path');

async function generarExcel() {
  const dataPath = path.join(__dirname, '../docs/merged_songs_gemini.json');
  const outPath = path.join(__dirname, '../docs/Repertorio_Actualizado_Mariachi.xlsx');
  
  const raw = fs.readFileSync(dataPath, 'utf8');
  const canciones = JSON.parse(raw);

  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'Moisés';
  workbook.created = new Date();

  const worksheet = workbook.addWorksheet('Repertorio Consolidado');

  // Estilizar cabeceras
  worksheet.columns = [
    { header: 'Título de Canción', key: 'title', width: 35 },
    { header: 'Artista', key: 'artist', width: 25 },
    { header: 'Géneros Musicales', key: 'genres', width: 40 },
    { header: 'Ocasiones de Evento', key: 'occasions', width: 45 },
    { header: 'Enlace YouTube', key: 'youtubeUrl', width: 50 },
    { header: 'Origen de Datos', key: 'source', width: 18 }
  ];

  worksheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };
  worksheet.getRow(1).fill = { type: 'pattern', pattern:'solid', fgColor:{ argb:'FF00529B' } }; // Azul oscuro

  // Insertar filas
  canciones.forEach(c => {
    worksheet.addRow({
      title: c.title,
      artist: c.artist,
      genres: c.genres ? c.genres.join(', ') : '',
      occasions: c.occasions ? c.occasions.join(', ') : '',
      youtubeUrl: c.youtubeUrl,
      source: c.source === 'firestore' ? 'Base de datos' : (c.source === 'excel' ? 'Excel Nuevo' : 'Fusionado')
    });
  });

  // Exportar archivo
  await workbook.xlsx.writeFile(outPath);
  console.log('✅ Archivo Excel .xlsx generado exitosamente en:', outPath);
}

generarExcel().catch(console.error);
