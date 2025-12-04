import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { createClient } from "@supabase/supabase-js";
import chessblitzLogo from "../assets/ChessBlitz.png";
import "../styles/Landing.css";
import { SUPABASE_URL, SUPABASE_KEY } from "../config";

// supabase client for auth & database
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

export default function Signup({ onLogin }) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordMismatch, setPasswordMismatch] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const checkPasswords = () => setPasswordMismatch(password !== confirmPassword);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setPasswordMismatch(false);

    if (!name.trim() || !email.trim() || !password || !confirmPassword) {
      setError("All fields are required");
      return;
    }

    if (password !== confirmPassword) {
      setPasswordMismatch(true);
      return;
    }

    setLoading(true);

    try {
      // 1️⃣ Create user in Supabase Auth
      const { data: authUser, error: authError } = await supabase.auth.signUp({
        email: email.trim(),
        password,
      });

      if (authError) {
        setError(authError.message);
        setLoading(false);
        return;
      }
      
      // 2️⃣ Insert teacher row directly using Supabase client
      const userId = authUser.user.id;
      const { data: teacher, error: teacherError } = await supabase
        .from("Teacher-DB")
        .insert({
          teacher_uid: userId,
          name: name.trim(),
          email: email.trim(),
          bio: null,
          favorite_opening_move: null,
        })
        .select()
        .single();

      if (teacherError) {
        setError(teacherError.message);
        setLoading(false);
        return;
      }

      // 3️⃣ Store teacher locally for session
      localStorage.setItem("teacher", JSON.stringify(teacher));

      // 4️⃣ Success → go to classrooms
      navigate("/classrooms");
    } catch (err) {
      setError(err.message || "Something went wrong");
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
            placeholder="Name"
            value={name}
            onChange={e => setName(e.target.value)}
            required
          />
          <input
            type="email"
            placeholder="Email"
            value={email}
            onChange={e => setEmail(e.target.value)}
            required
          />
          <input
            type="password"
            placeholder="Create Password"
            value={password}
            onChange={e => setPassword(e.target.value)}
            required
          />
          <input
            type="password"
            placeholder="Confirm Password"
            value={confirmPassword}
            onChange={e => setConfirmPassword(e.target.value)}
            required
          />
          {passwordMismatch && <span className="field-error">Passwords do not match</span>}
          {error && <span className="field-error">! {error}</span>}
          <button type="submit" disabled={loading}>
            {loading ? "Creating Account..." : "Create Account"}
          </button>
        </form>
      </div>
    </div>
  );
}
