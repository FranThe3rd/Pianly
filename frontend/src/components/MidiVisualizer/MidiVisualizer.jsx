import { useCallback, useEffect, useRef, useState } from "react";
import { Midi } from "@tonejs/midi";
import * as Tone from "tone";
import { ensurePiano, playNote, scheduleNote } from "../../audio/pianoAudio";
import { buildPianoNotes, getKeyRect } from "../../utils/pianoNotes";
import "./MidiVisualizer.css";

import midiFile from "../../assets/Songs/Naruto Shippūden OST - Byakuya.mid?url";

const LOOK_AHEAD = 4;
const HIT_WINDOW_BEFORE = 0.2;
const HIT_WINDOW_AFTER = 0.25;

const NOTE_COLOR = {
  white: "hsla(205, 75%, 68%, 0.88)",
  black: "hsla(205, 70%, 42%, 0.92)",
  whiteHit: "hsla(205, 55%, 58%, 0.4)",
  blackHit: "hsla(205, 50%, 38%, 0.45)",
  missed: "rgba(220, 70, 70, 0.85)",
};

const { white: whiteKeys } = buildPianoNotes();

function collectNotes(midi) {
  const notes = [];
  for (const track of midi.tracks) {
    for (const note of track.notes) {
      notes.push({
        id: notes.length,
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

export default function MidiVisualizer({ onKeyStateChange, onKeyPressRef }) {
  const canvasRef = useRef(null);
  const containerRef = useRef(null);
  const notesRef = useRef([]);
  const rafRef = useRef(null);
  const scheduledRef = useRef([]);
  const hitIdsRef = useRef(new Set());
  const pendingMissIdsRef = useRef(new Set());
  const awaitingMissRef = useRef(false);
  const activeNotesRef = useRef(new Set());
  const missedNotesRef = useRef(new Set());

  const [ready, setReady] = useState(false);
  const [loading, setLoading] = useState(false);
  const [playing, setPlaying] = useState(false);
  const [waitingForMiss, setWaitingForMiss] = useState(false);
  const [duration, setDuration] = useState(0);
  const [progress, setProgress] = useState(0);

  const pushKeyState = useCallback(() => {
    onKeyStateChange?.({
      active: new Set(activeNotesRef.current),
      missed: new Set(missedNotesRef.current),
    });
  }, [onKeyStateChange]);

  const pauseForMiss = useCallback(
    (missedNotes) => {
      Tone.getTransport().pause();
      awaitingMissRef.current = true;
      setWaitingForMiss(true);
      setPlaying(false);

      for (const note of missedNotes) {
        pendingMissIdsRef.current.add(note.id);
        missedNotesRef.current.add(note.name);
      }

      pushKeyState();
    },
    [pushKeyState]
  );

  const resumeAfterMiss = useCallback(() => {
    awaitingMissRef.current = false;
    setWaitingForMiss(false);
    Tone.getTransport().start();
    setPlaying(true);
  }, []);

  useEffect(() => {
    let cancelled = false;

    Midi.fromUrl(midiFile).then((midi) => {
      if (cancelled) return;
      notesRef.current = collectNotes(midi);
      setDuration(midi.duration);
      setReady(true);
    });

    return () => {
      cancelled = true;
    };
  }, []);

  const clearScheduled = useCallback(() => {
    for (const id of scheduledRef.current) {
      Tone.getTransport().clear(id);
    }
    scheduledRef.current = [];
  }, []);

  const schedulePlayback = useCallback(async () => {
    clearScheduled();
    Tone.getTransport().cancel(0);
    await ensurePiano();

    for (const note of notesRef.current) {
      const id = Tone.getTransport().schedule((time) => {
        scheduleNote(note.name, time, note.duration, note.velocity);
      }, note.time);
      scheduledRef.current.push(id);
    }
  }, [clearScheduled]);

  const checkMisses = useCallback(
    (currentTime) => {
      if (awaitingMissRef.current) return;

      const newlyMissed = [];

      for (const note of notesRef.current) {
        if (hitIdsRef.current.has(note.id)) continue;
        if (pendingMissIdsRef.current.has(note.id)) continue;
        if (currentTime <= note.time + HIT_WINDOW_AFTER) continue;
        newlyMissed.push(note);
      }

      if (newlyMissed.length > 0) {
        pauseForMiss(newlyMissed);
      }
    },
    [pauseForMiss]
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
    checkMisses(currentTime);

    const hitLine = h - 2;
    const active = new Set();

    for (const note of notesRef.current) {
      const timeUntil = note.time - currentTime;
      const noteEnd = note.time + note.duration;

      if (timeUntil > LOOK_AHEAD || currentTime > noteEnd + 0.05) continue;

      const keyRect = getKeyRect(note.name, whiteKeys, w);
      if (!keyRect) continue;

      const progress = 1 - timeUntil / LOOK_AHEAD;
      const y = progress * hitLine;
      const noteHeight = Math.max(8, (note.duration / LOOK_AHEAD) * hitLine * 0.4);

      const hit = hitIdsRef.current.has(note.id);
      const missed =
        pendingMissIdsRef.current.has(note.id) ||
        (!hit && currentTime > note.time + HIT_WINDOW_AFTER);

      if (currentTime >= note.time && currentTime <= noteEnd && !missed) {
        active.add(note.name);
      }

      if (missed) {
        ctx.fillStyle = NOTE_COLOR.missed;
      } else if (hit) {
        ctx.fillStyle = keyRect.isBlack ? NOTE_COLOR.blackHit : NOTE_COLOR.whiteHit;
      } else {
        ctx.fillStyle = keyRect.isBlack ? NOTE_COLOR.black : NOTE_COLOR.white;
      }

      ctx.beginPath();
      ctx.roundRect(keyRect.x, y - noteHeight, keyRect.width, noteHeight, 2);
      ctx.fill();
    }

    const prev = activeNotesRef.current;
    const changed =
      active.size !== prev.size ||
      [...active].some((n) => !prev.has(n)) ||
      [...prev].some((n) => !active.has(n));

    if (changed) {
      activeNotesRef.current = active;
      pushKeyState();
    }

    setProgress(currentTime);

    if (Tone.getTransport().state === "started" || awaitingMissRef.current) {
      rafRef.current = requestAnimationFrame(draw);
    }
  }, [checkMisses, pushKeyState]);

  const handleKeyPress = useCallback(
    async (noteName) => {
      await Tone.start();

      if (awaitingMissRef.current) {
        const match = notesRef.current.find(
          (n) => n.name === noteName && pendingMissIdsRef.current.has(n.id)
        );
        if (!match) return false;

        hitIdsRef.current.add(match.id);
        pendingMissIdsRef.current.delete(match.id);

        const stillPending = notesRef.current.some(
          (n) => n.name === noteName && pendingMissIdsRef.current.has(n.id)
        );
        if (!stillPending) {
          missedNotesRef.current.delete(noteName);
        }

        await playNote(noteName);
        pushKeyState();

        if (pendingMissIdsRef.current.size === 0) {
          resumeAfterMiss();
          cancelAnimationFrame(rafRef.current);
          rafRef.current = requestAnimationFrame(draw);
        }

        return true;
      }

      if (Tone.getTransport().state !== "started") return false;

      const currentTime = Tone.getTransport().seconds;

      const match = notesRef.current.find(
        (n) =>
          n.name === noteName &&
          !hitIdsRef.current.has(n.id) &&
          currentTime >= n.time - HIT_WINDOW_BEFORE &&
          currentTime <= n.time + HIT_WINDOW_AFTER
      );

      if (!match) return false;

      hitIdsRef.current.add(match.id);
      return true;
    },
    [draw, pushKeyState, resumeAfterMiss]
  );

  useEffect(() => {
    if (onKeyPressRef) onKeyPressRef.current = handleKeyPress;
  }, [handleKeyPress, onKeyPressRef]);

  const play = async () => {
    if (!ready) return;

    setLoading(true);
    try {
      await ensurePiano();

      if (Tone.getTransport().state !== "started") {
        if (Tone.getTransport().state !== "paused") {
          await schedulePlayback();
          Tone.getTransport().seconds = 0;
          hitIdsRef.current = new Set();
          pendingMissIdsRef.current = new Set();
          awaitingMissRef.current = false;
          setWaitingForMiss(false);
          activeNotesRef.current = new Set();
          missedNotesRef.current = new Set();
          pushKeyState();
        }
        Tone.getTransport().start();
      }

      setPlaying(true);
      cancelAnimationFrame(rafRef.current);
      rafRef.current = requestAnimationFrame(draw);
    } finally {
      setLoading(false);
    }
  };

  const pause = () => {
    Tone.getTransport().pause();
    setPlaying(false);
    cancelAnimationFrame(rafRef.current);
  };

  const stop = () => {
    Tone.getTransport().stop();
    Tone.getTransport().seconds = 0;
    clearScheduled();
    setPlaying(false);
    setProgress(0);
    hitIdsRef.current = new Set();
    pendingMissIdsRef.current = new Set();
    awaitingMissRef.current = false;
    setWaitingForMiss(false);
    activeNotesRef.current = new Set();
    missedNotesRef.current = new Set();
    pushKeyState();
    cancelAnimationFrame(rafRef.current);
    const canvas = canvasRef.current;
    if (canvas) {
      const ctx = canvas.getContext("2d");
      ctx.clearRect(0, 0, canvas.width, canvas.height);
    }
  };

  useEffect(() => {
    const onResize = () => {
      if (Tone.getTransport().state === "started" || awaitingMissRef.current) {
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
        <button
          type="button"
          onClick={play}
          disabled={!ready || playing || loading || waitingForMiss}
        >
          ▶ Play
        </button>
        <button type="button" onClick={pause} disabled={!playing || waitingForMiss}>
          ⏸ Pause
        </button>
        <button type="button" onClick={stop} disabled={!ready}>
          ⏹ Stop
        </button>
        <span className="midi-time">
          {formatTime(progress)} / {formatTime(duration)}
        </span>
        {!ready && <span className="midi-loading">Loading MIDI…</span>}
        {loading && <span className="midi-loading">Loading samples…</span>}
        {waitingForMiss && (
          <span className="midi-loading">Play the highlighted key to continue</span>
        )}
      </div>
    </div>
  );
}
