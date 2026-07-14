import { useEffect, useState } from "react";

// Phones in portrait — the playground is designed for landscape.
const MOBILE_PORTRAIT_QUERY = "(max-width: 900px) and (orientation: portrait)";

export function useMobilePortrait() {
  const [isPortrait, setIsPortrait] = useState(() =>
    typeof window !== "undefined"
      ? window.matchMedia(MOBILE_PORTRAIT_QUERY).matches
      : false
  );

  useEffect(() => {
    const mq = window.matchMedia(MOBILE_PORTRAIT_QUERY);
    const update = () => setIsPortrait(mq.matches);
    update();
    mq.addEventListener("change", update);
    return () => mq.removeEventListener("change", update);
  }, []);

  return isPortrait;
}
