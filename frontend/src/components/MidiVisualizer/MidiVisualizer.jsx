import { useCallback, useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
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
  missed: "rgba(220, 70, 70, 0.85)",
};

const SPARKLE_COUNT = 14;
const SPARKLE_LIFE = 0.55;

function getNoteLayout(note, currentTime, whiteKeys, width, height) {
  const hitLine = height - 2;
  const timeUntil = note.time - currentTime;
  const progress = 1 - timeUntil / LOOK_AHEAD;
  const y = progress * hitLine;
  const noteHeight = Math.max(8, (note.duration / LOOK_AHEAD) * hitLine * 0.4);
  const keyRect = getKeyRect(note.name, whiteKeys, width);
  if (!keyRect) return null;

  return {
    keyRect,
    x: keyRect.x,
    y: y - noteHeight,
    width: keyRect.width,
    height: noteHeight,
    centerX: keyRect.x + keyRect.width / 2,
    centerY: y - noteHeight / 2,
    isBlack: keyRect.isBlack,
  };
}

function spawnHitSparkles(sparkles, layout) {
  const baseColor = layout.isBlack ? "hsl(205, 75%, 55%)" : "hsl(205, 80%, 78%)";

  for (let i = 0; i < SPARKLE_COUNT; i++) {
    const angle = (Math.PI * 2 * i) / SPARKLE_COUNT + Math.random() * 0.6;
    const speed = 1.8 + Math.random() * 3.5;

    sparkles.push({
      x: layout.centerX + (Math.random() - 0.5) * layout.width * 0.6,
      y: layout.centerY + (Math.random() - 0.5) * layout.height * 0.4,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed - 1.2,
      life: 1,
      decay: 1 / (SPARKLE_LIFE * 60),
      size: 2 + Math.random() * 3.5,
      rotation: Math.random() * Math.PI,
      spin: (Math.random() - 0.5) * 0.18,
      color: baseColor,
    });
  }
}

function drawSparkle(ctx, particle) {
  const { x, y, size, life, rotation, color } = particle;
  const s = size * life;

  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(rotation);
  ctx.globalAlpha = life * 0.95;
  ctx.fillStyle = "#fff";
  ctx.shadowColor = color;
  ctx.shadowBlur = 10 * life;
  ctx.fillRect(-s * 0.55, -s * 0.12, s * 1.1, s * 0.24);
  ctx.fillRect(-s * 0.12, -s * 0.55, s * 0.24, s * 1.1);
  ctx.restore();
}

function updateSparkles(sparkles) {
  for (let i = sparkles.length - 1; i >= 0; i--) {
    const p = sparkles[i];
    p.x += p.vx;
    p.y += p.vy;
    p.vy += 0.07;
    p.vx *= 0.98;
    p.rotation += p.spin;
    p.life -= p.decay;
    if (p.life <= 0) sparkles.splice(i, 1);
  }
}

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

