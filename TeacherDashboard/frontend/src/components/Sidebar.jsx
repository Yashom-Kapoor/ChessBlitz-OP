import { useNavigate } from "react-router-dom";
import logoImage from "../assets/logo.png";
import profileIcon from "../assets/profile.png";
import classroomsIcon from "../assets/classrooms.png";
import createIcon from "../assets/add_classroom.png";
import settingsIcon from "../assets/settings.png";
import logoutIcon from "../assets/logout.png";

export default function Sidebar({ onCreateClassroomClick }) {
  const navigate = useNavigate();

  const handleLogout = () => {
    // Clear authentication data
    localStorage.removeItem("teacher");
    // Redirect to landing page
    navigate("/");
  };

  return (
    <div className="sidebar">
      {/* Logo */}
      <div className="sidebar-logo">
        <div className="logo-box">
          <img src={logoImage} alt="Logo" className="logo-image" />
        </div>
      </div>

      {/* Navigation Items */}
      <div className="sidebar-nav">
        {/* Profile */}
        <a href="/profile" className="nav-item">
          <div className="nav-icon">
            <img src={profileIcon} alt="Profile" />
          </div>
          <span className="nav-text">Profile</span>
        </a>

        {/* My Classrooms - Active */}
        <a href="/classrooms" className="nav-item active">
          <div className="nav-icon">
            <img src={classroomsIcon} alt="My Classrooms" />
          </div>
          <span className="nav-text">My Classrooms</span>
        </a>

        {/* Create Classrooms */}
        <div className="nav-item" onClick={onCreateClassroomClick}>
          <div className="nav-icon">
            <img src={createIcon} alt="Create Classrooms" />
          </div>
          <span className="nav-text">Create Classrooms</span>
        </div>

        {/* Settings */}
        <div className="nav-item">
          <div className="nav-icon">
            <img src={settingsIcon} alt="Settings" />
          </div>
          <span className="nav-text">Settings</span>
        </div>
      </div>

      {/* Log Out */}
      <div className="sidebar-footer">
        <div className="nav-item" onClick={handleLogout} style={{ cursor: "pointer" }}>
          <div className="nav-icon">
            <img src={logoutIcon} alt="Log Out" />
          </div>
          <span className="nav-text">Log Out</span>
        </div>
      </div>
    </div>
  );
}
