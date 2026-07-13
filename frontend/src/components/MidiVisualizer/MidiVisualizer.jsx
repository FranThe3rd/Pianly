import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Midi } from "@tonejs/midi";
import * as Tone from "tone";
import { ensurePiano, playNote } from "../../audio/pianoAudio";
import {
  buildPianoNotes,
  getKeyRect,
  getResponsiveKeyRange,
  FULL_KEYBOARD_MIN_WIDTH,
  PIANO_START_MIDI,
  PIANO_END_MIDI,
} from "../../utils/pianoNotes";
import "./MidiVisualizer.css";

const LOOK_AHEAD = 4;
const HIT_WINDOW_BEFORE = 0.2;
const HIT_WINDOW_AFTER = 0.25;
const MIN_FALL_TIME = 3;
const MIN_PLAYBACK_SPEED = 0.25;
const MAX_PLAYBACK_SPEED = 1;
const DEFAULT_PLAYBACK_SPEED = 1;
const REWIND_MIN_MS = 420;
const REWIND_MAX_MS = 950;
const REWIND_MS_PER_SEC = 220;

function getSongTime(transportSeconds, speed) {
  return transportSeconds * speed;
}

function easeOutCubic(t) {
  return 1 - (1 - t) ** 3;
}

function getRewindDurationMs(fromTime, toTime) {
  const delta = Math.max(0, fromTime - toTime);
  return Math.min(
    REWIND_MAX_MS,
    Math.max(REWIND_MIN_MS, delta * REWIND_MS_PER_SEC)
  );
}

const NOTE_COLOR = {
  white: "hsla(205, 75%, 68%, 0.88)",
  black: "hsla(205, 70%, 42%, 0.92)",
  missed: "rgba(220, 70, 70, 0.85)",
};

const SPARKLE_COUNT = 14;
const SPARKLE_LIFE = 0.55;

// ----- Sheet-music (notation) view -----
const LETTER_STEPS = { C: 0, D: 1, E: 2, F: 3, G: 4, A: 5, B: 6 };
const MIDDLE_C_STEP = 4 * 7; // diatonic step number of C4

const SHEET_INK = "#1d1647";
const SHEET_LINE = "rgba(40, 28, 80, 0.55)";
const SHEET_ACTIVE = "#7b2cff";
const SHEET_MISSED = "#d23b3b";
const SHEET_HIT = "#2fa36b";

