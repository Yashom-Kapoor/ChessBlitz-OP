import { useState } from "react";
import { useNavigate } from "react-router-dom";
import chessblitzLogo from "../assets/ChessBlitz.png";
import "../styles/Landing.css";

export default function Login({ onLogin }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();

    setError("");
    if (!email) {
      setError("Please enter your email.");
      return;
    }
    if (!password || password.length < 6) {
      setError("Password must be at least 6 characters.");
      return;
    }

    setLoading(true);

    try {
      const apiUrl = (import.meta.env.VITE_API_URL || "http://localhost:5000").replace(/\/$/, "");
      const response = await fetch(`${apiUrl}/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || "Login failed");
        setLoading(false);
        return;
      }

      try {
        const teacher = data.teacher || {};
        const uid = teacher.id ?? teacher.uid ?? teacher.teacher_uid;
        const stored = { ...teacher, uid };
        localStorage.setItem("teacher", JSON.stringify(stored));
        if (onLogin) onLogin(stored);
      } catch (err) {
        console.error("Error storing teacher data:", err);
      }

      navigate("/classrooms");
    } catch (err) {
      setError("Failed to connect to server. Make sure backend is reachable.");
      setLoading(false);
    }
  };

  return (
    <div className="landing-page">
      <img src={chessblitzLogo} alt="ChessBlitz" className="landing-image" />

      <div className="landing-content">
        <h1 className="landing-title">ChessBlitz</h1>
        <p className="tagline">
          Welcome to ChessBlitz for Teachers.<br />
          Manage classrooms. Track student progress.
        </p>

        <form className="auth-form" onSubmit={handleSubmit}>
          <input
            type="email"
            id="email"
            placeholder="Email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />

          <input
            type="password"
            id="password"
            placeholder="Password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />

          {error && <p className="form-error" aria-live="polite">{error}</p>}

          <button type="submit" className="auth-submit-btn" disabled={loading}>
            {loading ? "Logging in..." : "Log In"}
          </button>
        </form>
      </div>
    </div>
  );
}
