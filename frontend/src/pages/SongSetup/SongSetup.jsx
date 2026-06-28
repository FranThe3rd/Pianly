import { useState } from "react";
import { DIFFICULTIES, SONG_CATALOG } from "../../data/songCatalog";
import "./SongSetup.css";

export default function SongSetup({ onConfirm }) {
  const [difficulty, setDifficulty] = useState("easy");
  const [songId, setSongId] = useState(() => SONG_CATALOG.easy[0]?.id ?? null);

  const songs = SONG_CATALOG[difficulty] ?? [];
  const selectedSong = songs.find((s) => s.id === songId) ?? songs[0] ?? null;

  const handleDifficultyChange = (id) => {
    setDifficulty(id);
    const first = SONG_CATALOG[id]?.[0];
    setSongId(first?.id ?? null);
  };

  const handleConfirm = () => {
    if (!selectedSong) return;
    onConfirm(difficulty, selectedSong);
  };

  return (
    <div className="song-setup">
      <div className="song-setup-card">
        <header className="song-setup-header">
          <h1>Choose your song</h1>
          <p>Pick a difficulty and song to start practicing.</p>
        </header>

        <section className="song-setup-section">
          <h2>Difficulty</h2>
          <div className="song-setup-difficulties">
            {DIFFICULTIES.map((level) => (
              <button
                key={level.id}
                type="button"
                className={
                  difficulty === level.id
                    ? "song-setup-difficulty active"
                    : "song-setup-difficulty"
                }
                onClick={() => handleDifficultyChange(level.id)}
              >
                <span className="song-setup-difficulty-label">{level.label}</span>
                <span className="song-setup-difficulty-desc">{level.description}</span>
              </button>
            ))}
          </div>
        </section>

        <section className="song-setup-section">
          <h2>Song</h2>
          {songs.length === 0 ? (
            <p className="song-setup-empty">No songs in this difficulty yet.</p>
          ) : (
            <ul className="song-setup-songs">
              {songs.map((song) => (
                <li key={song.id}>
                  <button
                    type="button"
                    className={
                      selectedSong?.id === song.id
                        ? "song-setup-song active"
                        : "song-setup-song"
                    }
                    onClick={() => setSongId(song.id)}
                  >
                    {song.name}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </section>

        <button
          type="button"
          className="song-setup-start"
          onClick={handleConfirm}
          disabled={!selectedSong}
        >
          Start playing
        </button>
      </div>
    </div>
  );
}
