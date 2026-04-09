import { readFile, writeFile } from 'fs/promises';
import { GoogleGenerativeAI } from '@google/generative-ai';

// Initialize Gemini
const API_KEY = process.env.GOOGLE_GEMINI_API_KEY;
if (!API_KEY) {
  throw new Error('Necesitas definir GOOGLE_GEMINI_API_KEY en el entorno antes de ejecutar este script.');
}
const genAI = new GoogleGenerativeAI(API_KEY);
const model = genAI.getGenerativeModel({
  model: 'gemini-2.5-flash',
  generationConfig: { temperature: 0.1, responseMimeType: 'application/json' }
});

const normalizeString = (text = '') =>
  String(text)
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '') // remove diacritics
    .trim()
    .toLowerCase();

const normalizeTitleForMatch = (title = '') => {
  let t = normalizeString(title);
  t = t.replace(/^(el|la|los|las|un|una|unos|unas)\s+/g, '');
  return t.replace(/[^a-z0-9]/g, '');
};

const normalizeArtistForMatch = (artist = '') => {
  let a = normalizeString(artist);
  a = a.replace(/^(el|la|los|las)\s+/g, '');
  a = a.replace(/\bmariachi\b/g, ''); 
  return a.replace(/[^a-z0-9]/g, '');
};

