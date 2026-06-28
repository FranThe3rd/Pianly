import { useEffect, useRef } from "react";
import * as Tone from "tone";
import { buildPianoNotes } from "../../utils/pianoNotes";
import "./Piano.css";

export default function Piano({ activeNotes = new Set() }) {
  const sampler = useRef(null);
  const { white: whiteKeys, black: blackKeys } = buildPianoNotes();

  useEffect(() => {
    sampler.current = new Tone.Sampler({
      urls: {
        A0: "A0.mp3",
        C1: "C1.mp3",
        "D#1": "Ds1.mp3",
        "F#1": "Fs1.mp3",
        A1: "A1.mp3",
        C2: "C2.mp3",
        "D#2": "Ds2.mp3",
        "F#2": "Fs2.mp3",
        A2: "A2.mp3",
        C3: "C3.mp3",
        "D#3": "Ds3.mp3",
        "F#3": "Fs3.mp3",
        A3: "A3.mp3",
        C4: "C4.mp3",
        "D#4": "Ds4.mp3",
        "F#4": "Fs4.mp3",
        A4: "A4.mp3",
        C5: "C5.mp3",
        "D#5": "Ds5.mp3",
        "F#5": "Fs5.mp3",
        A5: "A5.mp3",
        C6: "C6.mp3",
        "D#6": "Ds6.mp3",
        "F#6": "Fs6.mp3",
        A6: "A6.mp3",
        C7: "C7.mp3",
        "D#7": "Ds7.mp3",
        "F#7": "Fs7.mp3",
        A7: "A7.mp3",
        C8: "C8.mp3",
      },
      baseUrl: "https://tonejs.github.io/audio/salamander/",
    }).toDestination();

    return () => sampler.current?.dispose();
  }, []);

  const play = async (note) => {
    await Tone.start();
    sampler.current?.triggerAttackRelease(note, "8n");
  };

  return (
    <div className="piano-container">
      <div className="piano-lid" />
      <div className="piano">
        {whiteKeys.map((note) => (
          <button
            key={note}
            className={`white-key${activeNotes.has(note) ? " active" : ""}`}
            onMouseDown={() => play(note)}
          />
        ))}

        {blackKeys.map((note) => {
          const noteName = note.slice(0, -1);
          const octave = Number(note.slice(-1));

          const whiteIndex = whiteKeys.findIndex(
            (n) =>
              n ===
              {
                "C#": `C${octave}`,
                "D#": `D${octave}`,
                "F#": `F${octave}`,
                "G#": `G${octave}`,
                "A#": `A${octave}`,
              }[noteName]
          );

          return (
            <button
              key={note}
              className={`black-key${activeNotes.has(note) ? " active" : ""}`}
              style={{
                left: `${((whiteIndex + 0.7) / whiteKeys.length) * 100}%`,
              }}
              onMouseDown={() => play(note)}
            />
          );
        })}
      </div>
      <div className="piano-fallboard" />
      <div className="piano-bottom" />
    </div>
  );
}
