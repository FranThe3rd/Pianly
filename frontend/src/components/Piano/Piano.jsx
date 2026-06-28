import * as Tone from "tone";
import { playNote } from "../../audio/pianoAudio";
import { noteToKeyPosition, buildPianoNotes } from "../../utils/pianoNotes";
import "./Piano.css";

const { white: WHITE_KEYS, black: BLACK_KEYS } = buildPianoNotes();

export default function Piano({
  activeNotes = new Set(),
  missedNotes = new Set(),
  onKeyPress,
}) {
  const handlePress = async (note) => {
    const scored = await onKeyPress?.(note);

    if (!scored && Tone.getTransport().state !== "started") {
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
        ]
          .filter(Boolean)
          .join(" ")}
        style={{
          left: `${pos.leftPercent}%`,
          width: `${pos.widthPercent}%`,
        }}
        onMouseDown={() => handlePress(note)}
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
