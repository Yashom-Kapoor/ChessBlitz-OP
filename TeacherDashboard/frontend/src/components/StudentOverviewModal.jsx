import { FaTimes } from "react-icons/fa";
import "./StudentOverviewModal.css";

export default function StudentOverviewModal({ isOpen, onClose, student }) {
  if (!isOpen || !student) return null;

  // Calculate accuracy (mock data for now)
  const accuracy = Math.floor(Math.random() * 30) + 70; // 70-99%

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        {/* Close button */}
        <button className="modal-close-btn" onClick={onClose}>
          <FaTimes />
        </button>

        {/* Header */}
        <h1 className="overview-title">Student Overview</h1>

        {/* Student name with avatar */}
        <div className="student-header">
          <div className="student-name-section">
            <h2 className="student-name">{student.name}</h2>
            <div className="student-avatar-circle">
              <span className="avatar-placeholder">👤</span>
            </div>
          </div>
        </div>

        {/* Stats cards */}
        <div className="stats-container">
          <div className="stat-card">
            <div className="stat-label">Lessons Completed</div>
            <div className="stat-value">{student.total ?? "##"}</div>
          </div>
          <div className="stat-card">
            <div className="stat-label">Daily Puzzle</div>
            <div className="stat-value">
              {student.daily > 0 ? (
                <span className="checkmark">✓</span>
              ) : (
                <span className="no-checkmark">✗</span>
              )}
            </div>
          </div>
          <div className="stat-card">
            <div className="stat-label">Overall Accuracy</div>
            <div className="stat-value accuracy">{accuracy}%</div>
          </div>
        </div>

        {/* Lessons table */}
        <div className="lessons-section">
          <table className="lessons-table">
            <thead>
              <tr>
                <th>Lesson Name</th>
                <th>Status</th>
                <th>Accuracy</th>
                <th>????</th>
                <th>Elo</th>
              </tr>
            </thead>
            <tbody>
              {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((lesson) => (
                <tr key={lesson}>
                  <td>
                    <a href="#" className="lesson-link">
                      Lesson #{lesson}
                    </a>
                  </td>
                  <td>
                    <span className={`status-badge ${lesson <= 7 ? "complete" : "incomplete"}`}>
                      {lesson <= 7 ? "Complete" : "Incomplete"}
                    </span>
                  </td>
                  <td>%</td>
                  <td>N</td>
                  <td>????</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
