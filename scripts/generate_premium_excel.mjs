import ExcelJS from 'exceljs';
import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const jsonPath = join(__dirname, '../docs/listas_json/final_purified_songs.json');
const outputPath = join(__dirname, '../docs/Repertorio_Premium_Mariachi.xlsx');

async function generatePremiumExcel() {
  try {
    const songs = JSON.parse(readFileSync(jsonPath, 'utf-8'));
    const workbook = new ExcelJS.Workbook();
    
    // --- ESTILOS ---
    const headerFill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1F4E78' } };
    const headerFont = { color: { argb: 'FFFFFFFF' }, bold: true };
    const centerAlign = { vertical: 'middle', horizontal: 'center' };

    // ==========================================
    // 1. HOJA DE DASHBOARD (RESUMEN)
    // ==========================================
    const summarySheet = workbook.addWorksheet('Dashboard de Gestión', { views: [{ showGridLines: false }] });
    
    summarySheet.mergeCells('B2:H2');
    const titleCell = summarySheet.getCell('B2');
    titleCell.value = 'RESUMEN ANALÍTICO DEL REPERTORIO - MARIACHI CIELITO LINDO';
    titleCell.font = { size: 16, bold: true, color: { argb: 'FF1F4E78' } };
    titleCell.alignment = centerAlign;

    // Cálculo de estadísticas
    const genreStats = {};
    const occasionStats = {};
    const artistStats = {};

    songs.forEach(s => {
      (s.genres || []).forEach(g => genreStats[g] = (genreStats[g] || 0) + 1);
      (s.occasions || []).forEach(o => occasionStats[o] = (occasionStats[o] || 0) + 1);
      artistStats[s.artist] = (artistStats[s.artist] || 0) + 1;
    });

    const topGenres = Object.entries(genreStats).sort((a,b) => b[1] - a[1]);
    const topOccasions = Object.entries(occasionStats).sort((a,b) => b[1] - a[1]);
    const topArtists = Object.entries(artistStats).sort((a,b) => b[1] - a[1]).slice(0, 15);

    // Tabla de Géneros
    summarySheet.getCell('B4').value = 'DISTRIBUCIÓN POR GÉNERO';
    summarySheet.getCell('B4').font = { bold: true };
    const genreRowStart = 5;
    summarySheet.getCell(`B${genreRowStart}`).value = 'Género';
    summarySheet.getCell(`C${genreRowStart}`).value = 'Cantidad';
    summarySheet.getRow(genreRowStart).fill = headerFill;
    summarySheet.getRow(genreRowStart).font = headerFont;

    topGenres.forEach((g, i) => {
      summarySheet.getCell(`B${genreRowStart + 1 + i}`).value = g[0];
      summarySheet.getCell(`C${genreRowStart + 1 + i}`).value = g[1];
    });

    // Tabla de Ocasiones
    summarySheet.getCell('E4').value = 'OCASIONES MÁS FRECUENTES';
    summarySheet.getCell('E4').font = { bold: true };
    const occRowStart = 5;
    summarySheet.getCell(`E${occRowStart}`).value = 'Ocasión';
    summarySheet.getCell(`F${occRowStart}`).value = 'Cantidad';
    summarySheet.getRow(occRowStart).fill = headerFill;
    summarySheet.getRow(occRowStart).font = headerFont;

    topOccasions.forEach((o, i) => {
      summarySheet.getCell(`E${occRowStart + 1 + i}`).value = o[0];
      summarySheet.getCell(`F${occRowStart + 1 + i}`).value = o[1];
    });

    // Tabla de Artistas
    summarySheet.getCell('H4').value = 'TOP ARTISTAS';
    summarySheet.getCell('H4').font = { bold: true };
    const artRowStart = 5;
    summarySheet.getCell(`H${artRowStart}`).value = 'Artista';
    summarySheet.getCell(`I${artRowStart}`).value = 'Canciones';
    summarySheet.getRow(artRowStart).fill = headerFill;
    summarySheet.getRow(artRowStart).font = headerFont;

    topArtists.forEach((a, i) => {
      summarySheet.getCell(`H${artRowStart + 1 + i}`).value = a[0];
      summarySheet.getCell(`I${artRowStart + 1 + i}`).value = a[1];
    });

    // ==========================================
    // 2. HOJA DE LISTADO COMPLETO (CON FILTROS)
    // ==========================================
    const listSheet = workbook.addWorksheet('Lista Completa');
    
    // Preparar datos para la tabla
    const rows = songs.map(s => [
      s.title,
      s.artist,
      (s.genres || []).join(', '),
      (s.occasions || []).join(', '),
      s.youtubeUrl || '',
      s.link || ''
    ]);

    listSheet.addTable({
      name: 'RepertorioTable',
      ref: 'A1',
      headerRow: true,
      totalsRow: false,
      style: {
        theme: 'TableStyleMedium9',
        showRowStripes: true,
      },
      columns: [
        { name: 'Título', filterButton: true },
        { name: 'Artista', filterButton: true },
        { name: 'Géneros', filterButton: true },
        { name: 'Ocasiones', filterButton: true },
        { name: 'Enlace YouTube', filterButton: false },
        { name: 'Enlace Mega', filterButton: false },
      ],
      rows: rows,
    });

    // Ajustar anchos
    listSheet.getColumn(1).width = 40;
    listSheet.getColumn(2).width = 30;
    listSheet.getColumn(3).width = 40;
    listSheet.getColumn(4).width = 40;
    listSheet.getColumn(5).width = 40;
    listSheet.getColumn(6).width = 40;

    await workbook.xlsx.writeFile(outputPath);
    console.log(`✅ Excel PREMIUM generado en: ${outputPath}`);

  } catch (error) {
    console.error('❌ Error:', error);
  }
}

generatePremiumExcel();
