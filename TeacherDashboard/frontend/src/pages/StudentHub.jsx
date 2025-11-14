import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { FaArrowLeft } from "react-icons/fa";

export default function StudentHub() {
  const { classroomId } = useParams();
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState("");
  const [students, setStudents] = useState([
    { status: 'online', name: 'John Smith', total: 12, daily: 1, elo: 1420 },
    { status: 'online', name: 'Emma Johnson', total: 7, daily: 0, elo: 1360 },
    { status: 'offline', name: 'Michael Brown', total: 25, daily: 1, elo: 1505 },
    { status: 'online', name: 'Sarah Davis', total: 0, daily: 0, elo: '????' },
    { status: 'online', name: 'James Wilson', total: 4, daily: 0, elo: 1200 },
    { status: 'offline', name: 'Emily Taylor', total: 9, daily: 1, elo: 1310 },
    { status: 'online', name: 'David Martinez', total: 18, daily: 1, elo: 1450 },
    { status: 'offline', name: 'Lisa Anderson', total: 3, daily: 0, elo: '????' },
    { status: 'online', name: 'Chris Thompson', total: 11, daily: 1, elo: 1395 },
    { status: 'offline', name: 'Amanda White', total: 2, daily: 0, elo: 1180 },
  ]);

  const normalize = (s) => {
    return (s || '')
      .toLowerCase()
      .normalize('NFKD')
      .replace(/\s+/g, ' ')
      .trim();
  };

  const filterByNameContains = (term) => {
    const t = normalize(term);
    if (!t) return students;
    return students.filter(s => normalize(s.name).includes(t));
  };

  const filteredStudents = filterByNameContains(searchTerm);

  // Mock classroom data
  const classroom = {
    id: classroomId,
    name: "Example Classroom",
  };

  return (
    <div className="student-hub-container">
      {/* Sidebar */}
      <aside className="student-hub-sidebar">
        <button onClick={() => navigate("/classrooms")} className="back-button">
          <FaArrowLeft />
          <span>Back</span>
        </button>
      </aside>

      {/* Header */}
      <div className="roster-header">
        <h1 className="roster-title">{classroom.name}</h1>
        <form className="search" role="search" onSubmit={(e) => e.preventDefault()}>
          <input
            type="search"
            id="q"
            placeholder="Search Student..."
            aria-label="Search"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </form>
      </div>

      {/* Roster Table */}
      <div className="table-wrap">
        <table className="roster">
          <colgroup>
            <col className="col-status" />
            <col className="col-avatar" />
            <col className="col-name" />
            <col className="col-total" />
            <col className="col-daily" />
            <col className="col-elo" />
          </colgroup>
          <thead>
            <tr>
              <th className="col-status">Status</th>
              <th className="col-avatar" aria-label="Profile photo"></th>
              <th className="col-name">Name</th>
              <th className="col-total">Total Puzzles Completed</th>
              <th className="col-daily">Daily Puzzles Completed</th>
              <th className="col-elo">Elo</th>
            </tr>
          </thead>
          <tbody>
            {filteredStudents.map((student, idx) => {
              const statusText = student.status === 'online' ? 'Online' : 'Offline';
              const dotClass = student.status === 'online' ? 'online' : 'offline';
              return (
                <tr key={idx}>
                  <td>
                    <span className={`status-dot ${dotClass}`}></span>
                    {statusText}
                  </td>
                  <td><span className="avatar"></span></td>
                  <td>
                    <a href="#" style={{ color: '#14728F', textDecoration: 'none' }}>
                      {student.name}
                    </a>
                  </td>
                  <td>{student.total ?? 'N'}</td>
                  <td>{student.daily ?? 'N'}</td>
                  <td>{student.elo ?? '????'}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
