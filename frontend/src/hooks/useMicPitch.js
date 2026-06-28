import { useEffect, useRef, useState } from "react";
import * as Tone from "tone";
import { PitchDetector } from "pitchy";
import { frequencyToNoteName } from "../utils/pianoNotes";

const CLARITY_THRESHOLD = 0.72;
const STABLE_FRAMES = 3;

export function useMicPitch(
  onNote,
  enabled,
  { noteCooldownMs = 200, acceptNoteRef = null, freePlay = false } = {}
) {
  const [listening, setListening] = useState(false);
  const [error, setError] = useState(null);
  const [detectedNote, setDetectedNote] = useState(null);

  const onNoteRef = useRef(onNote);
  onNoteRef.current = onNote;

  useEffect(() => {
    if (!enabled) {
      setListening(false);
      setError(null);
      setDetectedNote(null);
      return;
    }

    let cancelled = false;
    let rafId = null;
    let stream = null;

    async function start() {
      try {
        await Tone.start();

        stream = await navigator.mediaDevices.getUserMedia({
          audio: {
            echoCancellation: freePlay,
            noiseSuppression: false,
            autoGainControl: false,
          },
        });

        if (cancelled) {
          stream.getTracks().forEach((track) => track.stop());
          return;
        }

        const ctx = Tone.getContext().rawContext;
        const source = ctx.createMediaStreamSource(stream);
        const analyser = ctx.createAnalyser();
        analyser.fftSize = 2048;
        source.connect(analyser);

        const buffer = new Float32Array(analyser.fftSize);
        const detector = PitchDetector.forFloat32Array(analyser.fftSize);

        let stableNote = null;
        let stableCount = 0;
        let lastFire = { note: null, time: 0 };

        setListening(true);
        setError(null);

        const tick = () => {
          if (cancelled) return;

          analyser.getFloatTimeDomainData(buffer);
          const [pitch, clarity] = detector.findPitch(buffer, ctx.sampleRate);

          let note = null;
          if (clarity >= CLARITY_THRESHOLD && pitch > 0) {
            note = frequencyToNoteName(pitch);
          }

          setDetectedNote(note);

          if (note) {
            stableCount = note === stableNote ? stableCount + 1 : 1;
            stableNote = note;

            const now = performance.now();
            const cooledDown =
              note !== lastFire.note || now - lastFire.time >= noteCooldownMs;
            const stableEnough = stableCount >= STABLE_FRAMES;

            if (stableEnough && cooledDown) {
              if (acceptNoteRef?.current && !acceptNoteRef.current(note)) {
                stableCount = 0;
                stableNote = null;
              } else {
                lastFire = { note, time: now };
                stableCount = 0;
                stableNote = null;
                onNoteRef.current?.(note);
              }
            }
          } else {
            stableNote = null;
            stableCount = 0;
          }

          rafId = requestAnimationFrame(tick);
        };

        rafId = requestAnimationFrame(tick);
      } catch (err) {
        if (!cancelled) {
          setError(err.message || "Microphone access denied");
          setListening(false);
        }
      }
    }

    start();

    return () => {
      cancelled = true;
      cancelAnimationFrame(rafId);
      stream?.getTracks().forEach((track) => track.stop());
      setListening(false);
      setDetectedNote(null);
    };
  }, [enabled, noteCooldownMs, freePlay]);

  return { listening, error, detectedNote };
}
