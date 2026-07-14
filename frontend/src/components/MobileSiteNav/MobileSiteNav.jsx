import { Link, NavLink } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { useSubscription } from "../../context/SubscriptionContext";
import ScrollLink from "../ScrollLink/ScrollLink";
import "./MobileSiteNav.css";

export default function MobileSiteNav({ onNavigate }) {
  const { isAuthenticated, logout } = useAuth();
  const { pro } = useSubscription();

  const close = () => onNavigate?.();

  const handleLogout = () => {
    close();
    logout();
  };

  return (
    <nav className="mobile-site-nav" aria-label="Site navigation">
      <span className="mobile-site-nav-label">Website</span>

      <div className="mobile-site-nav-links">
        <Link to="/" className="mobile-site-nav-link" onClick={close}>
          Home
        </Link>
        <ScrollLink to="#progress" className="mobile-site-nav-link" onClick={close}>
          Features
        </ScrollLink>
        <ScrollLink to="#about" className="mobile-site-nav-link" onClick={close}>
          About
        </ScrollLink>
        <NavLink to="/songs" className="mobile-site-nav-link" onClick={close}>
          Songs
        </NavLink>
        <NavLink to="/pricing" className="mobile-site-nav-link" onClick={close}>
          Pricing
        </NavLink>
        {isAuthenticated && (
          <NavLink to="/playground" className="mobile-site-nav-link" onClick={close}>
            Playground
          </NavLink>
        )}
      </div>

      <div className="mobile-site-nav-actions">
        {isAuthenticated ? (
          <>
            {pro ? (
              <span className="mobile-site-nav-pro">PRO</span>
            ) : (
              <Link to="/pricing" className="mobile-site-nav-upgrade" onClick={close}>
                Upgrade
              </Link>
            )}
            <button type="button" className="mobile-site-nav-btn" onClick={handleLogout}>
              Logout
            </button>
          </>
        ) : (
          <>
            <Link to="/login" className="mobile-site-nav-btn" onClick={close}>
              Login
            </Link>
            <Link to="/register" className="mobile-site-nav-btn mobile-site-nav-btn-primary" onClick={close}>
              Register
            </Link>
          </>
        )}
      </div>
    </nav>
  );
}
