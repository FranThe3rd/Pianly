import { useRef, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import Piano from "../../components/Piano/Piano.jsx";
import MidiVisualizer from "../../components/MidiVisualizer/MidiVisualizer.jsx";
import SongSetup from "../../pages/SongSetup/SongSetup.jsx";
import { useMicPitch } from "../../hooks/useMicPitch";
import { useMidiKeyboard } from "../../hooks/useMidiKeyboard";
import { getSavedSelection, saveSelection } from "../../data/songCatalog";
import { PIANO_START_MIDI, PIANO_END_MIDI } from "../../utils/pianoNotes";
import "./Playground.css";

const ECHO_SUPPRESS_MS = 1100;
const ECHO_GLOBAL_MS = 400;

export const Playground = () => {
  const navigate = useNavigate();
  const [selection, setSelection] = useState(() => getSavedSelection());
  const [showSetup, setShowSetup] = useState(() => !getSavedSelection());
  const [keyState, setKeyState] = useState({
    active: new Set(),
    missed: new Set(),
  });
  const [micEnabled, setMicEnabled] = useState(false);
  const [midiEnabled, setMidiEnabled] = useState(false);
  const [freePlay, setFreePlay] = useState(false);
  const [keyRange, setKeyRange] = useState({
    startMidi: PIANO_START_MIDI,
    endMidi: PIANO_END_MIDI,
  });
  const keyPressRef = useRef(null);
  const micSuppressUntilRef = useRef(0);
  const micSuppressNotesRef = useRef(new Map());
  const acceptMicNoteRef = useRef(() => true);

  const handleSongConfirm = useCallback((difficulty, song) => {
    saveSelection(difficulty, song.id);
    setSelection({ difficulty, song });
    setShowSetup(false);
  }, []);

  const suppressMicEcho = useCallback((note) => {
    const now = performance.now();
    micSuppressUntilRef.current = now + ECHO_GLOBAL_MS;
    micSuppressNotesRef.current.set(note, now + ECHO_SUPPRESS_MS);
  }, []);

  const isMicSuppressed = useCallback((note) => {
    const now = performance.now();
    if (now < micSuppressUntilRef.current) return true;

    const until = micSuppressNotesRef.current.get(note);
    if (!until) return false;
    if (now >= until) {
      micSuppressNotesRef.current.delete(note);
      return false;
    }
    return true;
  }, []);

  acceptMicNoteRef.current = (note) => !isMicSuppressed(note);

  const handleMidiNote = useCallback(
    (note) => {
      if (freePlay) return;
      keyPressRef.current?.(note);
    },
    [freePlay]
  );

  const handlePianoNote = useCallback(
    async (note) => {
      if (freePlay) return false;
      return keyPressRef.current?.(note) ?? false;
    },
    [freePlay]
  );

  const { listening, error: micError, detectedNote } = useMicPitch(
    (note) => {
      if (freePlay) return;
      keyPressRef.current?.(note);
    },
    micEnabled && !freePlay,
    {
      noteCooldownMs: 200,
      acceptNoteRef: acceptMicNoteRef,
    }
  );

  const {
    connected: midiConnected,
    error: midiError,
    activeNote: midiActiveNote,
    deviceName: midiDeviceName,
  } = useMidiKeyboard(handleMidiNote, midiEnabled, {
    acceptNoteRef: acceptMicNoteRef,
  });

  const handleKeyStateChange = useCallback((state) => {
    setKeyState(state);
  }, []);

  const handleRangeChange = useCallback((range) => {
    setKeyRange((prev) =>
      prev.startMidi === range.startMidi && prev.endMidi === range.endMidi
        ? prev
        : range
    );
  }, []);

  if (showSetup) {
    return <SongSetup onConfirm={handleSongConfirm} />;
  }

  return (
    <div className="playground-page">
      <MidiVisualizer
        midiUrl={selection?.song.url}
        songName={selection?.song.name}
        onChangeSong={() => navigate("/songs")}
        onKeyStateChange={handleKeyStateChange}
        onRangeChange={handleRangeChange}
        onKeyPressRef={keyPressRef}
        freePlay={freePlay}
        onFreePlayToggle={() => setFreePlay((on) => !on)}
        micEnabled={micEnabled}
        onMicToggle={() => setMicEnabled((enabled) => !enabled)}
        micListening={listening}
        micError={micError}
        micDetectedNote={detectedNote}
        midiEnabled={midiEnabled}
        onMidiToggle={() => setMidiEnabled((enabled) => !enabled)}
        midiConnected={midiConnected}
        midiError={midiError}
        midiActiveNote={midiActiveNote}
        midiDeviceName={midiDeviceName}
      />
      <Piano
        activeNotes={keyState.active}
        missedNotes={keyState.missed}
        freePlay={freePlay}
        startMidi={keyRange.startMidi}
        endMidi={keyRange.endMidi}
        onKeyPress={handlePianoNote}
        micDetectedNote={
          midiEnabled && midiActiveNote
            ? midiActiveNote
            : micEnabled
              ? detectedNote
              : null
        }
      />
    </div>
  );
};

export default Playground;
