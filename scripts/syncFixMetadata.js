import admin from 'firebase-admin';
import { readFileSync, writeFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const firebaseConfig = JSON.parse(
  readFileSync(join(__dirname, '../firebase-applet-config.json'), 'utf-8')
);

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(firebaseConfig)
  });
}

const db = admin.firestore();
const data = JSON.parse(readFileSync(join(__dirname, '../data/wp-songs-ai-final.json'), 'utf-8'));

async function sync() {
    const songsRef = db.collection('songs');
    const snapshot = await songsRef.get();
    let count = 0;
    
    for (const doc of snapshot.docs) {
        const songClient = doc.data();
        const updated = data.songs.find(s => s.title === songClient.title);
        if (updated && updated.artist !== songClient.artist) {
            console.log(`Updating ${songClient.title}: ${songClient.artist} -> ${updated.artist}`);
            await songsRef.doc(doc.id).update({
                artist: updated.artist,
                updatedAt: admin.firestore.FieldValue.serverTimestamp()
            });
            count++;
        }
    }
    console.log(`Synced ${count} records successfully!`);
}

sync().catch(console.error).finally(() => process.exit(0));
