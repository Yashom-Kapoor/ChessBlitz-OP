import { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { FaWifi, FaUsers, FaEllipsisV } from "react-icons/fa";
import logoTransparent from "../assets/logo_transparent.png";

export default function ClassroomCard({ classroom, onRenameClassroom, onDeleteClassroom }) {
  const navigate = useNavigate();
  const [showMenu, setShowMenu] = useState(false);
  const menuRef = useRef(null);

  const handleClick = () => {
    navigate(`/classroom/${classroom.id}`);
  };

  const handleMenuClick = (e) => {
    e.stopPropagation();
    setShowMenu(!showMenu);
  };

  const handleRename = (e) => {
    e.stopPropagation();
    if (onRenameClassroom) {
      onRenameClassroom(classroom.id, classroom.name);
    }
    setShowMenu(false);
  };

  const handleDelete = (e) => {
    e.stopPropagation();
    if (onDeleteClassroom) {
      onDeleteClassroom(classroom.id);
    }
    setShowMenu(false);
  };

  // Close menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setShowMenu(false);
      }
    };

    if (showMenu) {
      document.addEventListener("mousedown", handleClickOutside);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [showMenu]);

  return (
    <div className="classroom-card" onClick={handleClick}>
      {/* Header with logo background */}
      <div 
        className="card-header logo-background"
        style={{ backgroundImage: `url(${logoTransparent})`, backgroundPosition: 'center left' }}
      >
        {/* Menu dots */}
        <div className="card-menu" ref={menuRef} onClick={handleMenuClick}>
          <FaEllipsisV />
          {showMenu && (
            <div className="card-menu-popup">
              <button className="menu-item" onClick={handleRename}>
                Rename classroom
              </button>
              <button className="menu-item delete" onClick={handleDelete}>
                Delete classroom
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Card body */}
      <div className="card-body">
        <h3 className="card-title">{classroom.name}</h3>
        <p className="card-subtitle">{classroom.filled === 1 ? '1 student' : '0 students'}</p>
        
        {/* Footer with WiFi and student count */}
        <div className="card-footer">
          <FaWifi />
          <span>{classroom.filled}/{classroom.students}</span>
          <FaUsers />
        </div>
      </div>
    </div>
  );
}
