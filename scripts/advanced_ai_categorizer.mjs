import 'dotenv/config'; // Asegura cargar variables de entorno
import { readFile, writeFile } from 'fs/promises';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Recolectar múltiples llaves para rotación (evitar limit rate)
const apiKeys = [
  process.env.GOOGLE_GEMINI_API_KEY_1,
  process.env.GOOGLE_GEMINI_API_KEY_2,
  process.env.GOOGLE_GEMINI_API_KEY_3,
  process.env.GOOGLE_GEMINI_API_KEY_4,
  process.env.GOOGLE_GEMINI_API_KEY_5,
  process.env.GOOGLE_GEMINI_API_KEY // Compatibilidad hacia atrás
].filter(key => key && !key.includes('TU_API_KEY_AQUI'));

if (apiKeys.length === 0) {
  throw new Error('No se detectó ninguna API Key válida en el .env. Por favor pega tu llave real allí.');
}

// Inicializar un pool de instancias GenAI
const genAIs = apiKeys.map(key => new GoogleGenerativeAI(key));
const modelNames = ['gemini-2.5-flash', 'gemini-2.0-flash', 'gemini-2.5-flash-lite'];

let currentKeyIndex = 0;
let currentModelIndex = 0;

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const main = async () => {
  const dbPath = join(__dirname, '../docs/merged_songs_gemini.json');
  const firebaseDbPath = join(__dirname, '../docs/firebase_songs.json');

  const data = JSON.parse(await readFile(dbPath, 'utf8'));
  const firebaseData = JSON.parse(await readFile(firebaseDbPath, 'utf8'));

  // 1. Recolectar lista de géneros originales de Firestore
  const allGenres = new Set();
  firebaseData.forEach(song => {
    if (song.genres) {
      song.genres.forEach(g => allGenres.add(g));
    }
  });
  
  // Agregar un par de géneros fuertes 
  allGenres.add('Salsa');
  allGenres.add('Cumbias');
  allGenres.add('Merengues');
  const validGenresList = Array.from(allGenres).join(', ');

  // 2. Definir lista de ocasiones maestras
  const validOccasionsList = [
    "Ambientación", "Aniversarios y Románticas", "Serenatas", "Fiestas y Despedidas",
    "Despecho", "Cumpleaños", "Bodas y Matrimonios", "Día de la Madre", 
    "Música Cristiana/Católica", "Velorios y Sepelios", "Día del Padre", 
    "Quinceañeras", "Graduaciones", "Entrada"
  ].join(', ');

  // Separar los que ya están listos (no tienen categories) de los pendientes
  const pendingData = data.filter(s => Object.hasOwn(s, 'categories') && (!s.genres || s.genres.length === 0));
  const processedData = data.filter(s => !pendingData.includes(s));

  if (pendingData.length === 0) {
    console.log('¡Todas las canciones ya están categorizadas con IA! Nada que procesar.');
    return;
  }

  console.log(`Iniciando IA Avanzada... ${processedData.length} ya listas, procesando ${pendingData.length} restantes.`);
  console.log(`Géneros de referencia: ${validGenresList}`);

  const batchSize = 30;
  const finalResults = [...processedData]; // Iniciamos metiendo lo que ya está listo

  for (let i = 0; i < pendingData.length; i += batchSize) {
    const batch = pendingData.slice(i, i + batchSize);
    console.log(`Analizando lote ${Math.floor(i / batchSize) + 1} de ${Math.ceil(pendingData.length / batchSize)}...`);

    // Preparar el objeto de la canción asegurando que esté limpia
    const promptBatch = batch.map(song => ({
      title: song.title,
      artist: song.artist,
      categories: song.categories || [] // Temporalmente lo leemos de categories
    }));

    const prompt = `
Eres un experto etnomusicólogo especializado en música tradicional mexicana y de mariachi.
Te proporciono un arreglo JSON de ${promptBatch.length} canciones.
Necesidades de la IA:
1. Tienes que leer cada canción y separar sus actuales 'categories' en dos arreglos: "genres" (Géneros Musicales) y "occasions" (Ocasiones de Evento).
2. Para "genres": Debes asignar 1 o 2 géneros musicales adecuados basados en el Título y Artista. Intenta usar estrictamente esta lista de géneros autorizados: [${validGenresList}]. Si y solo si es supremamente necesario para mantener precisión, puedes sugerir un género nuevo, pero no te excedas.
3. Para "occasions": Analiza el título y el artista. Si la canción tiene 0 o 1 sola ocasión en su arreglo original, y deduces que es perfecta para otra ocasión común (por ejemplo, "Las Mañanitas" sirve para "Cumpleaños" y "Día de la Madre", o un tema de Juan Gabriel sirve para "Despecho" y "Ambientación"), AGREGALAS. Usa exclusivamente esta lista de ocasiones: [${validOccasionsList}]. Trata de que las canciones icónicas tengan 2 o 3 ocasiones válidas para que la app tenga filtros exitosos. 

Devuelve única y exactamente un JSON Array de objetos con la siguiente estructura:
[
  {
    "title": "...", 
    "artist": "...",
    "genres": ["...", "..."],
    "occasions": ["...", "..."]
  }
]

JSON Entrada:
${JSON.stringify(promptBatch)}
`;

    try {
      let result;
      let success = false;
      let aiError = null;

      for (let attempt = 0; attempt < (genAIs.length * modelNames.length); attempt++) {
        try {
          const genAI = genAIs[currentKeyIndex];
          const modelName = modelNames[currentModelIndex];
          const activeModel = genAI.getGenerativeModel({
            model: modelName,
            generationConfig: { temperature: 0.2, responseMimeType: 'application/json' }
          });

          result = await activeModel.generateContent(prompt);
          success = true;
          break; // Salimos del bucle de reintentos
        } catch (e) {
          aiError = e;
          const isRateLimit = e.status === 429 || e.message?.includes('429') || e.message?.includes('quota') || e.message?.includes('exhausted');
          const isServerDown = e.status === 503 || e.message?.includes('503') || e.message?.includes('high demand') || e.message?.includes('unavailable');
          
          if (isRateLimit || isServerDown) {
            console.warn(`\n[!] Problema en Key ${currentKeyIndex + 1} con modelo ${modelNames[currentModelIndex]}: ${isRateLimit ? '(429) Limite cuota' : '(503) Saturación en Google'}.`);
            
            // Si hay alta demanda general (503), quizá cambiar a Gemini 1.5-flash funcione mejor que cambiar la pura llave.
            if (isServerDown) {
              currentModelIndex = (currentModelIndex + 1) % modelNames.length;
              console.warn(` -> Cambiando al modelo alternativo: ${modelNames[currentModelIndex]}`);
            } else {
              // Si es limite de cuota (429), la llave sí se quemó temporalmente, cambiamos la llave API
              currentKeyIndex = (currentKeyIndex + 1) % genAIs.length;
              console.warn(` -> Cambiando a la API Key alternativa...`);
            }

            await sleep(3000); // Pausa prudente
          } else {
            throw e; // Error grave (ej. de sintaxis o de formato)
          }
        }
      }

      if (!success) {
        throw new Error(`Todas las llaves están bloqueadas o fallaron. Último error: ${aiError.message}`);
      }

      const text = result.response.text();
      const parsed = JSON.parse(text);

      if (Array.isArray(parsed) && parsed.length === batch.length) {
        // Empalmar de vuelta los valores preservados (URLs, firestoreId) de la DB
        const enrichedBatch = batch.map((originalSong, idx) => {
          const aiData = parsed[idx];
          return {
            title: originalSong.title,
            artist: originalSong.artist,
            youtubeUrl: originalSong.youtubeUrl,
            firestoreId: originalSong.firestoreId,
            source: originalSong.source,
            genres: aiData.genres || [],
            occasions: aiData.occasions || []
          };
        });
        finalResults.push(...enrichedBatch);
      } else {
        // Como fallback extremo, guardamos el original y reponemos el lote no procesado en la lista final
        console.error('Gemini devolvió un formato no válido. Se conserva la estructura original del lote.');
        finalResults.push(...batch);
      }
    } catch (e) {
      console.error(`\nMúltiples reintentos fallaron para este lote. Pausa de emergencia obligatoria (90s) para limpiar cuotas de Google.\nError: ${e.message}`);
      finalResults.push(...batch);
      await sleep(90000); // 90 segundos para asegurar que el RPM se resetee de cara a la prox ejecución/lote
    }
    
    // Esperar 4.5 segundos por lote asegura matemáticamente NO exceder los 15 RPM gratuitos de Gemini
    await sleep(4500);
  }

  await writeFile(dbPath, JSON.stringify(finalResults, null, 2), 'utf8');
  console.log('\n✅ Re-categorización por Inteligencia Artificial completada con éxito.');
  console.log('Ahora tienes los campos "genres" y "occasions" perfectamente separados y enriquecidos.');
};

main().catch(err => {
  console.error("Error crítico:", err);
  process.exit(1);
});
