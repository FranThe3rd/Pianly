import { Link } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import ScrollLink from "../../components/ScrollLink/ScrollLink";
import {
  AnimatedEnter,
  AnimatedWords,
} from "../../components/AnimatedEnter/AnimatedEnter";
import home1Img from "../../assets/home-1.jpg";
import home2Img from "../../assets/home-2.jpg";
import "./Home.css";

const HERO_IMG =
  "https://images.unsplash.com/photo-1520523839897-bd0b52f94555?auto=format&fit=crop&w=1600&q=80";

function PianoIcon({ className = "" }) {
  return (
    <div className={`piano-icon ${className}`} aria-hidden="true">
      <span className="piano-icon-star">✦</span>
      <span className="piano-icon-keys">🎹</span>
    </div>
  );
}

export default function Home() {
  const { isAuthenticated } = useAuth();
  const startLink = isAuthenticated ? "/playground" : "/register";

  return (
    <div className="landing">
      <section className="landing-hero">
        <div
          className="landing-hero-bg"
          style={{ backgroundImage: `url(${HERO_IMG})` }}
        />
        <div className="landing-hero-overlay" />

        <div className="landing-hero-content">
          <PianoIcon className="piano-icon-lg" />
          <p className="landing-hero-brand">
            <span className="landing-logo-star">✦</span> Pianly
          </p>
          <AnimatedWords
            className="landing-hero-title"
            as="h1"
            text="Practice piano by playing real songs"
            baseDelay={0.15}
          />
          <AnimatedEnter delay={0.85} y={18}>
            <Link to={startLink} className="landing-btn landing-btn-hero">
              Start playing
            </Link>
          </AnimatedEnter>
        </div>

        <ScrollLink to="#about" className="landing-scroll" aria-label="Scroll down">
          ⌄
        </ScrollLink>
      </section>

      <section id="about" className="landing-youve-got-this">
        <div className="landing-wave landing-wave-top" aria-hidden="true">
          <svg viewBox="0 0 1440 120" preserveAspectRatio="none">
            <path
              d="M0,60 C360,120 720,0 1080,60 C1260,90 1380,30 1440,60 L1440,120 L0,120 Z"
              fill="var(--purple-bright)"
            />
          </svg>
        </div>

        <div className="landing-youve-inner">
          <div className="landing-youve-image-wrap">
            <div className="landing-youve-blob">
              <img src={home1Img} alt="Grand piano in a bright studio space" />
            </div>
            <svg className="landing-teal-line" viewBox="0 0 400 400" aria-hidden="true">
              <path
                d="M20,40 Q120,80 200,120 T380,200 Q300,280 200,320 T40,360"
                fill="none"
                stroke="var(--teal)"
                strokeWidth="3"
              />
            </svg>
          </div>

          <div className="landing-youve-text">
            <h2>Built for everyday practice</h2>
            <p>
              Open a song, follow the falling notes, and play at your own speed.
              Pianly is a focused practice tool — not a full course — so you spend
              less time in menus and more time at the keys.
            </p>
            <div className="landing-badges">
              <span className="landing-badge">✦ Falling note guides</span>
              <span className="landing-badge">✦ Live mic feedback</span>
              <span className="landing-badge">✦ Easy to hard levels</span>
              <span className="landing-badge">✦ Any keyboard works</span>
            </div>
          </div>
        </div>
      </section>

      <section id="progress" className="landing-progress">
        <div className="landing-progress-shape landing-progress-shape-1" aria-hidden="true" />
        <div className="landing-progress-shape landing-progress-shape-2" aria-hidden="true" />

        <div className="landing-progress-inner">
          <div className="landing-progress-text">
            <h2>Hear what you&apos;re playing</h2>
            <p>
              Your microphone picks up each note you hit. Pianly marks hits and
              misses on the spot, so you can correct mistakes before they turn
              into habits.
            </p>
            <Link to={startLink} className="landing-btn">
              Open playground
            </Link>
          </div>

          <div className="landing-progress-visual">
            <div className="landing-progress-photo">
              <img src={home2Img} alt="Close-up of piano keys" />
            </div>
          </div>
        </div>
      </section>

      <section id="songs" className="landing-songs">
        <div className="landing-songs-inner landing-songs-inner--text">
          <div className="landing-songs-text">
            <h2>Songs from first notes to full pieces</h2>
            <p>
              Start with simple tunes like Hot Cross Buns, move into Clementi, and
              work up to harder repertoire when you&apos;re ready. Each track shows
              the notes on screen while you play along.
            </p>
            <Link to="/songs" className="landing-btn landing-btn-outline">
              Browse songs
            </Link>
          </div>
        </div>
      </section>

      <section id="start" className="landing-cta">
        <div className="landing-cta-blob landing-cta-blob-left" aria-hidden="true" />
        <div className="landing-cta-blob landing-cta-blob-right" aria-hidden="true" />
        <div className="landing-cta-blob landing-cta-blob-bottom" aria-hidden="true" />
        <svg className="landing-cta-line" viewBox="0 0 800 200" aria-hidden="true">
          <path
            d="M0,100 Q200,20 400,100 T800,100"
            fill="none"
            stroke="#1a1a2e"
            strokeWidth="2"
          />
        </svg>

        <div className="landing-cta-inner">
          <PianoIcon className="piano-icon-lg" />
          <h2>Your keyboard is already enough</h2>
          <div className="landing-cta-buttons">
            <Link to={startLink} className="landing-btn">
              Start practicing
            </Link>
            <Link to="/register" className="landing-btn landing-btn-secondary">
              Create free account
            </Link>
          </div>
        </div>
      </section>

      <footer className="landing-footer">
        <Link to="/" className="landing-footer-brand">
          ✦ Pianly
        </Link>
        <div className="landing-footer-links">
          <Link to="/login">Login</Link>
          <Link to={startLink}>Playground</Link>
        </div>
        <p className="landing-footer-copy">© {new Date().getFullYear()} Pianly</p>
      </footer>
    </div>
  );
}
