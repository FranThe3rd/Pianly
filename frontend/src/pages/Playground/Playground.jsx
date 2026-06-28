import { useRef, useState } from "react";
import Piano from "../../components/Piano/Piano.jsx";
import MidiVisualizer from "../../components/MidiVisualizer/MidiVisualizer.jsx";

export const Playground = () => {
  const [keyState, setKeyState] = useState({
    active: new Set(),
    missed: new Set(),
  });
  const keyPressRef = useRef(null);

  return (
    <div className="playground-page">
      <MidiVisualizer
        onKeyStateChange={setKeyState}
        onKeyPressRef={keyPressRef}
      />
      <Piano
        activeNotes={keyState.active}
        missedNotes={keyState.missed}
        onKeyPress={(note) => keyPressRef.current?.(note)}
      />
    </div>
  );
};

export default Playground;
