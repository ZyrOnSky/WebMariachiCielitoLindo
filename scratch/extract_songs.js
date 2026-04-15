const fs = require('fs');
const path = require('path');

try {
    const jsonPath = 'd:\\Moises\\Documents\\DESARROLLOS PROFESIONALES\\MARIACHI CIELITO LINDO\\WMCL_Prototipe_clean\\docs\\listas_json\\final_purified_songs.json';
    const content = fs.readFileSync(jsonPath, 'utf8');
    const songs = JSON.parse(content);

    const occasions = [
        "Ambientación",
        "Fiestas y Despedidas",
        "Aniversarios y Románticas",
        "Serenatas",
        "Despecho",
        "Día de la Madre",
        "Bodas y Matrimonios",
        "Cumpleaños",
        "Música Cristiana/Católica",
        "Velorios y Sepelios",
        "Día del Padre",
        "Quinceañeras",
        "Graduaciones"
    ];

    const results = {};

    occasions.forEach(occ => {
        results[occ] = songs
            .filter(s => s.occasions && s.occasions.includes(occ))
            .sort((a, b) => (b.youtubeUrl ? 1 : 0) - (a.youtubeUrl ? 1 : 0))
            .slice(0, 10)
            .map(s => s.title);
    });

    process.stdout.write(JSON.stringify(results, null, 2));
} catch (err) {
    console.error(err);
    process.exit(1);
}