const standardizeCategory = (cat) => {
  let n = normalizeString(cat).replace(/[^a-z0-9\s]/g, '').trim();
  
  if (n.includes('boda') || n.includes('matrimonio')) return 'Bodas y Matrimonios';
  if (n.includes('quinceanera')) return 'Quinceañeras';
  if (n.includes('serenata')) return 'Serenatas';
  if (n.includes('ambientacion')) return 'Ambientación';
  if (n.includes('velorio') || n.includes('sepelio') || n.includes('funeral')) return 'Velorios y Sepelios';
  if (n.includes('cumpleano')) return 'Cumpleaños';
  if (n.includes('mama') || n.includes('madre')) return 'Día de la Madre';
  if (n.includes('papa') || n.includes('padre')) return 'Día del Padre';
  if (n.includes('cristiana') || n.includes('catolico') || n.includes('religioso') || n.includes('virgen')) return 'Música Cristiana/Católica';
  if (n.includes('aniversario') || n.includes('romantica') || n.includes('enamorado') || n.includes('pedida')) return 'Aniversarios y Románticas';
  if (n.includes('graduacion')) return 'Graduaciones';
  if (n.includes('despecho') || n.includes('reconciliacion')) return 'Despecho';
  if (n.includes('fiesta') || n.includes('despedida')) return 'Fiestas y Despedidas';
  if (n.includes('entrada')) return 'Entrada';
  if (n.includes('corrido')) return 'Corridos';
  if (n.includes('cumbia')) return 'Cumbias';
  if (n.includes('merengue')) return 'Merengues';
  if (n.includes('salsa')) return 'Salsa';
  if (n.includes('nacional') || n.includes('pasillo') || n.includes('sanjuanito')) return 'Música Nacional';
  if (n.includes('instrumental') || n.includes('espectaculo')) return 'Instrumentales';
  if (n.includes('juvenil') || n.includes('nuevo')) return 'Juvenil o Nuevo';

  // Capitalize first letter of each word if not caught above
  return cat.split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join(' ');
};

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const main = async () => {
  // Read inputs
  console.log('Leyendo archivos de origen...');
  const excelData = JSON.parse(await readFile(new URL('../docs/excel_normalized.json', import.meta.url), 'utf-8'));
  const firestoreData = JSON.parse(await readFile(new URL('../docs/firebase_songs.json', import.meta.url), 'utf-8'));

  const combinedMap = new Map();

  // 1. Process Firestore Data
  firestoreData.forEach(item => {
    if (!item.title || !item.artist) return;
    const key = `${normalizeTitleForMatch(item.title)}___${normalizeArtistForMatch(item.artist)}`;
    const originalCats = item.occasions || item.genres || [];
    const cats = originalCats.map(standardizeCategory);
    
    combinedMap.set(key, {
      title: item.title,
      artist: item.artist,
      categories: [...new Set(cats)],
      youtubeUrl: item.youtubeUrl || item.link || '',
      firestoreId: item.id,
      source: 'firestore'
    });
  });

  // 2. Process Excel Data
  excelData.forEach(item => {
    if (!item.title || !item.artist) return;
    const key = `${normalizeTitleForMatch(item.title)}___${normalizeArtistForMatch(item.artist)}`;
    const originalCats = item.originalCategories || item.normalizedCategories || [];
    const cats = originalCats.map(standardizeCategory);

    if (combinedMap.has(key)) {
      const existing = combinedMap.get(key);
      existing.categories = [...new Set([...existing.categories, ...cats])];
      existing.source = 'excel+firestore';
      if (!existing.youtubeUrl && item.youtubeUrl) {
        existing.youtubeUrl = item.youtubeUrl;
      }
    } else {
      combinedMap.set(key, {
        title: item.title,
        artist: item.artist,
        categories: [...new Set(cats)],
        youtubeUrl: item.youtubeUrl || '',
        firestoreId: null,
        source: 'excel'
      });
    }
  });

  const mergedArray = Array.from(combinedMap.values());
  console.log(`\nAgrupación local completada. Total registros combinados: ${mergedArray.length}`);
  console.log('Enviando a Gemini para corregir ortografía, títulos, artistas (ej. LuisMiguel -> Luis Miguel)...');

  const finalResults = [];
  const batchSize = 30;

  for (let i = 0; i < mergedArray.length; i += batchSize) {
    const batch = mergedArray.slice(i, i + batchSize);
    console.log(`Procesando lote ${Math.floor(i / batchSize) + 1} de ${Math.ceil(mergedArray.length / batchSize)}...`);

    const prompt = `Eres un experto musical y corrector de datos de un Mariachi.
Revisa el siguiente JSON array de canciones.
Tareas:
1. Corrige los errores ortográficos.
2. Estandariza nombres de artistas (ej. 'LuisMiguel' -> 'Luis Miguel', 'MCL' -> 'Mariachi Cielito Lindo').
3. Capitaliza correctamente los títulos (ej. 'el dulce pecado' -> 'Dulce Pecado').
4. Las categorías ya fueron pre-estandarizadas, pero asegúrate de que tengan buena presentación (Title Case) y sean consistentes.
5. NO agregues ni quites canciones. Devuelve exactamente los mismos objetos, manteniendo sus propiedades 'firestoreId', 'source' y 'youtubeUrl', pero con 'title', 'artist' y 'categories' mejorados.

JSON Entrada:
${JSON.stringify(batch)}
`;

    try {
      const result = await model.generateContent(prompt);
      const text = result.response.text();
      const parsed = JSON.parse(text);
      if (Array.isArray(parsed)) {
        finalResults.push(...parsed);
      } else {
        console.error('Gemini no devolvió un array. Guardando originales.');
        finalResults.push(...batch);
      }
    } catch (e) {
      console.error(`Error procesando lote ${i}, guardando originales. Error: ${e.message}`);
      finalResults.push(...batch);
    }
    
    await sleep(2000); // Respect rate limits
  }

  // Escribimos el JSON final
  await writeFile(new URL('../docs/merged_songs_gemini.json', import.meta.url), JSON.stringify(finalResults, null, 2), 'utf-8');
  
  // Guardar reporte
  const report = [
    '# Fusión de listas con Gemini AI',
    '',
    `- Registros en Excel procesados: ${excelData.length}`,
    `- Registros en Firestore procesados: ${firestoreData.length}`,
    `- Registros combinados agrupados localmente (deduplicados por título y artista): ${mergedArray.length}`,
    `- Registros resultantes después de la corrección ortográfica (Gemini): ${finalResults.length}`,
    `- Registros que estaban en ambos (excel+firestore): ${finalResults.filter(r => r.source === 'excel+firestore').length}`,
    `- Registros nuevos desde Excel: ${finalResults.filter(r => r.source === 'excel').length}`,
    `- Registros ya existentes en Firestore: ${finalResults.filter(r => r.source === 'firestore').length}`,
    '',
    '## Nota',
    'Gemini corrigió artistas (ej. LuisMiguel -> Luis Miguel), eliminó artículos de redundancia y agrupó categorías equivalentes (Boda/Bodas/Matrimonios -> Bodas y Matrimonios).'
  ].join('\n');
  await writeFile(new URL('../docs/merge_with_gemini_report.md', import.meta.url), report, 'utf-8');

  console.log('\n¡Fusión completada exitosamente!');
  console.log('Revisa docs/merged_songs_gemini.json y docs/merge_with_gemini_report.md');
};

main().catch((error) => {
  console.error(error);
  process.exit(1);
});