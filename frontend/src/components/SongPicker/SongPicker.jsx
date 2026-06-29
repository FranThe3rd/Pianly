import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  DIFFICULTIES,
  SONG_CATALOG,
  getSavedSelection,
  getSongCoverUrl,
  isSongUnlocked,
} from "../../data/songCatalog";
import { useSubscription } from "../../context/SubscriptionContext";
import "./SongPicker.css";

export default function SongPicker({ onConfirm, showHeader = true }) {
  const navigate = useNavigate();
  const { pro } = useSubscription();
  const saved = getSavedSelection();
  const [difficulty, setDifficulty] = useState(saved?.difficulty ?? "easy");
  const [songId, setSongId] = useState(
    () => saved?.song?.id ?? SONG_CATALOG.easy[0]?.id ?? null
  );
  const [query, setQuery] = useState("");

  const session = DIFFICULTIES.find((level) => level.id === difficulty);
  const songs = SONG_CATALOG[difficulty] ?? [];
  const filteredSongs = useMemo(() => {
    const trimmed = query.trim().toLowerCase();
    if (!trimmed) return songs;

    return songs.filter((song) => song.name.toLowerCase().includes(trimmed));
  }, [songs, query]);

  const selectedSong =
    filteredSongs.find((s) => s.id === songId) ?? filteredSongs[0] ?? null;
  const selectedLocked = selectedSong
    ? !isSongUnlocked(selectedSong, pro)
    : false;

  const handleDifficultyChange = (id) => {
    setDifficulty(id);
    setQuery("");
    const first = SONG_CATALOG[id]?.[0];
    setSongId(first?.id ?? null);
  };

  const handleConfirm = () => {
    if (!selectedSong) return;
    if (selectedLocked) {
      navigate("/pricing");
      return;
    }
    onConfirm(difficulty, selectedSong);
  };

  return (
    <div className="song-picker">
      <div className="song-picker-panel">
        {showHeader && (
          <header className="song-picker-header">
            <h1>Browse songs</h1>
            <p>Pick a difficulty and song to start practicing.</p>
          </header>
        )}

        <div className="song-picker-tabs" role="tablist" aria-label="Difficulty">
          {DIFFICULTIES.map((level) => (
            <button
              key={level.id}
              type="button"
              role="tab"
              aria-selected={difficulty === level.id}
              className={
                difficulty === level.id
                  ? "song-picker-tab active"
                  : "song-picker-tab"
              }
              onClick={() => handleDifficultyChange(level.id)}
            >
              {level.label}
            </button>
          ))}
        </div>

        <label className="song-picker-search-wrap">
          <span className="song-picker-search-icon" aria-hidden="true">
            ⌕
          </span>
          <input
            type="search"
            className="song-picker-search"
            placeholder="Search songs..."
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            aria-label="Search songs"
          />
          {query && (
            <button
              type="button"
              className="song-picker-search-clear"
              onClick={() => setQuery("")}
              aria-label="Clear search"
            >
              ×
            </button>
          )}
        </label>

        <div key={difficulty} className="song-picker-content">
          <h2 className="song-picker-session">{session?.sessionTitle ?? "Session"}</h2>

          {songs.length === 0 ? (
            <p className="song-picker-empty">No songs in this difficulty yet.</p>
          ) : filteredSongs.length === 0 ? (
            <p className="song-picker-empty">No songs match &ldquo;{query}&rdquo;.</p>
          ) : (
            <div className="song-grid">
              {filteredSongs.map((song, index) => {
                const isActive = selectedSong?.id === song.id;
                const locked = !isSongUnlocked(song, pro);

                return (
                  <button
                    key={song.id}
                    type="button"
                    className={
                      (isActive ? "song-tile active" : "song-tile") +
                      (locked ? " locked" : "")
                    }
                    style={{ animationDelay: `${index * 45}ms` }}
                    onClick={() => setSongId(song.id)}
                    aria-pressed={isActive}
                  >
                    <span className="song-tile-index">
                      {locked ? "🔒" : index + 1}
                    </span>
                    <span className="song-tile-art">
                      <img src={getSongCoverUrl(song.id)} alt="" loading="lazy" />
                      <span className="song-disc" aria-hidden="true">
                        <span className="song-disc-ring" />
                        <span className="song-disc-label">♪</span>
                      </span>
                    </span>
                    <span className="song-tile-title">{song.name}</span>
                    {locked && <span className="song-tile-badge">PRO</span>}
                  </button>
                );
              })}
            </div>
          )}
        </div>

        <button
          type="button"
          className="song-picker-start"
          onClick={handleConfirm}
          disabled={!selectedSong}
        >
          {selectedLocked ? "Unlock with Pro — $8/month" : "Start playing"}
        </button>
      </div>
    </div>
  );
}
