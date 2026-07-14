import { useEffect } from "react";
import { useMobilePortrait } from "../../hooks/useMobilePortrait";
import "./LandscapeGate.css";

export default function LandscapeGate({ children }) {
  const isPortrait = useMobilePortrait();

  // Best-effort lock — works on some Android browsers / installed PWAs.
  useEffect(() => {
    const orientation = screen.orientation;
    if (!orientation?.lock) return;

    orientation.lock("landscape").catch(() => {});

    return () => {
      orientation.unlock?.();
    };
  }, []);

  if (isPortrait) {
    return (
      <div className="landscape-gate">
        <div className="landscape-gate-card">
          <div className="landscape-gate-icon" aria-hidden="true">
            📱
          </div>
          <h2>Rotate your device</h2>
          <p>
            Pianly works best in landscape on mobile. Turn your phone sideways to
            continue.
          </p>
        </div>
      </div>
    );
  }

  return children;
}
