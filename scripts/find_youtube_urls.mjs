import { readFile, writeFile } from 'fs/promises';
import yts from 'yt-search';

const loadSongs = async () => {
  const json = await readFile(new URL('../docs/excel_normalized.json', import.meta.url), 'utf-8');
  return JSON.parse(json);
};

const searchVideo = async (title, artist) => {
  const query = `${title} ${artist}`;
  const result = await yts(query);
  if (!result || !result.videos || result.videos.length === 0) return null;
  const [first] = result.videos;
  return {
    title: first.title,
    url: first.url,
    duration: first.timestamp,
    views: first.views,
    author: first.author?.name || '',
  };
};

const main = async () => {
  const songs = await loadSongs();
  const missing = songs.filter((song) => !song.youtubeUrl || song.youtubeUrl.trim() === '');
  const candidates = [];
  for (const song of missing) {
    console.log(`Searching YouTube for: ${song.title} — ${song.artist}`);
    const candidate = await searchVideo(song.title, song.artist);
    candidates.push({
      title: song.title,
      artist: song.artist,
      originalCategories: song.originalCategories,
      suggested: candidate,
    });
  }

  await writeFile(new URL('../docs/youtube_candidates.json', import.meta.url), JSON.stringify(candidates, null, 2), 'utf-8');
  console.log('Wrote docs/youtube_candidates.json');
};

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
