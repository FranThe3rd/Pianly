const NAMES = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"];

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

const BLACK_LEFT = {
  "C#": 0.7,
  "D#": 1.7,
  "F#": 3.7,
  "G#": 4.7,
  "A#": 5.7,
};

export function noteToKeyPosition(noteName, whiteKeys) {
  const isBlack = noteName.includes("#");
  const octave = Number(noteName.slice(-1));
  const name = noteName.slice(0, -1);

  if (isBlack) {
    const anchor = {
      "C#": `C${octave}`,
      "D#": `D${octave}`,
      "F#": `F${octave}`,
      "G#": `G${octave}`,
      "A#": `A${octave}`,
    }[name];

    const whiteIndex = whiteKeys.indexOf(anchor);
    if (whiteIndex === -1) return null;

    const left = ((whiteIndex + (BLACK_LEFT[name] ?? 0.7)) / whiteKeys.length) * 100;
    return { leftPercent: left, widthPercent: 1.4, isBlack: true };
  }

  const whiteIndex = whiteKeys.indexOf(noteName);
  if (whiteIndex === -1) return null;

  const width = 100 / whiteKeys.length;
  return { leftPercent: whiteIndex * width, widthPercent: width, isBlack: false };
}

export function midiToNoteName(midi) {
  const octave = Math.floor(midi / 12) - 1;
  return `${NAMES[midi % 12]}${octave}`;
}