// Diatonic (letter-based) staff step for a note name like "C#4" / "Eb5".
function diatonicStep(noteName) {
  const m = /^([A-G])([#b]?)(-?\d+)$/.exec(noteName);
  if (!m) return null;
  return Number(m[3]) * 7 + LETTER_STEPS[m[1]];
}

function sheetMetrics(w, h) {
  const lineGap = Math.min(22, Math.max(12, h / 22));
  const yMiddleC = h / 2;
  const playheadX = Math.max(96, w * 0.16);
  const pxPerSec = (w - playheadX) / LOOK_AHEAD;
  return { lineGap, yMiddleC, playheadX, pxPerSec };
}

// Vertical pixel position for a diatonic step value.
function stepToY(stepFromC4, m) {
  return m.yMiddleC - stepFromC4 * (m.lineGap / 2);
}

function drawLedgerLines(ctx, x, stepFromC4, m) {
  const headW = m.lineGap * 1.5;
  ctx.strokeStyle = SHEET_LINE;
  ctx.lineWidth = 1.4;
  const line = (s) => {
    const y = stepToY(s, m);
    ctx.beginPath();
    ctx.moveTo(x - headW / 2, y);
    ctx.lineTo(x + headW / 2, y);
    ctx.stroke();
  };
  if (stepFromC4 === 0) line(0); // middle C
  for (let s = 12; s <= stepFromC4; s += 2) line(s); // above treble
  for (let s = -12; s >= stepFromC4; s -= 2) line(s); // below bass
}

function drawSheetBackground(ctx, w, h, m) {
  const paperTop = 10;
  const paperBottom = h - 10;
  const paperH = paperBottom - paperTop;

  ctx.save();
  ctx.fillStyle = "rgba(248, 246, 255, 0.98)";
  ctx.beginPath();
  ctx.roundRect(10, paperTop, w - 20, paperH, 14);
  ctx.fill();

  ctx.strokeStyle = SHEET_LINE;
  ctx.lineWidth = 1.4;
  const drawStaff = (steps) => {
    for (const s of steps) {
      const y = stepToY(s, m);
      ctx.beginPath();
      ctx.moveTo(16, y);
      ctx.lineTo(w - 16, y);
      ctx.stroke();
    }
  };
  drawStaff([2, 4, 6, 8, 10]); // treble: E4..F5
  drawStaff([-2, -4, -6, -8, -10]); // bass: A3..G2

  // Left brace + clef glyphs
  ctx.fillStyle = SHEET_INK;
  ctx.font = `${m.lineGap * 6.5}px "Times New Roman", serif`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText("\uD834\uDD1E", 44, stepToY(6, m)); // treble clef on G4 area
  ctx.font = `${m.lineGap * 4.5}px "Times New Roman", serif`;
  ctx.fillText("\uD834\uDD22", 44, stepToY(-6, m)); // bass clef

  // Playhead
  ctx.fillStyle = "rgba(123, 44, 255, 0.16)";
  ctx.fillRect(m.playheadX - 2, paperTop, 4, paperH);
  ctx.fillStyle = "rgba(123, 44, 255, 0.85)";
  ctx.fillRect(m.playheadX - 1, paperTop, 2, paperH);
  ctx.restore();
}

function drawSheetNote(ctx, x, stepFromC4, color, isSharp, m) {
  const y = stepToY(stepFromC4, m);
  const rx = m.lineGap * 0.72;
  const ry = m.lineGap * 0.52;

  drawLedgerLines(ctx, x, stepFromC4, m);

  ctx.save();
  ctx.fillStyle = color;
  ctx.strokeStyle = color;

  // Note head (slightly tilted ellipse)
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(-0.32);
  ctx.beginPath();
  ctx.ellipse(0, 0, rx, ry, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();

  // Stem
  const stemUp = stepFromC4 < 6;
  ctx.lineWidth = 1.8;
  ctx.beginPath();
  if (stemUp) {
    ctx.moveTo(x + rx - 1, y);
    ctx.lineTo(x + rx - 1, y - m.lineGap * 3.2);
  } else {
    ctx.moveTo(x - rx + 1, y);
    ctx.lineTo(x - rx + 1, y + m.lineGap * 3.2);
  }
  ctx.stroke();

  // Accidental
  if (isSharp) {
    ctx.font = `${m.lineGap * 2.2}px "Times New Roman", serif`;
    ctx.textAlign = "right";
    ctx.textBaseline = "middle";
    ctx.fillText("\u266F", x - rx - 2, y);
  }
  ctx.restore();
}

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

function applyStartOffset(notes) {
  if (notes.length === 0) return 0;

  const firstNoteTime = notes[0].time;
  const desiredLeadIn = Math.max(LOOK_AHEAD, MIN_FALL_TIME);
  if (firstNoteTime >= desiredLeadIn) return 0;

  const offset = desiredLeadIn - firstNoteTime;
  for (const note of notes) {
    note.time += offset;
  }
  return offset;
}

export default function MidiVisualizer({
  midiUrl,
  songName,
  onChangeSong,
  onKeyStateChange,
  onKeyPressRef,
  onRangeChange,
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
  const drawRef = useRef(null);
  const scheduledRef = useRef([]);
  const hitIdsRef = useRef(new Set());
  const missedIdsRef = useRef(new Set());
  const pendingMissIdsRef = useRef(new Set());
  const awaitingMissRef = useRef(false);
  const activeNotesRef = useRef(new Set());
  const missedNotesRef = useRef(new Set());
  const sparklesRef = useRef([]);
  const startOffsetRef = useRef(0);
  const countingInRef = useRef(false);
  const sheetModeRef = useRef(false);
  const noPauseModeRef = useRef(false);
  const playbackSpeedRef = useRef(DEFAULT_PLAYBACK_SPEED);
  const rewindingRef = useRef(false);
  const rewindAnimRef = useRef(null);
  const freePlayRef = useRef(freePlay);
  const autoPlayedIdsRef = useRef(new Set());

  freePlayRef.current = freePlay;

  const [keyRange, setKeyRange] = useState({
    startMidi: PIANO_START_MIDI,
    endMidi: PIANO_END_MIDI,
  });

  // whiteKeys must be shared with the on-screen Piano so falling notes line up
  // with the keys. Kept in a ref so `draw` can read the latest range without
  // being re-created on every range change.
  const whiteKeys = useMemo(
    () => buildPianoNotes(keyRange.startMidi, keyRange.endMidi).white,
    [keyRange]
  );
  const whiteKeysRef = useRef(whiteKeys);
  whiteKeysRef.current = whiteKeys;

  const onRangeChangeRef = useRef(onRangeChange);
  onRangeChangeRef.current = onRangeChange;

  // Recompute the visible key range from the loaded song + current viewport.
  const syncKeyRange = useCallback(() => {
    const range = getResponsiveKeyRange(
      notesRef.current.map((n) => n.midi),
      window.innerWidth
    );
    setKeyRange((prev) =>
      prev.startMidi === range.startMidi && prev.endMidi === range.endMidi
        ? prev
        : range
    );
    onRangeChangeRef.current?.(range);
  }, []);

  const [ready, setReady] = useState(false);
  const [loading, setLoading] = useState(false);
  const [playing, setPlaying] = useState(false);
  const [waitingForMiss, setWaitingForMiss] = useState(false);
  const [rewinding, setRewinding] = useState(false);
  const [notesVisible, setNotesVisible] = useState(false);
  const [duration, setDuration] = useState(0);
  const [progress, setProgress] = useState(0);
  const [countingIn, setCountingIn] = useState(false);
  const [sheetMode, setSheetMode] = useState(false);
  const [noPauseMode, setNoPauseMode] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [playbackSpeed, setPlaybackSpeed] = useState(DEFAULT_PLAYBACK_SPEED);
  // Touch devices (phones / iPads) get a persistent controls button instead of
  // the auto-hiding desktop control bar.
  const [isCompact, setIsCompact] = useState(false);
  const settingsRef = useRef(null);

  const toggleSheetMode = useCallback(() => {
    setSheetMode((on) => {
      sheetModeRef.current = !on;
      return !on;
    });
    if (Tone.getTransport().state !== "started") {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = requestAnimationFrame(drawRef.current);
    }
  }, []);

  const toggleNoPauseMode = useCallback(() => {
    setNoPauseMode((on) => {
      noPauseModeRef.current = !on;
      return !on;
    });
    if (Tone.getTransport().state !== "started") {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = requestAnimationFrame(drawRef.current);
    }
  }, []);

  useEffect(() => {
    if (!settingsOpen) return;
    const onPointerDown = (e) => {
      if (settingsRef.current && !settingsRef.current.contains(e.target)) {
        setSettingsOpen(false);
      }
    };
    document.addEventListener("pointerdown", onPointerDown);
    return () => document.removeEventListener("pointerdown", onPointerDown);
  }, [settingsOpen]);

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
    const currentTime = getSongTime(
      Tone.getTransport().seconds,
      playbackSpeedRef.current
    );

    if (sheetModeRef.current) {
      const m = sheetMetrics(width, height);
      const step = diatonicStep(note.name);
      if (step == null) return;
      const centerX = m.playheadX + (note.time - currentTime) * m.pxPerSec;
      const centerY = stepToY(step - MIDDLE_C_STEP, m);
      spawnHitSparkles(sparklesRef.current, {
        centerX,
        centerY,
        width: m.lineGap * 1.5,
        height: m.lineGap,
        isBlack: note.name.includes("#"),
      });
      return;
    }

    const layout = getNoteLayout(
      note,
      currentTime,
      whiteKeysRef.current,
      width,
      height
    );
    if (!layout) return;

    spawnHitSparkles(sparklesRef.current, layout);
  }, []);

  const pauseForMiss = useCallback(
    (missedNotes) => {
      if (missedNotes.length === 0) return;

      missedNotes.sort((a, b) => a.time - b.time || a.id - b.id);
      const rewindTime = missedNotes[0].time;
      const fromTime = getSongTime(
        Tone.getTransport().seconds,
        playbackSpeedRef.current
      );

      Tone.getTransport().pause();
      setPlaying(false);

      for (const note of missedNotes) {
        pendingMissIdsRef.current.add(note.id);
        missedNotesRef.current.add(note.name);
      }

      awaitingMissRef.current = true;
      setWaitingForMiss(true);

      rewindAnimRef.current = {
        fromTime,
        toTime: rewindTime,
        startMs: performance.now(),
        durationMs: getRewindDurationMs(fromTime, rewindTime),
      };
      rewindingRef.current = true;
      setRewinding(true);

      pushKeyState();
      cancelAnimationFrame(rafRef.current);
      rafRef.current = requestAnimationFrame(drawRef.current);
    },
    [pushKeyState]
  );

  const markMissedNoPause = useCallback(
    (missedNotes) => {
      for (const note of missedNotes) {
        missedIdsRef.current.add(note.id);
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
    if (!midiUrl) return;

    let cancelled = false;
    setReady(false);
    setLoading(true);
    setPlaying(false);
    setNotesVisible(false);
    setProgress(0);
    setCountingIn(false);
    countingInRef.current = false;
    startOffsetRef.current = 0;
    playbackSpeedRef.current = DEFAULT_PLAYBACK_SPEED;
    setPlaybackSpeed(DEFAULT_PLAYBACK_SPEED);
    setWaitingForMiss(false);
    setRewinding(false);
    hitIdsRef.current = new Set();
    missedIdsRef.current = new Set();
    pendingMissIdsRef.current = new Set();
    awaitingMissRef.current = false;
    rewindingRef.current = false;
    rewindAnimRef.current = null;
    activeNotesRef.current = new Set();
    missedNotesRef.current = new Set();
    sparklesRef.current = [];
    notesRef.current = [];
    Tone.getTransport().stop();
    Tone.getTransport().seconds = 0;
    for (const id of scheduledRef.current) {
      Tone.getTransport().clear(id);
    }
    scheduledRef.current = [];
    pushKeyState();

    Midi.fromUrl(midiUrl).then((midi) => {
      if (cancelled) return;
      const notes = collectNotes(midi);
      startOffsetRef.current = applyStartOffset(notes);
      notesRef.current = notes;
      syncKeyRange();
      setDuration(midi.duration);
      setReady(true);
      setLoading(false);
    });

    return () => {
      cancelled = true;
    };
  }, [midiUrl, pushKeyState, syncKeyRange]);

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
  }, [clearScheduled]);

  const applyPlaybackSpeed = useCallback(
    async (newSpeed) => {
      const clamped = Math.min(
        MAX_PLAYBACK_SPEED,
        Math.max(MIN_PLAYBACK_SPEED, newSpeed)
      );
      const oldSpeed = playbackSpeedRef.current;
      if (clamped === oldSpeed) return;

      const transport = Tone.getTransport();
      const songTime = getSongTime(transport.seconds, oldSpeed);

      playbackSpeedRef.current = clamped;
      setPlaybackSpeed(clamped);
      transport.seconds = songTime / clamped;

      if (transport.state !== "stopped") {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = requestAnimationFrame(drawRef.current);
      }
    },
    []
  );

  const checkMisses = useCallback(
    (currentTime) => {
      if (freePlayRef.current || awaitingMissRef.current || rewindingRef.current) return;

      const newlyMissed = [];

      for (const note of notesRef.current) {
        if (hitIdsRef.current.has(note.id)) continue;
        if (missedIdsRef.current.has(note.id)) continue;
        if (pendingMissIdsRef.current.has(note.id)) continue;
        if (currentTime <= note.time + HIT_WINDOW_AFTER) continue;
        newlyMissed.push(note);
      }

      if (newlyMissed.length > 0) {
        if (noPauseModeRef.current) {
          markMissedNoPause(newlyMissed);
        } else {
          newlyMissed.sort((a, b) => a.time - b.time || a.id - b.id);
          const t0 = newlyMissed[0].time;
          const CHORD_EPS = 0.03;
          const batch = newlyMissed.filter((n) => n.time - t0 <= CHORD_EPS);
          pauseForMiss(batch);
        }
      }
    },
    [pauseForMiss, markMissedNoPause]
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

    let currentTime;
    const anim = rewindAnimRef.current;
    if (anim) {
      const elapsed = performance.now() - anim.startMs;
      const raw = Math.min(1, elapsed / anim.durationMs);
      const eased = easeOutCubic(raw);
      currentTime = anim.fromTime + (anim.toTime - anim.fromTime) * eased;
      Tone.getTransport().seconds = currentTime / playbackSpeedRef.current;

      if (raw >= 1) {
        currentTime = anim.toTime;
        Tone.getTransport().seconds = anim.toTime / playbackSpeedRef.current;
        rewindAnimRef.current = null;
        rewindingRef.current = false;
        setRewinding(false);
      }
    } else {
      currentTime = getSongTime(
        Tone.getTransport().seconds,
        playbackSpeedRef.current
      );
    }

    if (!rewindingRef.current) {
      checkMisses(currentTime);
    }

    const active = new Set();
    const missedVisible = new Set();

    const isMissed = (note, hit) => {
      if (freePlayRef.current) return false;
      return (
        missedIdsRef.current.has(note.id) ||
        pendingMissIdsRef.current.has(note.id) ||
        (!noPauseModeRef.current &&
          !hit &&
          currentTime > note.time + HIT_WINDOW_AFTER)
      );
    };

    if (sheetModeRef.current) {
      const m = sheetMetrics(w, h);
      drawSheetBackground(ctx, w, h, m);

      for (const note of notesRef.current) {
        const x = m.playheadX + (note.time - currentTime) * m.pxPerSec;
        if (x < 24 || x > w - 12) continue;

        const step = diatonicStep(note.name);
        if (step == null) continue;
        const stepFromC4 = step - MIDDLE_C_STEP;
        const noteEnd = note.time + note.duration;

        const hit = hitIdsRef.current.has(note.id);
        const missed = isMissed(note, hit);

        if (currentTime >= note.time && currentTime <= noteEnd && !missed) {
          if (freePlayRef.current || !hit) active.add(note.name);
        }
        if (missed) missedVisible.add(note.name);

        let color = SHEET_INK;
        if (missed) color = SHEET_MISSED;
        else if (hit) color = SHEET_HIT;
        else if (active.has(note.name)) color = SHEET_ACTIVE;

        drawSheetNote(ctx, x, stepFromC4, color, note.name.includes("#"), m);
      }
    } else {
      for (const note of notesRef.current) {
        const timeUntil = note.time - currentTime;
        const noteEnd = note.time + note.duration;

        if (timeUntil > LOOK_AHEAD || currentTime > noteEnd + 0.05) continue;

        const hit = hitIdsRef.current.has(note.id);
        const missed = isMissed(note, hit);

        if (hit) continue;

        if (currentTime >= note.time && currentTime <= noteEnd && !missed) {
          if (freePlayRef.current || !hit) active.add(note.name);
        }
        if (missed) missedVisible.add(note.name);

        const layout = getNoteLayout(
          note,
          currentTime,
          whiteKeysRef.current,
          w,
          h
        );
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
    }

    if (freePlayRef.current && Tone.getTransport().state === "started") {
      for (const note of notesRef.current) {
        const noteEnd = note.time + note.duration;

        if (autoPlayedIdsRef.current.has(note.id)) {
          if (currentTime >= note.time && currentTime <= noteEnd) {
            active.add(note.name);
          }
          continue;
        }

        if (currentTime >= note.time) {
          autoPlayedIdsRef.current.add(note.id);
          hitIdsRef.current.add(note.id);
          triggerHitSparkle(note);
          void playNote(note.name, note.duration, note.velocity);
          if (currentTime <= noteEnd) active.add(note.name);
        }
      }
    }

    updateSparkles(sparklesRef.current);
    for (const particle of sparklesRef.current) {
      drawSparkle(ctx, particle);
    }

    const prev = activeNotesRef.current;
    const prevMissed = missedNotesRef.current;
    const activeChanged =
      active.size !== prev.size ||
      [...active].some((n) => !prev.has(n)) ||
      [...prev].some((n) => !active.has(n));
    const missedChanged =
      noPauseModeRef.current &&
      (missedVisible.size !== prevMissed.size ||
        [...missedVisible].some((n) => !prevMissed.has(n)) ||
        [...prevMissed].some((n) => !missedVisible.has(n)));

    if (activeChanged || missedChanged) {
      activeNotesRef.current = active;
      if (noPauseModeRef.current && !freePlayRef.current) {
        missedNotesRef.current = missedVisible;
      }
      pushKeyState();
    }

    setProgress(Math.max(0, currentTime - startOffsetRef.current));

    const nextCountingIn =
      Tone.getTransport().state === "started" &&
      startOffsetRef.current > 0 &&
      currentTime < startOffsetRef.current;

    if (nextCountingIn !== countingInRef.current) {
      countingInRef.current = nextCountingIn;
      setCountingIn(nextCountingIn);
    }

    if (
      Tone.getTransport().state === "started" ||
      awaitingMissRef.current ||
      rewindingRef.current ||
      sparklesRef.current.length > 0
    ) {
      rafRef.current = requestAnimationFrame(draw);
    }
  }, [checkMisses, pushKeyState]);

  const handleKeyPress = useCallback(
    async (noteName) => {
      if (freePlayRef.current) return false;

      await Tone.start();

      if (awaitingMissRef.current) {
        const match = notesRef.current.find(
          (n) => n.name === noteName && pendingMissIdsRef.current.has(n.id)
        );
        if (!match) return false;

        // Accept immediately during rewind — snap to the missed note and register hit.
        if (rewindAnimRef.current) {
          const toTime = rewindAnimRef.current.toTime;
          Tone.getTransport().seconds = toTime / playbackSpeedRef.current;
          rewindAnimRef.current = null;
          rewindingRef.current = false;
          setRewinding(false);
        }

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

      const currentTime = getSongTime(
        Tone.getTransport().seconds,
        playbackSpeedRef.current
      );

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
      await playNote(noteName, match.duration, match.velocity);
      return true;
    },
    [draw, pushKeyState, resumeAfterMiss, triggerHitSparkle]
  );

  useEffect(() => {
    if (onKeyPressRef) onKeyPressRef.current = handleKeyPress;
  }, [handleKeyPress, onKeyPressRef]);

  useEffect(() => {
    drawRef.current = draw;
  }, [draw]);

  const play = async () => {
    if (!ready) return;

    if (isCompact) setSettingsOpen(false);
    setLoading(true);
    try {
      await ensurePiano();

      if (Tone.getTransport().state !== "started") {
        const isFreshStart = Tone.getTransport().state !== "paused";
        if (isFreshStart) {
          await schedulePlayback();
          Tone.getTransport().seconds = 0;
          hitIdsRef.current = new Set();
          missedIdsRef.current = new Set();
          pendingMissIdsRef.current = new Set();
          awaitingMissRef.current = false;
          rewindingRef.current = false;
          rewindAnimRef.current = null;
          setWaitingForMiss(false);
          setRewinding(false);
          activeNotesRef.current = new Set();
          missedNotesRef.current = new Set();
          sparklesRef.current = [];
          autoPlayedIdsRef.current = new Set();
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
    setCountingIn(false);
    countingInRef.current = false;
    setNotesVisible(false);
    hitIdsRef.current = new Set();
    missedIdsRef.current = new Set();
    pendingMissIdsRef.current = new Set();
    awaitingMissRef.current = false;
    rewindingRef.current = false;
    rewindAnimRef.current = null;
    setWaitingForMiss(false);
    setRewinding(false);
    activeNotesRef.current = new Set();
    missedNotesRef.current = new Set();
    sparklesRef.current = [];
    autoPlayedIdsRef.current = new Set();
    pushKeyState();
    cancelAnimationFrame(rafRef.current);
    const canvas = canvasRef.current;
    if (canvas) {
      const ctx = canvas.getContext("2d");
      ctx.clearRect(0, 0, canvas.width, canvas.height);
    }
  };

  useEffect(() => {
    if (!ready) return;

    if (freePlay) {
      stop();
      void play();
    } else {
      stop();
    }
  }, [freePlay, ready]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    const onResize = () => {
      syncKeyRange();
      if (
        Tone.getTransport().state === "started" ||
        awaitingMissRef.current ||
        rewindingRef.current
      ) {
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
  }, [draw, clearScheduled, syncKeyRange]);

  // When the visible range changes while paused, redraw once so the falling
  // notes reposition to match the new keyboard width.
  useEffect(() => {
    if (Tone.getTransport().state !== "started") {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = requestAnimationFrame(drawRef.current);
    }
  }, [keyRange]);

  // Detect touch-sized viewports (phones / iPads) so we can swap the
  // auto-hiding desktop control bar for a persistent controls button.
  useEffect(() => {
    const mq = window.matchMedia(
      `(max-width: ${FULL_KEYBOARD_MIN_WIDTH - 1}px)`
    );
    const update = () => setIsCompact(mq.matches);
    update();
    mq.addEventListener("change", update);
    return () => mq.removeEventListener("change", update);
  }, []);

  const formatTime = (s) => {
    const m = Math.floor(s / 60);
    const sec = Math.floor(s % 60);
    return `${m}:${sec.toString().padStart(2, "0")}`;
  };

  const hasCustomSettings =
    freePlay ||
    noPauseMode ||
    sheetMode ||
    micEnabled ||
    midiEnabled ||
    playbackSpeed !== DEFAULT_PLAYBACK_SPEED;

  return (
    <div className="midi-visualizer" ref={containerRef}>
      <motion.div
        className="midi-stage"
        initial={false}
        animate={{ opacity: notesVisible ? 1 : 0 }}
        transition={{ duration: 0.55, ease: "easeOut" }}
      >
        <canvas ref={canvasRef} className="midi-canvas" />
        {!sheetMode && <div className="midi-hit-line" />}
      </motion.div>

      <motion.div
        key={midiUrl ?? "controls"}
        className={
          isCompact
            ? "midi-controls-anchor compact"
            : "midi-controls-anchor"
        }
        ref={settingsRef}
        initial={{ opacity: 0, y: -14 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.55, delay: 0.12, ease: [0.22, 1, 0.36, 1] }}
      >
        {isCompact && (
          <button
            type="button"
            className={
              settingsOpen
                ? "midi-fab open"
                : hasCustomSettings
                  ? "midi-fab has-active"
                  : "midi-fab"
            }
            onClick={() => setSettingsOpen((open) => !open)}
            aria-expanded={settingsOpen}
            aria-label="Controls"
            title="Controls"
          >
            {settingsOpen ? "✕" : "⚙"}
          </button>
        )}
        <div
          className={[
            "midi-controls",
            isCompact && "compact",
            isCompact && settingsOpen && "open",
            !isCompact && (playing || waitingForMiss) && "dimmed",
          ]
            .filter(Boolean)
            .join(" ")}
        >
          <div className="midi-controls-row midi-controls-primary">
            {songName && (
              <span className="midi-song-name" title={songName}>
                {songName}
              </span>
            )}
            <div className="midi-transport">
              <button
                type="button"
                onClick={play}
                disabled={!ready || playing || loading || waitingForMiss}
              >
                ▶ Play
              </button>
              <button
                type="button"
                onClick={pause}
                disabled={!playing || waitingForMiss}
              >
                ⏸ Pause
              </button>
              <button type="button" onClick={stop} disabled={!ready}>
                ⏹ Stop
              </button>
            </div>
            <span className="midi-time">
              {formatTime(progress)} / {formatTime(duration)}
            </span>
            {!ready && <span className="midi-loading">Loading…</span>}
            {loading && <span className="midi-loading">Samples…</span>}
            {!isCompact && (
              <button
                type="button"
                className={
                  settingsOpen
                    ? "midi-settings-btn active"
                    : hasCustomSettings
                      ? "midi-settings-btn has-active"
                      : "midi-settings-btn"
                }
                onClick={() => setSettingsOpen((open) => !open)}
                aria-expanded={settingsOpen}
                aria-label="Settings"
                title="Settings"
              >
                ⚙ Settings
              </button>
            )}
          </div>

          <AnimatePresence>
            {settingsOpen && (
              <motion.div
                key="settings-panel"
                className="midi-settings-panel"
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.22, ease: "easeOut" }}
              >
                <div className="midi-settings-grid">
                  <div className="midi-settings-group">
                    <span className="midi-settings-label">Song</span>
                    {onChangeSong && (
                      <button
                        type="button"
                        className="midi-change-song-btn"
                        onClick={onChangeSong}
                      >
                        Change song
                      </button>
                    )}
                  </div>

                  <div className="midi-settings-group">
                    <span className="midi-settings-label">Practice</span>
                    <div className="midi-settings-toggles">
                      <button
                        type="button"
                        className={freePlay ? "midi-mode-btn active" : "midi-mode-btn"}
                        onClick={onFreePlayToggle}
                      >
                        Free Play
                      </button>
                      <button
                        type="button"
                        className={noPauseMode ? "midi-mode-btn active" : "midi-mode-btn"}
                        onClick={toggleNoPauseMode}
                        disabled={freePlay || waitingForMiss}
                        title="Keep playing when you miss notes"
                      >
                        No Pause
                      </button>
                    </div>
                    <label className="midi-speed" title="Playback speed">
                      <span className="midi-speed-label">Speed</span>
                      <input
                        type="range"
                        className="midi-speed-slider"
                        min={MIN_PLAYBACK_SPEED}
                        max={MAX_PLAYBACK_SPEED}
                        step={0.05}
                        value={playbackSpeed}
                        disabled={!ready}
                        onChange={(e) => applyPlaybackSpeed(Number(e.target.value))}
                      />
                      <span className="midi-speed-value">
                        {Math.round(playbackSpeed * 100)}%
                      </span>
                    </label>
                  </div>

                  <div className="midi-settings-group">
                    <span className="midi-settings-label">Display</span>
                    <button
                      type="button"
                      className={sheetMode ? "midi-view-btn active" : "midi-view-btn"}
                      onClick={toggleSheetMode}
                      title="Switch between falling notes and sheet music"
                    >
                      {sheetMode ? "🎼 Sheet music" : "🎵 Falling notes"}
                    </button>
                  </div>

                  <div className="midi-settings-group">
                    <span className="midi-settings-label">Input</span>
                    <div className="midi-settings-toggles">
                      <button
                        type="button"
                        className={micEnabled ? "midi-mic-btn active" : "midi-mic-btn"}
                        onClick={onMicToggle}
                        disabled={freePlay}
                        title="Detect notes from microphone"
                      >
                        🎤 Mic
                      </button>
                      <button
                        type="button"
                        className={midiEnabled ? "midi-keyboard-btn active" : "midi-keyboard-btn"}
                        onClick={onMidiToggle}
                        disabled={freePlay}
                        title="Use a MIDI keyboard"
                      >
                        🎹 Keyboard
                      </button>
                    </div>
                    {!freePlay && (
                      <>
                        {micEnabled && (
                          <span className="midi-mic-status">
                            <span className="midi-mic-status-label">Listening</span>
                            <span className="midi-mic-status-note">
                              {micListening ? (micDetectedNote ?? "…") : "…"}
                            </span>
                          </span>
                        )}
                        {midiEnabled && midiConnected && (
                          <span className="midi-keyboard-status">
                            <span className="midi-keyboard-status-label">{midiDeviceName}</span>
                            {midiActiveNote && (
                              <span className="midi-keyboard-status-note">{midiActiveNote}</span>
                            )}
                          </span>
                        )}
                        {micError && <span className="midi-mic-error">{micError}</span>}
                        {midiEnabled && midiError && (
                          <span className="midi-mic-error">{midiError}</span>
                        )}
                      </>
                    )}
                  </div>
                </div>

                {(freePlay || (noPauseMode && !freePlay)) && (
                  <p className="midi-settings-hint">
                    {freePlay
                      ? "Free Play — watch the notes fall and listen along; no input needed"
                      : "No Pause — missed notes turn red, playback keeps going"}
                  </p>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <div className="midi-hints">
          <AnimatePresence>
          {countingIn && (
            <motion.p
              key="count-in"
              className="midi-count-in-hint"
              initial={{ opacity: 0, y: -6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.25, ease: "easeOut" }}
            >
              Get ready — watch the notes fall
            </motion.p>
          )}
          {rewinding && (
            <motion.p
              key="rewind-hint"
              className="midi-count-in-hint"
              initial={{ opacity: 0, y: -6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.25, ease: "easeOut" }}
            >
              Going back to missed note…
            </motion.p>
          )}
          {waitingForMiss && !rewinding && (
            <motion.p
              key="miss-hint"
              className="midi-miss-hint"
              initial={{ opacity: 0, y: -6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.25, ease: "easeOut" }}
            >
              Rewound — play the red note at the playhead to continue
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
      </motion.div>
    </div>
  );
}