export default function MidiVisualizer({
  onKeyStateChange,
  onKeyPressRef,
  freePlay = false,
  onFreePlayToggle,
  micEnabled = false,
  onMicToggle,
  micListening = false,
  micError = null,
  micDetectedNote = null,
  midiEnabled = false,
  onMidiToggle,
  midiConnected = false,
  midiError = null,
  midiActiveNote = null,
  midiDeviceName = null,
}) {
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
  const sparklesRef = useRef([]);

  const [ready, setReady] = useState(false);
  const [loading, setLoading] = useState(false);
  const [playing, setPlaying] = useState(false);
  const [waitingForMiss, setWaitingForMiss] = useState(false);
  const [notesVisible, setNotesVisible] = useState(false);
  const [duration, setDuration] = useState(0);
  const [progress, setProgress] = useState(0);

  const pushKeyState = useCallback(() => {
    onKeyStateChange?.({
      active: new Set(activeNotesRef.current),
      missed: new Set(missedNotesRef.current),
    });
  }, [onKeyStateChange]);

  const triggerHitSparkle = useCallback((note) => {
    const container = containerRef.current;
    if (!container) return;

    const { width, height } = container.getBoundingClientRect();
    const currentTime = Tone.getTransport().seconds;
    const layout = getNoteLayout(note, currentTime, whiteKeys, width, height);
    if (!layout) return;

    spawnHitSparkles(sparklesRef.current, layout);
  }, []);

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

    const active = new Set();

    for (const note of notesRef.current) {
      const timeUntil = note.time - currentTime;
      const noteEnd = note.time + note.duration;

      if (timeUntil > LOOK_AHEAD || currentTime > noteEnd + 0.05) continue;

      const hit = hitIdsRef.current.has(note.id);
      const missed =
        pendingMissIdsRef.current.has(note.id) ||
        (!hit && currentTime > note.time + HIT_WINDOW_AFTER);

      if (hit) continue;

      if (currentTime >= note.time && currentTime <= noteEnd && !missed) {
        active.add(note.name);
      }

      const layout = getNoteLayout(note, currentTime, whiteKeys, w, h);
      if (!layout) continue;

      if (missed) {
        ctx.fillStyle = NOTE_COLOR.missed;
      } else {
        ctx.fillStyle = layout.isBlack ? NOTE_COLOR.black : NOTE_COLOR.white;
      }

      ctx.beginPath();
      ctx.roundRect(layout.x, layout.y, layout.width, layout.height, 2);
      ctx.fill();
    }

    updateSparkles(sparklesRef.current);
    for (const particle of sparklesRef.current) {
      drawSparkle(ctx, particle);
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

    if (Tone.getTransport().state === "started" || awaitingMissRef.current || sparklesRef.current.length > 0) {
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
        triggerHitSparkle(match);
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
      triggerHitSparkle(match);
      return true;
    },
    [draw, pushKeyState, resumeAfterMiss, triggerHitSparkle]
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
        const isFreshStart = Tone.getTransport().state !== "paused";
        if (isFreshStart) {
          await schedulePlayback();
          Tone.getTransport().seconds = 0;
          hitIdsRef.current = new Set();
          pendingMissIdsRef.current = new Set();
          awaitingMissRef.current = false;
          setWaitingForMiss(false);
          activeNotesRef.current = new Set();
          missedNotesRef.current = new Set();
          sparklesRef.current = [];
          pushKeyState();
          setNotesVisible(true);
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
    setNotesVisible(false);
    hitIdsRef.current = new Set();
    pendingMissIdsRef.current = new Set();
    awaitingMissRef.current = false;
    setWaitingForMiss(false);
    activeNotesRef.current = new Set();
    missedNotesRef.current = new Set();
    sparklesRef.current = [];
    pushKeyState();
    cancelAnimationFrame(rafRef.current);
    const canvas = canvasRef.current;
    if (canvas) {
      const ctx = canvas.getContext("2d");
      ctx.clearRect(0, 0, canvas.width, canvas.height);
    }
  };

  useEffect(() => {
    if (freePlay) stop();
  }, [freePlay]); // eslint-disable-line react-hooks/exhaustive-deps

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
      <motion.div
        className="midi-stage"
        initial={false}
        animate={{ opacity: notesVisible ? 1 : 0 }}
        transition={{ duration: 0.55, ease: "easeOut" }}
      >
        <canvas ref={canvasRef} className="midi-canvas" />
        <div className="midi-hit-line" />
      </motion.div>

      <div className="midi-controls-anchor">
        <div className="midi-controls">
          <div className="midi-controls-row">
          <button
            type="button"
            className={freePlay ? "midi-mode-btn active" : "midi-mode-btn"}
            onClick={onFreePlayToggle}
          >
            Free Play
          </button>
          <button
            type="button"
            onClick={play}
            disabled={freePlay || !ready || playing || loading || waitingForMiss}
          >
            ▶ Play
          </button>
          <button
            type="button"
            onClick={pause}
            disabled={freePlay || !playing || waitingForMiss}
          >
            ⏸ Pause
          </button>
          <button type="button" onClick={stop} disabled={freePlay || !ready}>
            ⏹ Stop
          </button>
          <button
            type="button"
            className={micEnabled ? "midi-mic-btn active" : "midi-mic-btn"}
            onClick={onMicToggle}
            title="Use microphone to detect piano notes"
          >
            🎤 Mic
          </button>
          <button
            type="button"
            className={midiEnabled ? "midi-keyboard-btn active" : "midi-keyboard-btn"}
            onClick={onMidiToggle}
            title="Use a MIDI keyboard as input"
          >
            🎹 MIDI
          </button>
          <span className="midi-time">
            {formatTime(progress)} / {formatTime(duration)}
          </span>
          {!ready && <span className="midi-loading">Loading MIDI…</span>}
          {loading && <span className="midi-loading">Loading samples…</span>}
          <AnimatePresence>
            {micEnabled && (
              <motion.div
                key="mic-status"
                className="midi-mic-status-wrap"
                initial={{ opacity: 0, maxWidth: 0 }}
                animate={{ opacity: 1, maxWidth: 110 }}
                exit={{ opacity: 0, maxWidth: 0 }}
                transition={{ duration: 0.35, ease: "easeOut" }}
              >
                <span className="midi-mic-status">
                  <span className="midi-mic-status-label">Listening</span>
                  <span className="midi-mic-status-note">
                    {micListening ? (micDetectedNote ?? "…") : "…"}
                  </span>
                </span>
              </motion.div>
            )}
          </AnimatePresence>
          {midiEnabled && midiConnected && (
            <span className="midi-keyboard-status">
              <span className="midi-keyboard-status-label">{midiDeviceName}</span>
              {midiActiveNote && (
                <span className="midi-keyboard-status-note">{midiActiveNote}</span>
              )}
            </span>
          )}
          {micError && <span className="midi-mic-error">{micError}</span>}
          {freePlay && (
            <span className="midi-freeplay-hint">Play any key — no timing required</span>
          )}
        </div>

        <AnimatePresence>
          {waitingForMiss && (
            <motion.p
              key="miss-hint"
              className="midi-miss-hint"
              initial={{ opacity: 0, y: -6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.25, ease: "easeOut" }}
            >
              Play the highlighted key to continue
            </motion.p>
          )}
          {midiEnabled && midiError && (
            <motion.p
              key="midi-error"
              className="midi-device-error"
              initial={{ opacity: 0, y: -6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.35, ease: "easeOut" }}
            >
              {midiError}
            </motion.p>
          )}
        </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
