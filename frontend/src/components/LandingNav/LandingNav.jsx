import { Link, NavLink } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { useSubscription } from "../../context/SubscriptionContext";
import ScrollLink from "../ScrollLink/ScrollLink";
import "./LandingNav.css";

export default function LandingNav() {
  const { isAuthenticated, user, logout } = useAuth();
  const { pro } = useSubscription();

  return (
    <header className="landing-nav">
      <Link to="/" className="landing-logo">
        <span className="landing-logo-star">✦</span>
        Pianly
      </Link>

      <nav className="landing-nav-links">
        <ScrollLink to="#progress">Features</ScrollLink>
        <ScrollLink to="#about">About</ScrollLink>
        <NavLink to="/songs">Songs</NavLink>
        <NavLink to="/pricing">Pricing</NavLink>
        <ScrollLink to="#start">Get started</ScrollLink>
        {isAuthenticated && <Link to="/playground">Playground</Link>}
      </nav>

      <div className="landing-nav-actions">
        {isAuthenticated ? (
          <>
            {pro ? (
              <span className="landing-nav-pro">PRO</span>
            ) : (
              <Link to="/pricing" className="landing-nav-upgrade">
                Upgrade
              </Link>
            )}
            <span className="landing-nav-user">{user?.email}</span>
            <button type="button" className="landing-nav-cta" onClick={logout}>
              Logout
            </button>
          </>
        ) : (
          <ScrollLink to="#start" className="landing-nav-cta">
            Get started
          </ScrollLink>
        )}
      </div>
    </header>
  );
}
