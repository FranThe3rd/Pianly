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
  // Easy
  "01_Amazing_Grace_easy": "Amazing Grace",
  "02_Silent_Night_easy": "Silent Night",
  "03_Auld_Lang_Syne_easy": "Auld Lang Syne",
  "04_Greensleeves_easy": "Greensleeves",
  "05_Scarborough_Fair_easy": "Scarborough Fair",
  "06_Minuet_in_G_easy": "Minuet in G",
  "07_Prelude_in_C_Bach_easy": "Prelude in C (Bach)",
  "08_Fur_Elise_opening_easy": "Für Elise (Opening)",
  "09_Canon_in_D_easy": "Canon in D",
  "10_Kum_Ba_Yah_easy": "Kum Ba Yah",
  "11_This_Little_Light_easy": "This Little Light of Mine",
  "12_Yankee_Doodle_easy": "Yankee Doodle",
  "13_Frere_Jacques_easy": "Frère Jacques",
  "14_Deck_the_Halls_easy": "Deck the Halls",
  "15_Skip_to_My_Lou_easy": "Skip to My Lou",
  "16_Camptown_Races_easy": "Camptown Races",
  "Happy Birthday MIDI": "Happy Birthday",
  "Hot Cross Buns": "Hot Cross Buns",
  "Jingle Bells - EASY": "Jingle Bells",
  "Old Macdonald had a farm.mid": "Old MacDonald Had a Farm",
  "Twinkle Twinkle Little Star (MIDI Version)": "Twinkle, Twinkle, Little Star",
  "chopsticks-euphemia-allen-easy-piano": "Chopsticks",
  "london-bridge-easy-piano": "London Bridge",
  "mary-had-a-little-lamb": "Mary Had a Little Lamb",
  "ode-to-joy-easy-variation": "Ode to Joy",
  "row-row-row-your-boat-round": "Row, Row, Row Your Boat",
  // Medium
  "clementi-sonatina-no-1-op-36": "Sonatina in C, Op. 36 No. 1",
  // Hard
  "fur-elise-beethoven": "Für Elise",
};

export function isSongFree(song) {
  return Boolean(song?.free);
}

export function isSongUnlocked(song, isPro) {
  return Boolean(isPro) || isSongFree(song);
}

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

    const name = SONG_DISPLAY_NAMES[filename] ?? filename;
    seenUrls.add(url);
    catalog[difficulty].push({
      id: `${difficulty}-${slugify(filename)}`,
      name,
      url,
      free: false,
    });
  }

  for (const difficulty of Object.keys(catalog)) {
    catalog[difficulty].sort((a, b) => a.name.localeCompare(b.name));
  }

  catalog.easy.forEach((song, index) => {
    song.free = index < 5;
  });

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
