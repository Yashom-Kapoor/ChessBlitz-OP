import { useState } from "react";
import { useNavigate } from "react-router-dom";
import chessblitzLogo from "../assets/ChessBlitz.png";
import "../styles/Landing.css";

export default function Signup() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordMismatch, setPasswordMismatch] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const checkPasswords = () => {
    if (password && confirmPassword && password !== confirmPassword) {
      setPasswordMismatch(true);
    } else {
      setPasswordMismatch(false);
    }
  };

  const handlePasswordChange = (value) => {
    setPassword(value);
    setTimeout(checkPasswords, 0);
  };

  const handleConfirmPasswordChange = (value) => {
    setConfirmPassword(value);
    setTimeout(checkPasswords, 0);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    setPasswordMismatch(false);
    setError("");

    if (!name.trim()) {
      setError("Name is required");
      return;
    }

    if (!email.trim()) {
      setError("Email is required");
      return;
    }

    if (!password || !confirmPassword) {
      setError("Passwords are required");
      return;
    }

    if (password !== confirmPassword) {
      setPasswordMismatch(true);
      return;
    }

    setLoading(true);

    try {
      const apiUrl = (import.meta.env.VITE_API_URL || "https://chessblitz-2.onrender.com").replace(/\/$/, "");
      const response = await fetch(`${apiUrl}/sign_up`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: name.trim(),
          email: email.trim(),
          password: password,
        }),
      });

      const data = await response.json();
      if (!response.ok) {
        setError(data.error || "Signup failed");
        setLoading(false);
        return;
      }

      // Persist teacher info for later (including uid/id)
      try {
        const teacher = data.teacher || {};
        const uid = teacher.id ?? teacher.uid ?? teacher.teacher_uid;
        const stored = { ...teacher, uid };
        localStorage.setItem("teacher", JSON.stringify(stored));
      } catch {}

      // Success → go to classrooms
      navigate("/classrooms");
    } catch (err) {
      const apiUrl = import.meta.env.VITE_API_URL || "<backend API>";
      setError(err.message || `Failed to connect to server. Make sure backend is reachable (${apiUrl})`);
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
            type="text"
            id="name"
            placeholder="Name"
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
          />

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
            id="create-password"
            placeholder="Create Password"
            required
            value={password}
            onChange={(e) => handlePasswordChange(e.target.value)}
          />

          <input
            type="password"
            id="confirm-password"
            placeholder="Confirm Password"
            required
            value={confirmPassword}
            onChange={(e) => handleConfirmPasswordChange(e.target.value)}
          />

          {passwordMismatch && (
            <span className="field-error" aria-live="polite">
              Passwords do not match
            </span>
          )}

          {error && (
            <span className="field-error" aria-live="polite">
              ! {error}
            </span>
          )}

          <button type="submit" className="auth-submit-btn" disabled={loading}>
            {loading ? "Creating Account..." : "Create Account"}
          </button>
        </form>
      </div>

    </div>
  );
}

