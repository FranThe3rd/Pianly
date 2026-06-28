const NAMES = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"];

export const BLACK_KEY_WIDTH_RATIO = 0.6;

const BLACK_ANCHOR = {
  "C#": "C",
  "D#": "D",
  "F#": "F",
  "G#": "G",
  "A#": "A",
};

export function buildPianoNotes(startOctave = 1, endOctave = 7) {
  const notes = [];
  for (let octave = startOctave; octave <= endOctave; octave++) {
    for (const name of NAMES) {
      notes.push(`${name}${octave}`);
    }
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
    const gapCenter = (whiteIndex + 1) * whiteWidth - whiteWidth * 0.5;

    return {
      leftPercent: gapCenter - blackWidth / 2,
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
