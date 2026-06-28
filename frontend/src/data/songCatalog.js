import easyByakuya from "../assets/Songs/easy/Naruto Shippūden OST - Byakuya.mid?url";
import mediumFurElise from "../assets/Songs/medium/Fur Elise.mid?url";
import hardWinterWind from "../assets/Songs/hard/Etude op25 n11 ''Winter Wind''.mid?url";

const midiFiles = import.meta.glob("../assets/Songs/**/*.mid", {
  eager: true,
  query: "?url",
  import: "default",
});

export const DIFFICULTIES = [
  { id: "easy", label: "Easy", description: "Simpler arrangements, fewer notes" },
  { id: "medium", label: "Medium", description: "Classic pieces at a moderate pace" },
  { id: "hard", label: "Hard", description: "Fast, complex passages" },
];

const STORAGE_KEY = "pianly-song-selection";

const KNOWN_SONGS = [
  {
    id: "easy-naruto-byakuya",
    name: "Naruto Shippūden OST - Byakuya",
    url: easyByakuya,
    difficulty: "easy",
  },
  {
    id: "medium-fur-elise",
    name: "Fur Elise",
    url: mediumFurElise,
    difficulty: "medium",
  },
  {
    id: "hard-winter-wind",
    name: "Etude op25 n11 ''Winter Wind''",
    url: hardWinterWind,
    difficulty: "hard",
  },
];

function buildCatalog() {
  const catalog = { easy: [], medium: [], hard: [] };
  const seen = new Set();

  const addSong = (difficulty, song) => {
    if (seen.has(song.id)) return;
    seen.add(song.id);
    catalog[difficulty].push(song);
  };

  for (const song of KNOWN_SONGS) {
    addSong(song.difficulty, {
      id: song.id,
      name: song.name,
      url: song.url,
    });
  }

  for (const [path, url] of Object.entries(midiFiles)) {
    const match = path.match(/Songs\/(easy|medium|hard)\/(.+)\.mid$/);
    if (!match) continue;

    const [, difficulty, filename] = match;
    addSong(difficulty, {
      id: `${difficulty}-${filename}`,
      name: filename,
      url,
    });
  }

  for (const difficulty of Object.keys(catalog)) {
    catalog[difficulty].sort((a, b) => a.name.localeCompare(b.name));
  }

  return catalog;
}

export const SONG_CATALOG = buildCatalog();

export function getSavedSelection() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;

    const { difficulty, songId } = JSON.parse(raw);
    const song = SONG_CATALOG[difficulty]?.find((s) => s.id === songId);
    if (!song) return null;

    return { difficulty, song };
  } catch {
    return null;
  }
}

export function saveSelection(difficulty, songId) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify({ difficulty, songId }));
}
