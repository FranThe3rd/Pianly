const midiFiles = import.meta.glob("../assets/Songs/**/*.mid", {
  eager: true,
  query: "?url",
  import: "default",
});

export const DIFFICULTIES = [
  { id: "easy", label: "Easy", sessionTitle: "Early Session", description: "Simpler arrangements, fewer notes" },
  { id: "medium", label: "Medium", sessionTitle: "Classic Session", description: "Classic pieces at a moderate pace" },
  { id: "hard", label: "Hard", sessionTitle: "Master Session", description: "Fast, complex passages" },
];

const STORAGE_KEY = "pianly-song-selection";

const SONG_DISPLAY_NAMES = {
  "Mary Had A Little Lamb [SUPER EASY] + Midi Download": "Mary Had A Little Lamb",
};

function slugify(filename) {
  return filename
    .toLowerCase()
    .replace(/['"]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

function buildCatalog() {
  const catalog = { easy: [], medium: [], hard: [] };
  const seenUrls = new Set();

  for (const [path, url] of Object.entries(midiFiles)) {
    const match = path.match(/Songs\/(easy|medium|hard)\/(.+)\.mid$/);
    if (!match) continue;

    const [, difficulty, filename] = match;
    if (seenUrls.has(url)) continue;

    seenUrls.add(url);
    catalog[difficulty].push({
      id: `${difficulty}-${slugify(filename)}`,
      name: SONG_DISPLAY_NAMES[filename] ?? filename,
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
    const songs = SONG_CATALOG[difficulty] ?? [];
    const song = songs.find((s) => s.id === songId);
    if (!song) return null;

    return { difficulty, song };
  } catch {
    return null;
  }
}

export function saveSelection(difficulty, songId) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify({ difficulty, songId }));
}

export function getSongCoverUrl(songId) {
  return `https://picsum.photos/seed/${encodeURIComponent(songId)}/200/200`;
}
