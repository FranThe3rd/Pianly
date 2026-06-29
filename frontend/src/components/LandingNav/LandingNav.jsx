import { Link } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import "./LandingNav.css";

export default function LandingNav() {
  const { isAuthenticated } = useAuth();
  const startLink = isAuthenticated ? "/playground" : "/register";

  return (
    <header className="landing-nav">
      <Link to="/" className="landing-logo">
        <span className="landing-logo-star">✦</span>
        Pianly
      </Link>

      <nav className="landing-nav-links">
        <a href="/#progress">Features</a>
        <a href="/#about">About</a>
        <a href="/#songs">Songs</a>
        <a href="/#start">Get started</a>
      </nav>

      <Link to={startLink} className="landing-nav-cta">
        Get started
      </Link>
    </header>
  );
}
