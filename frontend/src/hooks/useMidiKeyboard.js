import { useEffect, useRef, useState } from "react";
import * as Tone from "tone";
import WebMidi from "webmidi";
import { isPianoMidi, midiToNoteName } from "../utils/pianoNotes";

function attachInputListeners(input, onNoteOn, onNoteOff) {
  input.addListener("noteon", "all", onNoteOn);
  input.addListener("noteoff", "all", onNoteOff);
}

function detachInputListeners(input, onNoteOn, onNoteOff) {
  input.removeListener("noteon", "all", onNoteOn);
  input.removeListener("noteoff", "all", onNoteOff);
}

export function useMidiKeyboard(
  onNote,
  enabled,
  { acceptNoteRef = null } = {}
) {
  const [connected, setConnected] = useState(false);
  const [error, setError] = useState(null);
  const [activeNote, setActiveNote] = useState(null);
  const [deviceName, setDeviceName] = useState(null);

  const onNoteRef = useRef(onNote);
  onNoteRef.current = onNote;

  useEffect(() => {
    if (!enabled) {
      setConnected(false);
      setError(null);
      setActiveNote(null);
      setDeviceName(null);
      return;
    }

    let cancelled = false;
    const boundInputs = new Set();

    const handleNoteOn = (event) => {
      const midi = event.note.number;
      if (!isPianoMidi(midi)) return;

      const note = midiToNoteName(midi);
      if (event.velocity === 0) {
        setActiveNote((current) => (current === note ? null : current));
        return;
      }

      setActiveNote(note);

      if (acceptNoteRef?.current && !acceptNoteRef.current(note)) return;
      onNoteRef.current?.(note);
    };

    const handleNoteOff = (event) => {
      const midi = event.note.number;
      if (!isPianoMidi(midi)) return;

      const note = midiToNoteName(midi);
      setActiveNote((current) => (current === note ? null : current));
    };

    const bindInput = (input) => {
      if (boundInputs.has(input.id)) return;
      attachInputListeners(input, handleNoteOn, handleNoteOff);
      boundInputs.add(input.id);
    };

    const handleConnected = (event) => {
      if (event.port.type !== "input") return;
      bindInput(event.port);
      setConnected(true);
      setError(null);
      setDeviceName(WebMidi.inputs.map((input) => input.name).join(", "));
    };

    async function start() {
      try {
        if (!WebMidi.supported) {
          throw new Error("Web MIDI is not supported in this browser");
        }

        await Tone.start();

        await new Promise((resolve, reject) => {
          WebMidi.enable((err) => {
            if (err) reject(err);
            else resolve();
          });
        });

        if (cancelled) {
          WebMidi.disable();
          return;
        }

        WebMidi.inputs.forEach(bindInput);
        WebMidi.addListener("connected", handleConnected);

        if (WebMidi.inputs.length === 0) {
          setConnected(false);
          setDeviceName(null);
          setError("No MIDI keyboard detected — plug one in and try again");
          return;
        }

        setConnected(true);
        setError(null);
        setDeviceName(WebMidi.inputs.map((input) => input.name).join(", "));
      } catch (err) {
        if (!cancelled) {
          setError(err.message || "MIDI access denied");
          setConnected(false);
          setDeviceName(null);
        }
      }
    }

    start();

    return () => {
      cancelled = true;
      WebMidi.removeListener("connected", handleConnected);
      WebMidi.inputs.forEach((input) => {
        if (boundInputs.has(input.id)) {
          detachInputListeners(input, handleNoteOn, handleNoteOff);
        }
      });
      if (WebMidi.enabled) WebMidi.disable();
      setConnected(false);
      setActiveNote(null);
      setDeviceName(null);
    };
  }, [enabled]);

  return { connected, error, activeNote, deviceName };
}
