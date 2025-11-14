import { useState } from "react";
import { useNavigate } from "react-router-dom";
import chessblitzLogo from "../assets/ChessBlitz.png";
import "../styles/Landing.css";

export default function Signup() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordMismatch, setPasswordMismatch] = useState(false);
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

  const handleSubmit = (e) => {
    e.preventDefault();
    
    if (password !== confirmPassword) {
      setPasswordMismatch(true);
      return;
    }

    // Success → go to classrooms
    navigate("/classrooms");
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
              ! password not match
            </span>
          )}

          <button type="submit" className="auth-submit-btn">
            Create Account
          </button>
        </form>
      </div>

    </div>
  );
}

