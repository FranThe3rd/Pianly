import { useCallback, useEffect, useRef, useState } from "react";
import { Midi } from "@tonejs/midi";
import * as Tone from "tone";
import { buildPianoNotes, midiToNoteName, noteToKeyPosition } from "../../utils/pianoNotes";
import "./MidiVisualizer.css";

import midiFile from "../../assets/Songs/Naruto Shippūden OST - Byakuya.mid?url";

const LOOK_AHEAD = 4;
const { white: whiteKeys } = buildPianoNotes();

function collectNotes(midi) {
  const notes = [];
  for (const track of midi.tracks) {
    for (const note of track.notes) {
      notes.push({
        midi: note.midi,
        time: note.time,
        duration: note.duration,
        velocity: note.velocity,
        name: note.name,
      });
    }
  }
  return notes.sort((a, b) => a.time - b.time);
}

export default function MidiVisualizer({ onActiveNotesChange }) {
  const canvasRef = useRef(null);
  const containerRef = useRef(null);
  const samplerRef = useRef(null);
  const notesRef = useRef([]);
  const rafRef = useRef(null);
  const scheduledRef = useRef([]);
  const activeNotesRef = useRef(new Set());

  const [ready, setReady] = useState(false);
  const [playing, setPlaying] = useState(false);
  const [duration, setDuration] = useState(0);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    samplerRef.current = new Tone.Sampler({
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

    let cancelled = false;

    Midi.fromUrl(midiFile).then((midi) => {
      if (cancelled) return;
      notesRef.current = collectNotes(midi);
      setDuration(midi.duration);
      setReady(true);
    });

    return () => {
      cancelled = true;
      samplerRef.current?.dispose();
    };
  }, []);

  const clearScheduled = useCallback(() => {
    for (const id of scheduledRef.current) {
      Tone.getTransport().clear(id);
    }
    scheduledRef.current = [];
  }, []);

  const setActiveNotes = useCallback(
    (next) => {
      activeNotesRef.current = next;
      onActiveNotesChange?.(next);
    },
    [onActiveNotesChange]
  );

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;

    const rect = container.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    const w = rect.width;
    const h = rect.height;

    if (canvas.width !== w * dpr || canvas.height !== h * dpr) {
      canvas.width = w * dpr;
      canvas.height = h * dpr;
      canvas.style.width = `${w}px`;
      canvas.style.height = `${h}px`;
    }

    const ctx = canvas.getContext("2d");
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, w, h);

    const currentTime = Tone.getTransport().seconds;
    const hitLine = h - 4;
    const active = new Set();

    for (const note of notesRef.current) {
      const timeUntil = note.time - currentTime;
      const noteEnd = note.time + note.duration;

      if (timeUntil > LOOK_AHEAD || currentTime > noteEnd + 0.05) continue;

      const pos = noteToKeyPosition(note.name, whiteKeys);
      if (!pos) continue;

      const progress = 1 - timeUntil / LOOK_AHEAD;
      const y = progress * hitLine;
      const noteHeight = Math.max(6, (note.duration / LOOK_AHEAD) * hitLine * 0.35);

      const x = (pos.leftPercent / 100) * w;
      const noteWidth = pos.isBlack ? w * 0.014 : (pos.widthPercent / 100) * w - 2;

      if (currentTime >= note.time && currentTime <= noteEnd) {
        active.add(note.name);
      }

      const alpha = pos.isBlack ? 0.92 : 0.85;
      const hue = 200 + (note.midi % 12) * 12;

      ctx.fillStyle = pos.isBlack
        ? `hsla(${hue}, 75%, 55%, ${alpha})`
        : `hsla(${hue}, 70%, 65%, ${alpha})`;
      ctx.shadowColor = `hsla(${hue}, 80%, 50%, 0.4)`;
      ctx.shadowBlur = 8;
      ctx.beginPath();
      ctx.roundRect(x + 1, y - noteHeight, noteWidth, noteHeight, 3);
      ctx.fill();
      ctx.shadowBlur = 0;
    }

    const prev = activeNotesRef.current;
    const changed =
      active.size !== prev.size ||
      [...active].some((n) => !prev.has(n)) ||
      [...prev].some((n) => !active.has(n));

    if (changed) {
      setActiveNotes(active);
    }

    setProgress(currentTime);

    if (Tone.getTransport().state === "started") {
      rafRef.current = requestAnimationFrame(draw);
    }
  }, [setActiveNotes]);

  const schedulePlayback = useCallback(() => {
    clearScheduled();
    Tone.getTransport().cancel(0);
    Tone.getTransport().seconds = 0;

    for (const note of notesRef.current) {
      const id = Tone.getTransport().schedule((time) => {
        samplerRef.current?.triggerAttackRelease(
          note.name,
          note.duration,
          time,
          note.velocity
        );
      }, note.time);
      scheduledRef.current.push(id);
    }
  }, [clearScheduled]);

  const play = async () => {
    await Tone.start();
    if (!ready) return;

    if (Tone.getTransport().state === "paused") {
      Tone.getTransport().start();
    } else {
      schedulePlayback();
      Tone.getTransport().start();
    }

    setPlaying(true);
    cancelAnimationFrame(rafRef.current);
    rafRef.current = requestAnimationFrame(draw);
  };

  const pause = () => {
    Tone.getTransport().pause();
    setPlaying(false);
    cancelAnimationFrame(rafRef.current);
  };

  const stop = () => {
    Tone.getTransport().stop();
    Tone.getTransport().seconds = 0;
    setPlaying(false);
    setProgress(0);
    setActiveNotes(new Set());
    cancelAnimationFrame(rafRef.current);
    const canvas = canvasRef.current;
    if (canvas) {
      const ctx = canvas.getContext("2d");
      ctx.clearRect(0, 0, canvas.width, canvas.height);
    }
  };

  useEffect(() => {
    const onResize = () => {
      if (Tone.getTransport().state === "started") {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = requestAnimationFrame(draw);
      }
    };
    window.addEventListener("resize", onResize);
    return () => {
      window.removeEventListener("resize", onResize);
      cancelAnimationFrame(rafRef.current);
      clearScheduled();
      Tone.getTransport().stop();
    };
  }, [draw, clearScheduled]);

  const formatTime = (s) => {
    const m = Math.floor(s / 60);
    const sec = Math.floor(s % 60);
    return `${m}:${sec.toString().padStart(2, "0")}`;
  };

  return (
    <div className="midi-visualizer" ref={containerRef}>
      <canvas ref={canvasRef} className="midi-canvas" />

      <div className="midi-hit-line" />

      <div className="midi-controls">
        <button type="button" onClick={play} disabled={!ready || playing}>
          ▶ Play
        </button>
        <button type="button" onClick={pause} disabled={!playing}>
          ⏸ Pause
        </button>
        <button type="button" onClick={stop} disabled={!ready}>
          ⏹ Stop
        </button>
        <span className="midi-time">
          {formatTime(progress)} / {formatTime(duration)}
        </span>
        {!ready && <span className="midi-loading">Loading MIDI…</span>}
      </div>
    </div>
  );
}
