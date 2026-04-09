import { readFile } from 'fs/promises';
import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs } from 'firebase/firestore';

const configText = await readFile(new URL('../firebase-applet-config.json', import.meta.url), 'utf-8');
const firebaseConfig = JSON.parse(configText);
const app = initializeApp(firebaseConfig);
const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);
const songsCol = collection(db, 'songs');
console.log('Fetching songs...');
const snapshot = await getDocs(songsCol);
const songs = [];
snapshot.forEach(doc => songs.push({ id: doc.id, ...doc.data() }));
console.log('Fetched', songs.length, 'documents');
console.log(JSON.stringify(songs, null, 2));
