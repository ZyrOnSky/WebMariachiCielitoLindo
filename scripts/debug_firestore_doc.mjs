import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs, limit, query } from 'firebase/firestore';
import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const firebaseConfig = JSON.parse(
  readFileSync(join(__dirname, '../firebase-applet-config.json'), 'utf-8')
);

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function checkSong() {
  const q = query(collection(db, 'songs'), limit(1));
  const snap = await getDocs(q);
  snap.forEach(doc => {
    console.log("ID:", doc.id);
    const data = doc.data();
    for(let key in data){
        let type = typeof data[key];
        if (Array.isArray(data[key])) type = 'array';
        if (data[key] && data[key].toDate) type = 'timestamp';
        console.log(`- ${key} (${type}):`, data[key]);
    }
  });
  process.exit();
}
checkSong();
