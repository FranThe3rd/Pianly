import { useEffect, useRef, useState } from "react";
import * as Tone from "tone";
import { PitchDetector } from "pitchy";
import { frequencyToNoteName } from "../utils/pianoNotes";

const CLARITY_THRESHOLD = 0.82;
const STABLE_CLARITY_MIN = 0.77;
const STABLE_FRAMES = 4;
const MAX_PITCH_DRIFT = 0.037;
const RMS_FLOOR = 0.0032;

function computeRms(buffer) {
  let sum = 0;
  for (let i = 0; i < buffer.length; i++) {
    sum += buffer[i] * buffer[i];
  }
  return Math.sqrt(sum / buffer.length);
}

function pitchIsStable(recentPitches) {
  if (recentPitches.length < STABLE_FRAMES) return false;
  const avg =
    recentPitches.reduce((total, value) => total + value, 0) /
    recentPitches.length;
  return recentPitches.every(
    (value) => Math.abs(value - avg) / avg <= MAX_PITCH_DRIFT
  );
}

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
        const highpass = ctx.createBiquadFilter();
        highpass.type = "highpass";
        highpass.frequency.value = 71;
        highpass.Q.value = 0.5;

        const analyser = ctx.createAnalyser();
        analyser.fftSize = 2048;
        source.connect(highpass);
        highpass.connect(analyser);

        const buffer = new Float32Array(analyser.fftSize);
        const detector = PitchDetector.forFloat32Array(analyser.fftSize);

        let stableNote = null;
        let stableCount = 0;
        let minStableClarity = 1;
        let recentPitches = [];
        let lastFire = { note: null, time: 0 };

        setListening(true);
        setError(null);

        const tick = () => {
          if (cancelled) return;

          analyser.getFloatTimeDomainData(buffer);
          const rms = computeRms(buffer);

          if (rms < RMS_FLOOR) {
            stableNote = null;
            stableCount = 0;
            minStableClarity = 1;
            recentPitches = [];
            setDetectedNote(null);
            rafId = requestAnimationFrame(tick);
            return;
          }

          const [pitch, clarity] = detector.findPitch(buffer, ctx.sampleRate);

          let note = null;
          if (clarity >= CLARITY_THRESHOLD && pitch > 0) {
            note = frequencyToNoteName(pitch);
          }

          setDetectedNote(note);

          if (note) {
            if (note === stableNote) {
              stableCount += 1;
              minStableClarity = Math.min(minStableClarity, clarity);
              recentPitches.push(pitch);
              if (recentPitches.length > STABLE_FRAMES) recentPitches.shift();
            } else {
              stableNote = note;
              stableCount = 1;
              minStableClarity = clarity;
              recentPitches = [pitch];
            }

            const now = performance.now();
            const cooledDown =
              note !== lastFire.note || now - lastFire.time >= noteCooldownMs;
            const stableEnough =
              stableCount >= STABLE_FRAMES &&
              minStableClarity >= STABLE_CLARITY_MIN &&
              pitchIsStable(recentPitches);

            if (stableEnough && cooledDown) {
              if (acceptNoteRef?.current && !acceptNoteRef.current(note)) {
                stableCount = 0;
                stableNote = null;
                minStableClarity = 1;
                recentPitches = [];
              } else {
                lastFire = { note, time: now };
                stableCount = 0;
                stableNote = null;
                minStableClarity = 1;
                recentPitches = [];
                onNoteRef.current?.(note);
              }
            }
          } else {
            stableNote = null;
            stableCount = 0;
            minStableClarity = 1;
            recentPitches = [];
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
