import logoImage from "../assets/logo.png";
import profileIcon from "../assets/profile.png";
import classroomsIcon from "../assets/classrooms.png";
import createIcon from "../assets/add_classroom.png";
import settingsIcon from "../assets/settings.png";
import logoutIcon from "../assets/logout.png";

export default function Sidebar({ onCreateClassroomClick }) {
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
        <div className="nav-item">
          <div className="nav-icon">
            <img src={profileIcon} alt="Profile" />
          </div>
          <span className="nav-text">Profile</span>
        </div>

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
        <a href="/" className="nav-item">
          <div className="nav-icon">
            <img src={logoutIcon} alt="Log Out" />
          </div>
          <span className="nav-text">Log Out</span>
        </a>
      </div>
    </div>
  );
}
