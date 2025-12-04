import { useNavigate } from "react-router-dom";
import logoImage from "../assets/logo.png";
import profileIcon from "../assets/profile.png";
import classroomsIcon from "../assets/classrooms.png";
import createIcon from "../assets/add_classroom.png";
import settingsIcon from "../assets/settings.png";
import logoutIcon from "../assets/logout.png";

export default function Sidebar({ onCreateClassroomClick, showCoachmark, onDismissCoachmark }) {
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
        <div className="nav-item create-nav-item" onClick={() => { if (onCreateClassroomClick) onCreateClassroomClick(); if (onDismissCoachmark) onDismissCoachmark(); }} style={{ position: 'relative' }}>
          <div className="nav-icon">
            <img src={createIcon} alt="Create Classrooms" />
          </div>
          <span className="nav-text">Create Classrooms</span>
          {showCoachmark && (
            <div style={{ position: 'absolute', top: '6px', left: 'calc(100% + 14px)', width: 260, zIndex: 50 }}>
              <div style={{ display: 'flex', alignItems: 'center' }}>
                {/* Arrow pointing left toward the sidebar */}
                <div style={{ width: 0, height: 0, borderTop: '12px solid transparent', borderBottom: '12px solid transparent', borderRight: '14px solid #fff', marginRight: -6, boxShadow: '1px 1px 0 rgba(0,0,0,0.04)' }} />
                <div style={{ background: '#fff', border: '1px solid #ddd', padding: '12px 14px', borderRadius: 8, boxShadow: '0 6px 18px rgba(0,0,0,0.12)' }}>
                  <div style={{ fontWeight: 600, marginBottom: 6 }}>Click here to create your first classroom</div>
                  <div style={{ fontSize: 12, color: '#555' }}>Open a classroom and share the join code with students.</div>
                </div>
              </div>
              <div style={{ textAlign: 'right', marginTop: 8 }}>
                <button onClick={(e) => { e.stopPropagation(); if (onDismissCoachmark) onDismissCoachmark(); }} style={{ background: 'transparent', border: 'none', color: '#666', cursor: 'pointer' }}>Dismiss</button>
              </div>
            </div>
          )}
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
