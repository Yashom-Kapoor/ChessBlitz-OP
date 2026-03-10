import { FaArrowLeft } from "react-icons/fa";
import "./StudentOverviewModal.css";

export default function StudentOverviewModal({ isOpen, onClose, student }) {
  if (!isOpen || !student) return null;

  // Calculate accuracy (mock data for now)
  const accuracy = Math.floor(Math.random() * 30) + 70; // 70-99%

  // Normalize incoming student fields to be resilient to backend variations
  const resolvedName = student.name || student.username || student.display_name || 'Unknown Student';
  const resolvedTotal = (student.total ?? student.total_puzzles_completed ?? student.totalCompleted ?? student.totalCompletedPuzzles) || 0;
  const resolvedDaily = Boolean(student.daily ?? student.daily_puzzle ?? student.did_daily ?? student.dailyPuzzle);
  const resolvedRating = student.rating ?? student.ratings ?? 'N';

  return (
    <div className="student-overview-page">
      {/* Sidebar */}
      <aside className="student-overview-sidebar">
        <button onClick={onClose} className="back-button">
          <FaArrowLeft />
          <span>Back</span>
        </button>
      </aside>

      {/* Main content */}
      <div className="student-overview-main">
        {/* Header */}
        <h1 className="overview-title">Student Overview</h1>

        {/* Student name with avatar */}
        <div className="student-header">
            <div className="student-name-section">
            <h2 className="student-name">{resolvedName}</h2>
            <div className="student-avatar-circle">
              <span className="avatar-placeholder">👤</span>
            </div>
          </div>
        </div>

        {/* Stats cards */}
        <div className="stats-container">
          <div className="stat-card">
            <div className="stat-label">Lessons Completed</div>
            <div className="stat-value">{resolvedTotal ?? "##"}</div>
          </div>
          <div className="stat-card">
            <div className="stat-label">Daily Puzzle</div>
            <div className="stat-value">
              {resolvedDaily ? (
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
          <div className="stat-card">
            <div className="stat-label">Rating</div>
            <div className="stat-value">{resolvedRating}</div>
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
