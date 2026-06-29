import { Link, NavLink } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import "./LandingNav.css";

export default function LandingNav() {
  const { isAuthenticated, user, logout } = useAuth();
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
        <NavLink to="/songs">Songs</NavLink>
        <a href="/#start">Get started</a>
        {isAuthenticated && <Link to="/playground">Playground</Link>}
      </nav>

      <div className="landing-nav-actions">
        {isAuthenticated ? (
          <>
            <span className="landing-nav-user">{user?.email}</span>
            <button type="button" className="landing-nav-cta" onClick={logout}>
              Logout
            </button>
          </>
        ) : (
          <Link to={startLink} className="landing-nav-cta">
            Get started
          </Link>
        )}
      </div>
    </header>
  );
}
