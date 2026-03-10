import { Link } from "react-router-dom";
import chessblitzLogo from "../assets/ChessBlitz.png";
import "../styles/Landing.css";

export default function Landing() {
  return (
    <div className="landing-page">
      <img src={chessblitzLogo} alt="ChessBlitz" className="landing-image" />

      <div className="landing-content">
        <h1 className="landing-title">ChessBlitz</h1>
        <p className="tagline">
          Welcome to ChessBlitz for Teachers.<br />
          Manage classrooms. Track student progress.
        </p>
        <div className="landing-buttons">
          <Link to="/login" className="btn btn-primary">
            Log in
          </Link>
          <Link to="/signup" className="btn btn-secondary">
            Sign up
          </Link>
        </div>
        
      </div>
    </div>
  );
}

