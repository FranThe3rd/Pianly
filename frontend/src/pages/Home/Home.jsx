import { Link } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import "./Home.css";

const HERO_IMG =
  "https://images.unsplash.com/photo-1520523839897-bd0b52f94555?auto=format&fit=crop&w=1600&q=80";
const LESSON_IMG =
  "https://images.unsplash.com/photo-1552422535-c1852634d417?auto=format&fit=crop&w=900&q=80";
const SONGS_IMG =
  "https://images.unsplash.com/photo-1511379938542-c1f69419868d?auto=format&fit=crop&w=900&q=80";

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
          <h1>Feel the joy of playing the piano</h1>
          <Link to={startLink} className="landing-btn landing-btn-hero">
            Get started
          </Link>
        </div>

        <a href="#about" className="landing-scroll" aria-label="Scroll down">
          ⌄
        </a>
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
              <img src={LESSON_IMG} alt="Person learning piano at home" />
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
            <h2>You&apos;ve got this</h2>
            <p>
              Whatever your level, progress at your own pace with tailored lessons
              and real-time feedback. Gain the skills you need to play the songs you
              love and make your musical dreams come true.
            </p>
            <div className="landing-badges">
              <span className="landing-badge">✦ Editors&apos; Choice</span>
              <span className="landing-badge">✦ Best App</span>
              <span className="landing-badge">✦ #1 Education</span>
              <span className="landing-badge">✦ Learn at home</span>
            </div>
          </div>
        </div>
      </section>

      <section id="progress" className="landing-progress">
        <div className="landing-progress-shape landing-progress-shape-1" aria-hidden="true" />
        <div className="landing-progress-shape landing-progress-shape-2" aria-hidden="true" />

        <div className="landing-progress-inner">
          <div className="landing-progress-text">
            <h2>See your progress in real-time</h2>
            <p>
              Pianly listens to the notes you play — on any piano or keyboard — and
              gives you immediate feedback, so you know if you&apos;re on track or
              need a bit more practice.
            </p>
            <Link to={startLink} className="landing-btn">
              Let&apos;s start
            </Link>
          </div>

          <div className="landing-progress-visual" aria-hidden="true">
            <div className="landing-phone">
              <div className="landing-phone-screen">
                <div className="landing-staff">
                  <span className="landing-clef">𝄞</span>
                  <span className="landing-note landing-note-1" />
                  <span className="landing-note landing-note-2" />
                  <span className="landing-note landing-note-3" />
                </div>
              </div>
              <span className="landing-phone-check">✓</span>
            </div>
            <div className="landing-mini-keys">🎹</div>
          </div>
        </div>
      </section>

      <section id="songs" className="landing-songs">
        <div className="landing-songs-inner">
          <div className="landing-songs-visual">
            <div className="landing-songs-phone">
              <img src={SONGS_IMG} alt="Music and piano practice" />
            </div>
          </div>
          <div className="landing-songs-text">
            <h2>Play music that you love</h2>
            <p>
              Choose from easy, medium, and hard arrangements — from classics like
              Fur Elise to your favorite themes. Pick a song, follow the falling
              notes, and watch your accuracy score grow.
            </p>
            <Link to={startLink} className="landing-btn landing-btn-outline">
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
          <h2>Every musical journey begins with a single note</h2>
          <div className="landing-cta-buttons">
            <Link to={startLink} className="landing-btn">
              Get Pianly
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
