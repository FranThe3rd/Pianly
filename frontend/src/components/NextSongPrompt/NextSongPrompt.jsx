import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import { getSongCoverUrl } from "../../data/songCatalog";
import "./NextSongPrompt.css";

const AUTO_ADVANCE_SEC = 5;

export default function NextSongPrompt({ song, onPlayNext, onStay }) {
  const [secondsLeft, setSecondsLeft] = useState(AUTO_ADVANCE_SEC);

  useEffect(() => {
    setSecondsLeft(AUTO_ADVANCE_SEC);
  }, [song?.id]);

  useEffect(() => {
    if (!song) return;
    if (secondsLeft <= 0) {
      onPlayNext();
      return;
    }
    const timer = window.setTimeout(
      () => setSecondsLeft((value) => value - 1),
      1000
    );
    return () => window.clearTimeout(timer);
  }, [song, secondsLeft, onPlayNext]);

  if (!song) return null;

  return createPortal(
    <AnimatePresence>
      <motion.div
        className="next-song-backdrop"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
      >
        <motion.div
          className="next-song-card"
          initial={{ opacity: 0, scale: 0.94, y: 12 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.96, y: 8 }}
          transition={{ duration: 0.25, ease: "easeOut" }}
        >
          <p className="next-song-eyebrow">Song complete</p>
          <h2>Play next song?</h2>
          <div className="next-song-preview">
            <img src={getSongCoverUrl(song.id)} alt="" />
            <span>{song.name}</span>
          </div>
          <p className="next-song-countdown">
            Starting automatically in {secondsLeft}s
          </p>
          <div className="next-song-actions">
            <button type="button" className="next-song-primary" onClick={onPlayNext}>
              Play next now
            </button>
            <button type="button" className="next-song-secondary" onClick={onStay}>
              Stay on this song
            </button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>,
    document.body
  );
}
