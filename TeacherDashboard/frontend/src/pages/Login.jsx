import { useState } from "react";
import { useNavigate } from "react-router-dom";
import chessblitzLogo from "../assets/ChessBlitz.png";
import "../styles/Landing.css";
import { supabase } from "../supabaseClient"; // ✅ changed from API fetch

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
      await supabase.auth.refreshSession();
      
      // ✅ Use Supabase Auth instead of fetch
      const { data, error: supaError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (supaError) {
        setError(supaError.message || "Login failed");
        setLoading(false);
        return;
      }

      // ✅ Store the Supabase user object in localStorage
      const user = data.user;
      localStorage.setItem("teacher", JSON.stringify({ ...user, uid: user.id }));

      // ✅ Redirect on success
      navigate("/classrooms");
    } catch (err) {
      console.error(err);
      setError("Unexpected error occurred during login.");
    } finally {
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
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />

          <input
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
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
