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
  "17_Brahms_Lullaby_easy": "Brahms' Lullaby",
  "18_Mountain_King_easy": "In the Hall of the Mountain King",
  "19_Morning_Mood_easy": "Morning Mood",
  "20_Vivaldi_Spring_easy": "Vivaldi — Spring (Allegro)",
  "21_Goin_Home_easy": "Goin' Home",
  "22_Beethoven_5th_easy": "Beethoven's Fifth (Opening)",
  "23_William_Tell_easy": "William Tell Overture",
  "24_Oh_Susanna_easy": "Oh! Susanna",
  "25_When_the_Saints_easy": "When the Saints Go Marching In",
  "26_Swing_Low_easy": "Swing Low, Sweet Chariot",
  "27_Danny_Boy_easy": "Danny Boy",
  "28_Home_on_the_Range_easy": "Home on the Range",
  "29_This_Old_Man_easy": "This Old Man",
  "30_Pop_Goes_the_Weasel_easy": "Pop Goes the Weasel",
  "31_Michael_Row_easy": "Michael Row the Boat Ashore",
  "32_Coming_Round_Mountain_easy": "Coming Round the Mountain",
  "33_Clementine_easy": "Clementine",
  "34_Aura_Lee_easy": "Aura Lee",
  "35_Joy_to_the_World_easy": "Joy to the World",
  "36_O_Come_All_Ye_Faithful_easy": "O Come, All Ye Faithful",
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
  "01_Clementi_Sonatina_Op36No1_medium": "Clementi — Sonatina Op. 36 No. 1",
  "02_The_Entertainer_medium": "The Entertainer",
  "03_Gymnopedie_No1_medium": "Gymnopédie No. 1",
  "04_Chopin_Waltz_A_minor_medium": "Chopin — Waltz in A Minor",
  "05_Turkish_March_medium": "Turkish March",
  "06_Spring_Vivaldi_medium": "Vivaldi — Spring",
  "07_Ave_Maria_Schubert_medium": "Ave Maria (Schubert)",
  "08_Habanera_Bizet_medium": "Habanera (Bizet)",
  "09_Meditation_Thais_medium": "Meditation (Thaïs)",
  "10_Jesu_Joy_Bach_medium": "Jesu, Joy of Man's Desiring",
  "11_Air_on_G_String_medium": "Air on the G String",
  "12_Chopin_Prelude_Em_medium": "Chopin — Prelude in E Minor",
  "13_Gnossienne_No1_medium": "Gnossienne No. 1",
  "14_Clair_de_Lune_medium": "Clair de Lune",
  "15_Arabesque_No1_medium": "Arabesque No. 1",
  "16_Great_Gate_of_Kiev_medium": "Great Gate of Kiev",
  "17_Moonlight_Sonata_medium": "Moonlight Sonata (1st Movement)",
  "18_Beethoven_Minuet_G_medium": "Beethoven — Minuet in G",
  "19_Mozart_Symphony_40_medium": "Mozart — Symphony No. 40",
  "20_Bach_Musette_D_medium": "Bach — Musette in D",
  "21_Handel_Sarabande_Dm_medium": "Handel — Sarabande in D Minor",
  "22_Clarke_Trumpet_Voluntary_medium": "Clarke — Trumpet Voluntary",
  "23_Schubert_Serenade_medium": "Schubert — Serenade",
  "24_Schubert_Moment_Musical_3_medium": "Schubert — Moment Musical No. 3",
  "25_Schumann_Traumerei_medium": "Schumann — Träumerei",
  "26_Chopin_Prelude_A_medium": "Chopin — Prelude in A",
  "27_Chopin_Funeral_March_medium": "Chopin — Funeral March",
  "28_Brahms_Waltz_A_flat_medium": "Brahms — Waltz in A-flat",
  "29_Dvorak_Humoresque_7_medium": "Dvořák — Humoresque No. 7",
  "30_Tchaikovsky_Swan_Lake_medium": "Tchaikovsky — Swan Lake",
  "31_Saint_Saens_The_Swan_medium": "Saint-Saëns — The Swan",
  "32_Faure_Pavane_medium": "Fauré — Pavane",
  "33_Offenbach_Barcarolle_medium": "Offenbach — Barcarolle",
  "34_Verdi_La_donna_e_mobile_medium": "Verdi — La donna è mobile",
  "35_Bizet_Toreador_Song_medium": "Bizet — Toreador Song",
  "36_Grieg_Solveigs_Song_medium": "Grieg — Solveig's Song",
  "clementi-sonatina-no-1-op-36": "Sonatina in C, Op. 36 No. 1",
  // Hard
  "fur-elise-beethoven": "Für Elise",
};

function formatSongTitle(filename) {
  return filename
    .replace(/^\d+_/, "")
    .replace(/_(easy|medium|hard)$/i, "")
    .replace(/-easy(-piano)?$/i, "")
    .replace(/ MIDI$/i, "")
    .replace(/ - EASY$/i, "")
    .replace(/ \(MIDI Version\)$/i, "")
    .replace(/\.mid$/i, "")
    .replace(/_/g, " ")
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

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

    const name = SONG_DISPLAY_NAMES[filename] ?? formatSongTitle(filename);
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
