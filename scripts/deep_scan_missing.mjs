import { readFileSync } from 'fs';
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
  return s.toString().toLowerCase().trim().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-0]/g, "");
}

function getSimilarity(s1, s2) {
  let longer = s1;
  let shorter = s2;
  if (s1.length < s2.length) {
    longer = s2;
    shorter = s1;
  }
  let longerLength = longer.length;
  if (longerLength === 0) return 1.0;
  return (longerLength - editDistance(longer, shorter)) / parseFloat(longerLength);
}

function editDistance(s1, s2) {
  s1 = s1.toLowerCase();
  s2 = s2.toLowerCase();
  let costs = new Array();
  for (let i = 0; i <= s1.length; i++) {
    let lastValue = i;
    for (let j = 0; j <= s2.length; j++) {
      if (i == 0) costs[j] = j;
      else {
        if (j > 0) {
          let newValue = costs[j - 1];
          if (s1.charAt(i - 1) != s2.charAt(j - 1))
            newValue = Math.min(Math.min(newValue, lastValue), costs[j]) + 1;
          costs[j - 1] = lastValue;
          lastValue = newValue;
        }
      }
    }
    if (i > 0) costs[s2.length] = lastValue;
  }
  return costs[s2.length];
}

try {
  const jsonSongs = JSON.parse(readFileSync(jsonPath, 'utf-8'));
  const workbook = XLSX.readFile(excelPath);
  const excelData = XLSX.utils.sheet_to_json(workbook.Sheets[workbook.SheetNames[0]]);

  console.log('🧐 ESCANEO PROFUNDO DE CANCIONES FALTANTES');
  console.log('==========================================');

  const trulyMissing = [];

  excelData.forEach(row => {
    const title = row['TÍTULO'] || row['Title'] || row['cancion'] || Object.values(row)[0];
    const artist = row['ARTISTA'] || row['Artist'] || row['artista'] || Object.values(row)[1];
    
    if (!title || title.toString().length < 3) return;
    
    // Ignorar filas que son cabeceras de categorías
    const headers = ["Cumbias", "Merengues", "Salsa", "Instrumentales", "Juvenil", "Musica Nacional", "Homenaje", "Despedidas", "Corridos", "Despecho"];
    if (headers.some(h => title.toString().includes(h) && !artist)) return;

    const nTitle = normalize(title);
    
    let bestScore = 0;
    let bestMatch = null;

    jsonSongs.forEach(s => {
      const score = getSimilarity(nTitle, normalize(s.title));
      if (score > bestScore) {
        bestScore = score;
        bestMatch = s;
      }
    });

    // Si la similitud es menor al 75%, lo consideramos "posiblemente faltante"
    if (bestScore < 0.75) {
      trulyMissing.push({ title, artist, bestScore, bestMatch: bestMatch ? `${bestMatch.title} (${bestMatch.artist})` : 'Ningen' });
    }
  });

  if (trulyMissing.length > 0) {
    console.log(`\n🚨 Se encontraron ${trulyMissing.length} canciones en el Excel sin una correspondencia clara en el JSON:`);
    trulyMissing.forEach((m, idx) => {
      console.log(`${idx + 1}. "${m.title}" - ${m.artist} (Mejor coincidencia: ${m.bestMatch} con ${Math.round(m.bestScore*100)}%)`);
    });
  } else {
    console.log('\n✅ No se encontraron canciones faltantes significativas.');
  }

} catch (error) {
  console.error(error);
}
