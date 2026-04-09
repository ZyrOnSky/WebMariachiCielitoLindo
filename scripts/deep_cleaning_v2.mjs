import { readFileSync, writeFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const dbPath = join(__dirname, '../docs/merged_songs_gemini.json');
let data = JSON.parse(readFileSync(dbPath, 'utf8'));

// Diccionario de corrección manual para los nombres con mayúsculas/minúsculas o acentos averiados
const exactFixMap = {
  'Alejandro FernáNdez': 'Alejandro Fernández',
  'Javier SolíS': 'Javier Solís',
  'JesúS AdriáN Romero': 'Jesús Adrián Romero',
  'José Alfredo JiméNez': 'José Alfredo Jiménez',
  'José Luis RodríGuez': 'José Luis Rodríguez',
  'La Quinta EstacióN': 'La Quinta Estación',
  'Los Hijos De MaríA': 'Los Hijos de María',
  'Los ÁNgeles Azules': 'Los Ángeles Azules',
  'Marco Antonio SolíS': 'Marco Antonio Solís',
  'Mariachi Nuevo TecalitláN': 'Mariachi Nuevo Tecalitlán',
  'Mariachi Sol De MéXico': 'Mariachi Sol de México',
  'Mariachi Vargas De TecalitláN': 'Mariachi Vargas de Tecalitlán',
  'Miguel A. MejíA': 'Miguel A. Mejía',
  'Miriam SolíS': 'Miriam Solís',
  'Natalia JiméNez': 'Natalia Jiménez',
  'Olga TañóN': 'Olga Tañón',
  'Oscar De LeóN': 'Oscar de León',
  'Pedro FernáNdez': 'Pedro Fernández',
  'RocíO DúRcal': 'Rocío Dúrcal',
  'Rocio Durcal': 'Rocío Dúrcal',
  'RocíO Jurado': 'Rocío Jurado',
  'RáFaga': 'Ráfaga',
  'Vicente FernáNdez': 'Vicente Fernández',
  'Sol De Mexico': 'Mariachi Sol de México'
};

const genreFixMap = {
  'cumbias': 'Cumbia',
  'Cumbias': 'Cumbia',
  'Popular': 'Popular (Colombiana)' // Consolidar
};

data = data.map(song => {
  if (song.artist && exactFixMap[song.artist]) {
    song.artist = exactFixMap[song.artist];
  }
  
  // Limpieza de Cumbias y Popular en Géneros
  if (song.genres && Array.isArray(song.genres)) {
    let cleanGenres = song.genres.map(g => genreFixMap[g] || g);
    song.genres = [...new Set(cleanGenres)];
  }

  return song;
});

writeFileSync(dbPath, JSON.stringify(data, null, 2), 'utf8');
console.log(`✅ Base de datos limpiada (Fase 2 de corrección de mayúsculas erróneas y acentos superados).`);
