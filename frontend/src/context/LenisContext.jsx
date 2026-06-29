import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
} from "react";
import { useLocation, useNavigate } from "react-router-dom";
import Lenis from "lenis";

const LenisContext = createContext(null);

function getNavOffset() {
  const value = getComputedStyle(document.documentElement).getPropertyValue(
    "--navbar-height"
  );
  return parseInt(value, 10) || 64;
}

export function LenisProvider({ children }) {
  const lenisRef = useRef(null);
  const pendingHashRef = useRef(null);
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    const lenis = new Lenis({
      duration: 1.15,
      smoothWheel: true,
    });

    lenisRef.current = lenis;

    let rafId = 0;
    const raf = (time) => {
      lenis.raf(time);
      rafId = requestAnimationFrame(raf);
    };
    rafId = requestAnimationFrame(raf);

    return () => {
      cancelAnimationFrame(rafId);
      lenis.destroy();
      lenisRef.current = null;
    };
  }, []);

  const scrollToHash = useCallback((hash, { immediate = false } = {}) => {
    const id = hash.replace(/^#/, "");
    if (!id) return false;

    const target = document.getElementById(id);
    if (!target) return false;

    const lenis = lenisRef.current;
    const offset = -getNavOffset();

    if (lenis) {
      lenis.scrollTo(target, { offset, immediate });
    } else {
      const top =
        target.getBoundingClientRect().top + window.scrollY + offset;
      window.scrollTo({ top, behavior: immediate ? "auto" : "smooth" });
    }

    return true;
  }, []);

  const scrollToSection = useCallback(
    (hash, options = {}) => {
      const id = hash.replace(/^#/, "");
      if (!id) return;

      if (location.pathname !== "/") {
        pendingHashRef.current = id;
        navigate(`/#${id}`);
        return;
      }

      if (!scrollToHash(`#${id}`, options)) {
        pendingHashRef.current = id;
      }
    },
    [location.pathname, navigate, scrollToHash]
  );

  useEffect(() => {
    const hash = pendingHashRef.current || location.hash.replace(/^#/, "");
    if (!hash || location.pathname !== "/") return;

    pendingHashRef.current = null;

    let attempts = 0;
    const tryScroll = () => {
      if (scrollToHash(`#${hash}`)) return;
      if (attempts < 24) {
        attempts += 1;
        requestAnimationFrame(tryScroll);
      }
    };

    requestAnimationFrame(tryScroll);
  }, [location.pathname, location.hash, scrollToHash]);

  return (
    <LenisContext.Provider value={{ scrollToSection }}>
      {children}
    </LenisContext.Provider>
  );
}

export function useLenisScroll() {
  const context = useContext(LenisContext);
  if (!context) {
    throw new Error("useLenisScroll must be used within LenisProvider");
  }
  return context;
}
