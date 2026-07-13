import { useMemo } from "react";
import { playNote } from "../../audio/pianoAudio";
import {
  noteToKeyPosition,
  buildPianoNotes,
  PIANO_START_MIDI,
  PIANO_END_MIDI,
} from "../../utils/pianoNotes";
import "./Piano.css";

export default function Piano({
  activeNotes = new Set(),
  missedNotes = new Set(),
  onKeyPress,
  micDetectedNote = null,
  freePlay = false,
  startMidi = PIANO_START_MIDI,
  endMidi = PIANO_END_MIDI,
}) {
  const { white: WHITE_KEYS, black: BLACK_KEYS } = useMemo(
    () => buildPianoNotes(startMidi, endMidi),
    [startMidi, endMidi]
  );

  const handlePress = async (note) => {
    if (freePlay) return;

    const scored = await onKeyPress?.(note);
    if (!scored) {
      await playNote(note);
    }
  };

  const renderKey = (note, isBlack) => {
    const pos = noteToKeyPosition(note, WHITE_KEYS);
    if (!pos) return null;

    return (
      <button
        key={note}
        type="button"
        className={[
          "piano-key",
          isBlack ? "black-key" : "white-key",
          activeNotes.has(note) && "active",
          missedNotes.has(note) && "missed",
          micDetectedNote === note && "mic-detected",
        ]
          .filter(Boolean)
          .join(" ")}
        style={{
          left: `${pos.leftPercent}%`,
          width: `${pos.widthPercent}%`,
        }}
        onPointerDown={() => handlePress(note)}
      />
    );
  };

  return (
    <div className="piano-container">
      <div className="piano">
        {WHITE_KEYS.map((note) => renderKey(note, false))}
        {BLACK_KEYS.map((note) => renderKey(note, true))}
      </div>
    </div>
  );
}
