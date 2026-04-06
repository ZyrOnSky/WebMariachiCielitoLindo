import fs from 'fs';
import { GoogleGenerativeAI } from '@google/generative-ai';

const API_KEY = process.env.GOOGLE_GEMINI_API_KEY;
const genAI = new GoogleGenerativeAI(API_KEY);
const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash", generationConfig: { temperature: 0.1 } });

const FILE_PATH = 'data/wp-songs-ai-final.json';
const rawData = fs.readFileSync(FILE_PATH, 'utf8');
const db = JSON.parse(rawData);

// Extraer artistas únicos actuales
const uniqueArtists = [...new Set(db.songs.map(s => s.artist).filter(Boolean))];

async function main() {
  console.log(`\n?? Normalizando ${uniqueArtists.length} artistas con Gemini...\n`);
  
  const prompt = `
  Actúa como un experto en música de Mariachi y géneros latinos. 
  A continuación tienes una lista de nombres de artistas. Algunos tienen faltas de ortografía menores, ausencia de tildes o están mal espaciados (por ejemplo, "Leodan" suele ser "Leo Dan", "Pedro Fernandez" lleva tilde "Pedro Fernández", etc).
  
  Devuelve EXCLUSIVAMENTE un JSON válido que sea un mapa/diccionario exacto desde el nombre original al nombre perfectamente corregido. 
  REGLA: SOLO JSON, NADA MÁS. SIN \`\`\`json. SIN TEXTO.
  Formato esperado:
  {
    "Vicente Fernandez": "Vicente Fernández",
    "Leodan": "Leo Dan",
    "Nombre Bien": "Nombre Bien"
  }

  Artistas a evaluar:
  ${JSON.stringify(uniqueArtists, null, 2)}
  `;

  try {
    const result = await model.generateContent(prompt);
    let text = result.response.text().trim();
    if (text.startsWith('```json')) text = text.replace(/```json/g, '').replace(/```/g, '').trim();
    if (text.startsWith('```')) text = text.replace(/```/g, '').trim();
    
    const mapping = JSON.parse(text);
    console.log("? Diccionario de correcciones de IA:");
    console.table(mapping);

    let modifiedSongs = 0;
    
    // Aplicar la corrección a la base de datos
    db.songs.forEach(song => {
      const originalArtist = song.artist;
      if (originalArtist && mapping[originalArtist]) {
        const correctedArtist = mapping[originalArtist];
        
        if (originalArtist !== correctedArtist) {
          modifiedSongs++;
        }
        
        // Actualizamos el string singular y el array
        song.artist = correctedArtist;
        if (Array.isArray(song.artists) && song.artists.length > 0) {
          song.artists = [correctedArtist];
        }
      }
    });

    fs.writeFileSync(FILE_PATH, JSON.stringify(db, null, 2));
    console.log(`\n? ¡Éxito! \${modifiedSongs} canciones actualizadas a su ortografía perfecta.`);
    
  } catch (err) {
    console.error("? Error consultando a Gemini:", err.message);
  }
}

main();