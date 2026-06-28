import { Link, NavLink } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import "./Navbar.css";

export default function Navbar() {
  const { isAuthenticated, user, logout } = useAuth();

  return (
    <nav className="navbar">
      <Link to="/" className="navbar-brand">
        Pianly
      </Link>

      <div className="navbar-links">
        <NavLink to="/" end className={({ isActive }) => (isActive ? "active" : undefined)}>
          Home
        </NavLink>
        {isAuthenticated && (
          <NavLink
            to="/playground"
            className={({ isActive }) => (isActive ? "active" : undefined)}
          >
            Playground
          </NavLink>
        )}
      </div>

      <div className="navbar-auth">
        {isAuthenticated ? (
          <>
            <span className="navbar-user">{user?.email}</span>
            <button type="button" className="navbar-btn" onClick={logout}>
              Logout
            </button>
          </>
        ) : (
          <>
            <NavLink
              to="/login"
              className={({ isActive }) =>
                isActive ? "navbar-btn active" : "navbar-btn"
              }
            >
              Login
            </NavLink>
            <NavLink
              to="/register"
              className={({ isActive }) =>
                isActive ? "navbar-btn navbar-btn-primary active" : "navbar-btn navbar-btn-primary"
              }
            >
              Register
            </NavLink>
          </>
        )}
      </div>
    </nav>
  );
}
