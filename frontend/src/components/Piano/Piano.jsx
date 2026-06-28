import * as Tone from "tone";
import { playNote } from "../../audio/pianoAudio";
import { noteToKeyPosition, buildPianoNotes } from "../../utils/pianoNotes";
import "./Piano.css";

export default function Piano({
  activeNotes = new Set(),
  missedNotes = new Set(),
  onKeyPress,
}) {
  const { white: whiteKeys, black: blackKeys } = buildPianoNotes();

  const handlePress = async (note) => {
    const scored = await onKeyPress?.(note);

    if (!scored && Tone.getTransport().state !== "started") {
      await playNote(note);
    }
  };

  return (
    <div className="piano-container">
      <div className="piano-frame">
        <div className="piano">
          {whiteKeys.map((note) => (
            <button
              key={note}
              type="button"
              className={[
                "white-key",
                activeNotes.has(note) && "active",
                missedNotes.has(note) && "missed",
              ]
                .filter(Boolean)
                .join(" ")}
              onMouseDown={() => handlePress(note)}
            />
          ))}

          {blackKeys.map((note) => {
            const pos = noteToKeyPosition(note, whiteKeys);
            if (!pos) return null;

            return (
              <button
                key={note}
                type="button"
                className={[
                  "black-key",
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
          })}
        </div>
      </div>
    </div>
  );
}
