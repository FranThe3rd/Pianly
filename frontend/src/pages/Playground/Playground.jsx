import { useState } from "react";
import Piano from "../../components/Piano/Piano.jsx";
import MidiVisualizer from "../../components/MidiVisualizer/MidiVisualizer.jsx";

export const Playground = () => {
  const [activeNotes, setActiveNotes] = useState(new Set());

  return (
    <div className="playground-page">
      <MidiVisualizer onActiveNotesChange={setActiveNotes} />
      <Piano activeNotes={activeNotes} />
    </div>
  );
};

export default Playground;
