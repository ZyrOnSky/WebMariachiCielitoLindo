import fs from 'fs';
import { GoogleGenerativeAI } from '@google/generative-ai';

const API_KEY = process.env.GOOGLE_GEMINI_API_KEY;
const genAI = new GoogleGenerativeAI(API_KEY);
const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash", generationConfig: { temperature: 0.1 } });

const INPUT_FILE = 'data/wp-songs-enriched.json';
const OUTPUT_FILE = 'data/wp-songs-ai-final.json';

const rawData = fs.readFileSync(INPUT_FILE, 'utf8');
const db = JSON.parse(rawData);
const songs = db.songs;

async function enrichBatch(batch) {
  const prompt = `
Actúa como un experto en música mexicana, especialmente repertorio de Mariachi. A continuación te presentaré un listado de canciones con su título y artista (el de referencia o compositor). Revisa conceptualmente cada una y devuelve sus Géneros musicales y Ocasiones más adecuadas, de forma contextual.

GÉNEROS COMUNES SUGERIDOS: Ranchera, Bolero, Huapango, Son Jalisciense, Corrido, Cumbia, Vals Ranchero, Balada, Pop, Danzón, Paso Doble, Instrumental, Suman, Chotís, Polka. (Puedes añadir alguno más exacto si lo requiere, ej. "Norteña").
OCASIONES COMUNES SUGERIDAS: Serenata, Cumpleaños, Bodas, Quinceañeras, Despecho, Día de la Madre, Día del Padre, Funerales, Fiestas, Religioso, Graduaciones, Ambientación.

REGLA: Devuelve EXCLUSIVAMENTE UN ARRAY JSON VÁLIDO. SÓLO JSON. NADA MÁS. SIN \`\`\`json. SIN TEXTO DE PRÓLOGO. Tienen que venir en el mismo orden o coincidiendo con el "id".
Estructura Obligatoria del Array:
[
  {
    "id": "el_mismo_id_de_entrada",
    "genres": ["Género 1", "Género 2"],
    "occasions": ["Ocasión 1", "Ocasión 2"]
  }
]

CANCIONES A CATEGORIZAR:
${JSON.stringify(batch.map(s => ({ id: s.sourceId, title: s.title, artist: s.artist })), null, 2)}
`;

  try {
    const result = await model.generateContent(prompt);
    let text = result.response.text().trim();
    if (text.startsWith('```json')) text = text.replace(/```json/g, '').replace(/```/g, '').trim();
    if (text.startsWith('```')) text = text.replace(/```/g, '').trim();
    
    return JSON.parse(text);
  } catch (err) {
    console.error("  ? Error interno consultando IA (o de JSON):", err.message);
    return [];
  }
}

async function main() {
  console.log(`\n?? Iniciando el etiquetado inteligente con Gemini IA para ${songs.length} canciones...\n`);
  const enrichedSongs = [];
  const BATCH_SIZE = 30; // Chunks de 30 para evitar rechazos o fallos de parseo grandes.

  for (let i = 0; i < songs.length; i += BATCH_SIZE) {
    const batch = songs.slice(i, i + BATCH_SIZE);
    console.log(`Procesando lote ${Math.floor(i/BATCH_SIZE)+1}/${Math.ceil(songs.length/BATCH_SIZE)} (${batch.length} canciones, desde la #${i + 1})...`);
    
    // Simple retry mechanism por si Gemini no devuelve JSON válido o hay timeout
    let aiTags = [];
    let retries = 0;
    while (aiTags.length === 0 && retries < 3) {
        if (retries > 0) console.log('  ⚠️ Reintentando lote que falló...');
        aiTags = await enrichBatch(batch);
        retries++;
    }

    if (aiTags.length === 0) {
      console.log('  ❌ Falló el etiquetado del lote entero, se conservarán los tags básicos.');
    }

    // Merge con datos originales
    for (const song of batch) {
      const tags = aiTags.find(t => t.id === song.sourceId);
      if (tags) {
        // Sustituimos los 'brutos' que teníamos del Smart Tagger por estos de IA contextual
        song.genres = tags.genres && tags.genres.length > 0 ? tags.genres : song.genres;
        song.occasions = tags.occasions && tags.occasions.length > 0 ? tags.occasions : song.occasions;
      }
      enrichedSongs.push(song);
    }
  }

  db.songs = enrichedSongs;
  fs.writeFileSync(OUTPUT_FILE, JSON.stringify(db, null, 2));
  console.log(`\n✅ ¡Misión cumplida! Todo el repertorio fue categorizado contextualmente con IA.`);
  console.log(`💾 Los datos perfectos esperan en: ${OUTPUT_FILE}`);
}

main();