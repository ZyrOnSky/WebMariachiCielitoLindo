import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DATA_DIR = path.resolve(__dirname, '../data');

const NORMALIZED_PATH = path.join(DATA_DIR, 'wp-songs-normalized.json');
const RULES_PATH = path.join(DATA_DIR, 'wp-enrichment-rules.json');

function normalizeKey(str) {
  return str.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim();
}

const DICTIONARY = {
  occasions: {
    "Quinceañeras": ["quinceañera", "quinceanera", "quince", "niña a mujer", "vals", "15", "quince primaveras"],
    "Cumpleaños": ["mañanitas", "cumpleaños", "dia", "felicidades", "sapo verde", "festejamos"],
    "Día de la Madre": ["madre", "mama", "mamá", "señora", "madrecita", "amor eterno"],
    "Día del Padre": ["padre", "papa", "papá", "viejo", "hombre"],
    "Velorios / Despedidas": ["despedida", "cruz de olvido", "puño de tierra", "entierro", "dios", "cielo", "golondrinas", "vida no vale nada"],
    "Bodas / Aniversarios": ["boda", "novia", "anillo", "esposos", "eternidad", "mitad", "casamiento", "hermoso cariño", "hasta la eternidad"],
    "Serenatas (Románticas)": ["amor", "corazon", "motivo", "adoro", "amorcito", "quiero", "serenata", "linda", "hermosa"],
    "Reconciliación": ["perdon", "vuelve", "olvido", "fallaste", "equivocaste", "regresa", "llorar", "rogar"],
    "Show Bailable / Fiestas": ["mariachi loco", "carnaval", "fiesta", "bailar", "cumbia", "moño", "baile"]
  },
  genres: {
    "Ranchera": ["mariachi", "rey", "rancho", "caballo", "ranchera", "mexico", "tequila", "volvolver"],
    "Bolero": ["bolero", "trio", "reloj", "sabor a mi", "amor eterno", "mitad"],
    "Cumbia": ["cumbia", "sonora", "carmen", "mariachi loco"],
    "Corrido": ["corrido", "gabino", "bandido", "juan", "caballo", "federal de caminos"],
    "Son": ["son ", "negra", "madrugada", " cascabel"],
    "Huapango": ["huapango", "falsete", "cielo rojo", "malagueña", "cucurrucucu", "serenata huasteca"],
    "Pasodoble": ["pasodoble", "viva españa", "plata", "toro"]
  }
};

async function runTagger() {
  console.log('🧠 Iniciando Smart Tagger de Mariachi...');

  if (!fs.existsSync(NORMALIZED_PATH)) {
    console.error('❌ Falla: wp-songs-normalized.json no encontrado.');
    return;
  }

  const normalized = JSON.parse(fs.readFileSync(NORMALIZED_PATH, 'utf-8'));
  let rulesData = {};
  if (fs.existsSync(RULES_PATH)) {
    rulesData = JSON.parse(fs.readFileSync(RULES_PATH, 'utf-8'));
  }

  if (!rulesData.bySourceId) rulesData.bySourceId = {};

  let assignedCount = 0;

  normalized.songs.forEach(song => {
    const titleKey = normalizeKey(song.title);
    
    // Preservar lo que ya hay en las reglas (como links de YouTube)
    if (!rulesData.bySourceId[song.sourceId]) {
      rulesData.bySourceId[song.sourceId] = {};
    }
    const rule = rulesData.bySourceId[song.sourceId];

    let newOccasions = new Set();
    let newGenres = new Set();

    // Sumar las ocasiones que venían por defecto en WordPress (si es que tenían)
    if (song.occasions) {
        song.occasions.forEach(o => newOccasions.add(o));
    }
    if (song.genres) {
        song.genres.forEach(g => newGenres.add(g));
    }

    // Análisis inteligente basado en palabras clave en el título
    // Ocasiones
    for (const [occasion, keywords] of Object.entries(DICTIONARY.occasions)) {
      if (keywords.some(kw => titleKey.includes(kw))) {
        newOccasions.add(occasion);
      }
    }

    // Géneros
    for (const [genre, keywords] of Object.entries(DICTIONARY.genres)) {
      if (keywords.some(kw => titleKey.includes(kw))) {
        newGenres.add(genre);
      }
    }

    // Reglas maestras para las típicas canciones que a veces el regex no atrapa bien:
    if (titleKey.includes("mananitas")) { newOccasions.add("Cumpleaños"); newOccasions.add("Día de la Madre"); newOccasions.add("Quinceañeras"); newGenres.add("Ranchera"); }
    if (titleKey === "el rey") { newGenres.add("Ranchera"); newOccasions.add("Despedidas / Velorios"); newOccasions.add("Serenatas (Románticas)"); }
    if (titleKey.includes("hermoso carino")) { newOccasions.add("Serenatas (Románticas)"); newOccasions.add("Bodas / Aniversarios"); newGenres.add("Ranchera"); }
    if (titleKey.includes("amor eterno")) { newOccasions.add("Día de la Madre"); newOccasions.add("Velorios / Despedidas"); newGenres.add("Bolero"); }
    if (titleKey.includes("mi viejo")) { newOccasions.add("Día del Padre"); newOccasions.add("Cumpleaños"); }
    if (titleKey.includes("loco")) { newOccasions.add("Show Bailable / Fiestas"); newGenres.add("Cumbia"); }

    // Fallback: Si no logramos inferir ningún género, al menos le asignamos "Ranchera" que es el 80% del catálogo.
    if (newGenres.size === 0) newGenres.add("Ranchera");
    // Fallback: Si no tiene ocasión, "Serenatas (Románticas)" es lo más común.
    if (newOccasions.size === 0) newOccasions.add("Serenatas (Románticas)");

    // Guardar en la regla
    rule.occasions = Array.from(newOccasions);
    rule.genres = Array.from(newGenres);

    assignedCount++;
  });

  fs.writeFileSync(RULES_PATH, JSON.stringify(rulesData, null, 2));
  
  console.log(`✨ Smart Tagger completado.`);
  console.log(`✅ Se auto-etiquetaron ${assignedCount} canciones con categorizaciones múltiples e inteligentes.`);
  console.log(`🚀 Siguiente paso: npm run wp:enrich`);
}

runTagger();