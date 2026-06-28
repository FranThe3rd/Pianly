import { useRef, useState, useCallback } from "react";
import * as Tone from "tone";
import Piano from "../../components/Piano/Piano.jsx";
import MidiVisualizer from "../../components/MidiVisualizer/MidiVisualizer.jsx";
import SongSetup from "../../pages/SongSetup/SongSetup.jsx";
import { useMicPitch } from "../../hooks/useMicPitch";
import { useMidiKeyboard } from "../../hooks/useMidiKeyboard";
import { playNote } from "../../audio/pianoAudio";
import { getSavedSelection, saveSelection } from "../../data/songCatalog";

const ECHO_SUPPRESS_MS = 1100;
const ECHO_GLOBAL_MS = 400;

export const Playground = () => {
  const [selection, setSelection] = useState(() => getSavedSelection());
  const [showSetup, setShowSetup] = useState(() => !getSavedSelection());
  const [keyState, setKeyState] = useState({
    active: new Set(),
    missed: new Set(),
  });
  const [micEnabled, setMicEnabled] = useState(false);
  const [midiEnabled, setMidiEnabled] = useState(false);
  const [freePlay, setFreePlay] = useState(false);
  const keyPressRef = useRef(null);
  const flashTimerRef = useRef(null);
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

  const flashKey = useCallback((note) => {
    if (flashTimerRef.current) clearTimeout(flashTimerRef.current);
    setKeyState({ active: new Set([note]), missed: new Set() });
    flashTimerRef.current = setTimeout(() => {
      setKeyState({ active: new Set(), missed: new Set() });
    }, 180);
  }, []);

  const playFreeNote = useCallback(
    async (note) => {
      await Tone.start();
      await playNote(note);
      suppressMicEcho(note);
      flashKey(note);
    },
    [suppressMicEcho, flashKey]
  );

  const handleMicNote = useCallback(
    (note) => {
      if (isMicSuppressed(note)) return;
      playFreeNote(note);
    },
    [isMicSuppressed, playFreeNote]
  );

  const handleMidiNote = useCallback(
    (note) => {
      if (freePlay) {
        playFreeNote(note);
        return;
      }
      keyPressRef.current?.(note);
    },
    [freePlay, playFreeNote]
  );

  const handlePianoNote = useCallback(
    async (note) => {
      if (freePlay) {
        await playFreeNote(note);
        return true;
      }
      return keyPressRef.current?.(note) ?? false;
    },
    [freePlay, playFreeNote]
  );

  const { listening, error: micError, detectedNote } = useMicPitch(
    freePlay ? handleMicNote : (note) => keyPressRef.current?.(note),
    micEnabled,
    {
      noteCooldownMs: freePlay ? 250 : 200,
      acceptNoteRef: acceptMicNoteRef,
      freePlay,
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

  const handleKeyStateChange = useCallback(
    (state) => {
      if (!freePlay) setKeyState(state);
    },
    [freePlay]
  );

  if (showSetup) {
    return <SongSetup onConfirm={handleSongConfirm} />;
  }

  return (
    <div className="playground-page">
      <MidiVisualizer
        midiUrl={selection?.song.url}
        songName={selection?.song.name}
        onChangeSong={() => setShowSetup(true)}
        onKeyStateChange={handleKeyStateChange}
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
