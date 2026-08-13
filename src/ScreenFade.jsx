import { useCallback, useRef, useState } from "react";
import { ScreenFadeContext } from "./ScreenFadeContext";
import "./ScreenFade.css";

// "full" is for real view changes (occasional — a touch more perceptible).
// "light" is for advancing within a session (next question, sidebar
// filters), which happens far more often, so it stays quick and faint.
const VARIANTS = {
  full: { total: 320, peak: 160 },
  light: { total: 180, peak: 90 },
};

const REDUCED_MOTION_QUERY = "(prefers-reduced-motion: reduce)";

// A brief dip through the void color, timed so the actual content swap
// (the `callback`) lands at the fade's darkest point — that dip masks the
// instant swap instead of letting it read as a jump-cut.
export function ScreenFadeProvider({ children }) {
  const [fade, setFade] = useState(null); // { key, variant }
  const keyRef = useRef(0);

  const trigger = useCallback((variant, callback) => {
    const config = VARIANTS[variant] || VARIANTS.light;
    const reduceMotion = window.matchMedia && window.matchMedia(REDUCED_MOTION_QUERY).matches;

    if (reduceMotion) {
      callback();
      return;
    }

    const key = ++keyRef.current;
    setFade({ key, variant });

    // Never cancel a previous fade's pending callback — a rapid re-trigger
    // should still let every queued state change land, just under an
    // extended/overlapping fade.
    setTimeout(callback, config.peak);
    setTimeout(() => {
      setFade((current) => (current && current.key === key ? null : current));
    }, config.total);
  }, []);

  return (
    <ScreenFadeContext.Provider value={trigger}>
      {children}
      {fade && <div key={fade.key} className={`screen-fade screen-fade-${fade.variant}`} aria-hidden="true"></div>}
    </ScreenFadeContext.Provider>
  );
}
