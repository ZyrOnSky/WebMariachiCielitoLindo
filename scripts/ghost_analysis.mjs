import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const backupFile = 'songs_backup_2026-04-08T19-33-19-219Z.json';
const backupPath = join(__dirname, '../docs/backups/', backupFile);

function normalize(s) {
  return s.toLowerCase().trim().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
}

try {
  const songs = JSON.parse(readFileSync(backupPath, 'utf-8'));
  
  const visibleSongs = songs.filter(s => !!s.createdAt);
  const ghostSongs = songs.filter(s => !s.createdAt);

  console.log('👻 INFORME DE CANCIONES FANTASMA');
  console.log('===============================');
  console.log(`Total de canciones en backup: ${songs.length}`);
  console.log(`✅ Canciones Visibles (con createdAt): ${visibleSongs.length}`);
  console.log(`👻 Canciones Fantasma (sin createdAt): ${ghostSongs.length}`);

  const visibleKeys = new Set(visibleSongs.map(s => `${normalize(s.title)}|${normalize(s.artist)}`));
  
  const ghostWithCounterpart = [];
  const ghostUnique = [];

  ghostSongs.forEach(s => {
    const key = `${normalize(s.title)}|${normalize(s.artist)}`;
    if (visibleKeys.has(key)) {
      ghostWithCounterpart.push(s);
    } else {
      ghostUnique.push(s);
    }
  });

  console.log(`\n🔍 Análisis de Fantasmas:`);
  console.log(`   - Fantasmas que TIENEN versión visible: ${ghostWithCounterpart.length}`);
  console.log(`   - Fantasmas que NO tienen versión visible (únicos): ${ghostUnique.length}`);

  if (ghostWithCounterpart.length > 0) {
    console.log('\n📋 Ejemplos de fantasmas con duplicado visible (estos son seguros de borrar):');
    ghostWithCounterpart.slice(0, 5).forEach(s => console.log(`   - ${s.title} (${s.artist})`));
    if (ghostWithCounterpart.length > 5) console.log(`     ... y ${ghostWithCounterpart.length - 5} más.`);
  }

  if (ghostUnique.length > 0) {
    console.log('\n📋 Ejemplos de fantasmas ÚNICOS (si los borras, se pierden de la web):');
    ghostUnique.slice(0, 10).forEach(s => console.log(`   - ${s.title} (${s.artist})`));
    if (ghostUnique.length > 10) console.log(`     ... y ${ghostUnique.length - 10} más.`);
  }

  console.log('\n===============================');
  console.log('CONCLUSIÓN:');
  if (ghostUnique.length > 0) {
    console.log('⚠️  Cuidado: Si borras todos los fantasmas, las canciones de la lista "Únicos" DESAPARECERÁN de la web');
    console.log('    ya que actualmente no se muestran pero tampoco tienen una copia visible.');
  }

} catch (error) {
  console.error(error);
}
