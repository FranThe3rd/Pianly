import { useState } from "react";
import { Link, Navigate, useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import LandingNav from "../../components/LandingNav/LandingNav";
import "../Login/Auth.css";

export default function Register() {
  const { register, isAuthenticated } = useAuth();
  const navigate = useNavigate();

  const [form, setForm] = useState({
    firstname: "",
    lastname: "",
    email: "",
    password: "",
  });
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  if (isAuthenticated) {
    return <Navigate to="/playground" replace />;
  }

  const handleChange = (event) => {
    setForm((prev) => ({ ...prev, [event.target.name]: event.target.value }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError("");
    setSubmitting(true);

    try {
      await register(form);
      navigate("/playground", { replace: true });
    } catch (err) {
      setError(err.message || "Registration failed");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="auth-page">
      <LandingNav />
      <form className="auth-card" onSubmit={handleSubmit}>
        <h1>Register</h1>

        {error && <p className="auth-error">{error}</p>}

        <label>
          First name
          <input
            name="firstname"
            value={form.firstname}
            onChange={handleChange}
            required
            autoComplete="given-name"
          />
        </label>

        <label>
          Last name
          <input
            name="lastname"
            value={form.lastname}
            onChange={handleChange}
            required
            autoComplete="family-name"
          />
        </label>

        <label>
          Email
          <input
            type="email"
            name="email"
            value={form.email}
            onChange={handleChange}
            required
            autoComplete="email"
          />
        </label>

        <label>
          Password
          <input
            type="password"
            name="password"
            value={form.password}
            onChange={handleChange}
            required
            autoComplete="new-password"
          />
        </label>

        <button type="submit" className="auth-submit" disabled={submitting}>
          {submitting ? "Creating account…" : "Register"}
        </button>

        <p className="auth-switch">
          Already have an account? <Link to="/login">Login</Link>
        </p>
      </form>
    </div>
  );
}
