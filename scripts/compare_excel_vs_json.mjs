import { readFileSync, writeFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const XLSX = require('xlsx');

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const excelPath = join(__dirname, '../docs/Repertorio Clasificado (1).xlsx');
const jsonPath = join(__dirname, '../docs/final_purified_songs.json');

function normalize(s) {
  if (!s) return "";
  return s.toString().toLowerCase().trim().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
}

// Distancia de Levenshtein para sugerencias
function levenshteinDistance(a, b) {
  const matrix = Array.from({ length: a.length + 1 }, (_, i) => [i]);
  for (let j = 1; j <= b.length; j++) matrix[0][j] = j;

  for (let i = 1; i <= a.length; i++) {
    for (let j = 1; j <= b.length; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      matrix[i][j] = Math.min(
        matrix[i - 1][j] + 1,
        matrix[i][j - 1] + 1,
        matrix[i - 1][j - 1] + cost
      );
    }
  }
  return matrix[a.length][b.length];
}

try {
  // 1. Cargar JSON (Fuente de Prioridad)
  const jsonSongs = JSON.parse(readFileSync(jsonPath, 'utf-8'));
  const jsonMap = new Map();
  jsonSongs.forEach(s => {
    const key = `${normalize(s.title)}|${normalize(s.artist)}`;
    jsonMap.set(key, s);
  });
  
  const jsonTitles = jsonSongs.map(s => normalize(s.title));

  console.log(`📂 JSON cargado: ${jsonSongs.length} canciones.`);

  // 2. Cargar Excel
  const workbook = XLSX.readFile(excelPath);
  const sheetName = workbook.SheetNames[0];
  const worksheet = workbook.Sheets[sheetName];
  const excelData = XLSX.utils.sheet_to_json(worksheet);

  console.log(`📂 Excel cargado: ${excelData.length} filas.`);

  const missing = [];
  const foundInExcel = new Set();

  excelData.forEach((row, index) => {
    const title = row['TÍTULO'] || row['Title'] || row['cancion'] || Object.values(row)[0];
    const artist = row['ARTISTA'] || row['Artist'] || row['artista'] || Object.values(row)[1];

    if (!title) return;

    const nTitle = normalize(title);
    const nArtist = normalize(artist);
    const key = `${nTitle}|${nArtist}`;

    if (!jsonMap.has(key)) {
      // Intentar buscar solo por título si el artista es diferente o está mal escrito
      const sameTitleMatches = jsonSongs.filter(s => normalize(s.title) === nTitle);
      
      if (sameTitleMatches.length > 0) {
        // Probable error de artista o escritura de artista
        missing.push({
          excelTitle: title,
          excelArtist: artist,
          reason: 'Diferente Artista',
          suggestions: sameTitleMatches.map(s => `${s.title} (${s.artist})`)
        });
      } else {
        // No hay coincidencia exacta de título, buscar similares
        const suggestions = [];
        jsonSongs.forEach(s => {
          const sTitle = normalize(s.title);
          // Si el título es muy similar (distancia pequeña)
          if (levenshteinDistance(nTitle, sTitle) < 4) {
             suggestions.push(`${s.title} (${s.artist})`);
          }
        });

        missing.push({
          excelTitle: title,
          excelArtist: artist,
          reason: 'No encontrado',
          suggestions: suggestions.slice(0, 3)
        });
      }
    }
  });

  console.log('\n🔍 RESULTADOS DE LA COMPARACIÓN');
  console.log('==============================');
  console.log(`\n❌ Canciones en Excel que NO están exactamente igual en el JSON: ${missing.length}`);
  
  if (missing.length > 0) {
    console.log('\nReporte de casos (Excel -> Posible en JSON):');
    missing.forEach((m, idx) => {
      console.log(`${idx + 1}. [EXCEL] "${m.excelTitle}" - ${m.excelArtist}`);
      if (m.suggestions.length > 0) {
        console.log(`   💡 Sugerencias: ${m.suggestions.join(' | ')}`);
      } else {
        console.log(`   ⚠️ Sin sugerencias cercanas.`);
      }
    });
  } else {
    console.log('\n✅ ¡Todas las canciones del Excel coinciden perfectamente con el JSON!');
  }

} catch (error) {
  console.error('❌ Error durante el análisis:', error);
}
