const NAMES = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"];
export const BLACK_KEY_WIDTH_RATIO = 0.6;
const BLACK_ANCHOR = {
  "C#": "C",
  "D#": "D",
  "F#": "F",
  "G#": "G",
  "A#": "A",
};
const BLACK_KEY_OFFSET = 1;
export const PIANO_START_MIDI = 21; // A0
export const PIANO_END_MIDI = 108; // C8

// Below this viewport width we show a reduced keyboard sized to the song
// (like Simply Piano) instead of the full 88 keys. iPads in landscape
// (~1024–1194px) fall below this and get the reduced layout too.
export const FULL_KEYBOARD_MIN_WIDTH = 1280;

export function isPianoMidi(midi) {
  return midi >= PIANO_START_MIDI && midi <= PIANO_END_MIDI;
}

// Pick how many octaves of "breathing room" a small screen should show at
// minimum, so a song that only uses a few notes still renders a comfortable,
// tappable keyboard rather than 3 lonely keys.
function minOctavesForWidth(width) {
  if (width >= 768) return 3; // tablets / small landscape
  if (width >= 480) return 2; // large phones
  return 2; // phones
}

// Compute the visible key range for the current device.
//
// - Desktop (>= FULL_KEYBOARD_MIN_WIDTH): always the full 88-key grand piano.
// - Mobile / tablet: fit the keyboard to the notes the song actually uses,
//   snapped outward to whole octaves (C..B) with a comfortable minimum span.
//   Songs with a wide range still show every key they need (keys just shrink),
//   so nothing ever becomes unplayable.
export function getResponsiveKeyRange(midiValues, viewportWidth) {
  const full = { startMidi: PIANO_START_MIDI, endMidi: PIANO_END_MIDI };

  if (
    viewportWidth >= FULL_KEYBOARD_MIN_WIDTH ||
    !midiValues ||
    midiValues.length === 0
  ) {
    return full;
  }

  let lo = Infinity;
  let hi = -Infinity;
  for (const midi of midiValues) {
    if (midi < lo) lo = midi;
    if (midi > hi) hi = midi;
  }

  lo = Math.max(PIANO_START_MIDI, Math.floor(lo));
  hi = Math.min(PIANO_END_MIDI, Math.ceil(hi));
  if (lo > hi) return full;

  // Snap the low end down to the nearest C and the high end up to the nearest B
  // so the keyboard always begins and ends on a natural octave boundary.
  let startMidi = lo - (((lo % 12) + 12) % 12);
  let endMidi = hi + (11 - (((hi % 12) + 12) % 12));

  // Guarantee a comfortable minimum width on small screens.
  const minSpan = minOctavesForWidth(viewportWidth) * 12;
  let expandLow = true;
  while (endMidi - startMidi + 1 < minSpan) {
    if (expandLow && startMidi - 12 >= PIANO_START_MIDI) {
      startMidi -= 12;
    } else if (endMidi + 12 <= PIANO_END_MIDI) {
      endMidi += 12;
    } else if (startMidi - 12 >= PIANO_START_MIDI) {
      startMidi -= 12;
    } else {
      break;
    }
    expandLow = !expandLow;
  }

  startMidi = Math.max(PIANO_START_MIDI, startMidi);
  endMidi = Math.min(PIANO_END_MIDI, endMidi);

  return { startMidi, endMidi };
}

export function buildPianoNotes(
  startMidi = PIANO_START_MIDI,
  endMidi = PIANO_END_MIDI
) {
  const notes = [];
  for (let midi = startMidi; midi <= endMidi; midi++) {
    notes.push(midiToNoteName(midi));
  }
  return {
    all: notes,
    white: notes.filter((n) => !n.includes("#")),
    black: notes.filter((n) => n.includes("#")),
  };
}
export function noteToKeyPosition(noteName, whiteKeys) {
  const whiteCount = whiteKeys.length;
  const whiteWidth = 100 / whiteCount;
  if (noteName.includes("#")) {
    const octave = Number(noteName.slice(-1));
    const sharp = noteName.slice(0, -1);
    const anchorName = `${BLACK_ANCHOR[sharp]}${octave}`;
    const whiteIndex = whiteKeys.indexOf(anchorName);
    if (whiteIndex === -1) return null;
    const blackWidth = whiteWidth * BLACK_KEY_WIDTH_RATIO;
    return {
      leftPercent:
        (whiteIndex + BLACK_KEY_OFFSET) * whiteWidth - blackWidth / 2,
      widthPercent: blackWidth,
      isBlack: true,
    };
  }
  const whiteIndex = whiteKeys.indexOf(noteName);
  if (whiteIndex === -1) return null;
  return {
    leftPercent: whiteIndex * whiteWidth,
    widthPercent: whiteWidth,
    isBlack: false,
  };
}
export function getKeyRect(noteName, whiteKeys, totalWidth) {
  const pos = noteToKeyPosition(noteName, whiteKeys);
  if (!pos) return null;
  return {
    x: (pos.leftPercent / 100) * totalWidth,
    width: (pos.widthPercent / 100) * totalWidth,
    isBlack: pos.isBlack,
  };
}
export function midiToNoteName(midi) {
  const octave = Math.floor(midi / 12) - 1;
  return `${NAMES[midi % 12]}${octave}`;
}

export function frequencyToNoteName(frequency) {
  if (!frequency || frequency <= 0) return null;
  const midi = Math.round(12 * Math.log2(frequency / 440) + 69);
  if (midi < PIANO_START_MIDI || midi > PIANO_END_MIDI) return null;
  return midiToNoteName(midi);
}

export function midiToFrequency(midi) {
  return 440 * 2 ** ((midi - 69) / 12);
}

export const PIANO_MIN_FREQ = midiToFrequency(PIANO_START_MIDI);
export const PIANO_MAX_FREQ = midiToFrequency(PIANO_END_MIDI);

export function isPianoFrequency(frequency) {
  return frequency >= PIANO_MIN_FREQ && frequency <= PIANO_MAX_FREQ;
}
