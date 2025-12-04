import { useState, useEffect } from "react";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import { FaArrowLeft } from "react-icons/fa";
import StudentOverviewModal from "../components/StudentOverviewModal";

export default function StudentHub() {
  const { classroomId } = useParams();
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [students, setStudents] = useState([]);
  const location = useLocation();
  const [classroomName, setClassroomName] = useState(location.state?.classroomName ?? "Classroom");

  const apiUrl = (import.meta.env.VITE_API_URL || "http://localhost:5000").replace(/\/$/, "");

  useEffect(() => {
    // Fetch classroom info (by join_code or id)
    // If we already received a classroomName via navigation state, skip fetching
    if (location.state?.classroomName) return;

    async function fetchClassroom() {
      if (!classroomId) return;
      try {
        const resp = await fetch(`${apiUrl}/get_classroom?join_code=${encodeURIComponent(classroomId)}`);
        if (!resp.ok) {
          // try by id
          const resp2 = await fetch(`${apiUrl}/get_classroom?id=${encodeURIComponent(classroomId)}`);
          if (resp2.ok) {
            const j = await resp2.json();
            setClassroomName(j.classroom?.name ?? `Classroom ${classroomId}`);
          } else {
            setClassroomName(`Classroom ${classroomId}`);
          }
        } else {
          const j = await resp.json();
          setClassroomName(j.classroom?.name ?? `Classroom ${classroomId}`);
        }
      } catch (e) {
        console.error('Error fetching classroom:', e);
        setClassroomName(`Classroom ${classroomId}`);
      }
    }
    fetchClassroom();
  }, [classroomId]);

  useEffect(() => {
    // Helper that performs the REST + fallback sequence (used by immediate load and by polling)
    let mounted = true;
    const fetchStudentsWithFallback = async () => {
      // Primary: try /get_students with the classroomId
      try {
        const resp = await fetch(`${apiUrl}/get_students?classroom_code=${encodeURIComponent(classroomId)}`);
        if (resp.ok) {
          const j = await resp.json();
          const rows = Array.isArray(j.students) ? j.students : [];
          if (rows && rows.length > 0) {
            const mapped = rows.map((r) => ({
              name: r.name || r.username,
              rating: r.rating ?? r.ratings ?? 'N',
              total: r.total_puzzles_completed ?? r.total ?? 0,
              daily: !!(r.daily_puzzle ?? r.daily),
              is_active: r.is_active ?? r.active ?? false,
            }));
            if (mounted) { setStudents(mapped); console.debug('students updated (primary)', mapped); return; }
          }
        }
      } catch (e) {
        // primary failed, continue to fallbacks
      }

      // Fallback 1: call /get_all_data and filter Student rows by classroom_code
      try {
        const allResp = await fetch(`${apiUrl}/get_all_data`);
        if (allResp.ok) {
          const allJson = await allResp.json();
          const studentsTable = allJson.Students || allJson.students || [];
          const matched = (studentsTable || []).filter(s => {
            const code = s.classroom_code || s.classroom || s.classroomId || s.classroom_id || s.classroomCode;
            return code === classroomId;
          });
          if (matched && matched.length > 0) {
            const mappedFallback = matched.map((r) => ({
              name: r.name || r.username,
              rating: r.rating ?? r.ratings ?? 'N',
              total: r.total_puzzles_completed ?? r.total ?? 0,
              daily: !!(r.daily_puzzle ?? r.daily),
              is_active: r.is_active ?? r.active ?? false,
            }));
            if (mounted) { setStudents(mappedFallback); console.debug('students updated (fallback all_data)', mappedFallback); return; }
          }
        }
      } catch (e) {
        // ignore and continue
      }

      // Fallback 2: resolve classroom by id to find a join_code and retry /get_students
      try {
        const classResp = await fetch(`${apiUrl}/get_classroom?id=${encodeURIComponent(classroomId)}`);
        if (classResp.ok) {
          const classJson = await classResp.json();
          const jc = classJson.classroom?.join_code || classJson.classroom?.joinCode || classJson.classroom?.joincode;
          if (jc) {
            const retryResp = await fetch(`${apiUrl}/get_students?classroom_code=${encodeURIComponent(jc)}`);
            if (retryResp.ok) {
              const retryJson = await retryResp.json();
              const retryRows = Array.isArray(retryJson.students) ? retryJson.students : [];
              if (retryRows && retryRows.length > 0) {
                const mappedRetry = retryRows.map((r) => ({
                  name: r.name || r.username,
                  rating: r.rating ?? r.ratings ?? 'N',
                  total: r.total_puzzles_completed ?? r.total ?? 0,
                  daily: !!(r.daily_puzzle ?? r.daily),
                  is_active: r.is_active ?? r.active ?? false,
                }));
                if (mounted) { setStudents(mappedRetry); console.debug('students updated (fallback join_code)', mappedRetry); return; }
              }
            }
          }
        }
      } catch (e) {
        // ignore
      }

      // If all fallbacks failed, clear students
      if (mounted) { setStudents([]); console.debug('students cleared (no data)'); }
    };

    // Immediate run
    fetchStudentsWithFallback();

    // Use Server-Sent Events to receive continuous updates from backend
    if (!classroomId) return;

    const esUrl = `${apiUrl}/stream_students?classroom_code=${encodeURIComponent(classroomId)}`;
    let es = null;
    let pollIntervalId = null;
    let esErrorCount = 0;
    const MAX_ES_ERRORS = 3;
    try {
      es = new EventSource(esUrl);
    } catch (err) {
      console.error('EventSource not supported or failed to open', err);
      // start aggressive polling fallback immediately
      pollIntervalId = setInterval(fetchStudentsWithFallback, 10);
      return () => {
        mounted = false;
        if (pollIntervalId) clearInterval(pollIntervalId);
      };
    }

    es.onmessage = (event) => {
      try {
        const j = JSON.parse(event.data);
        const rows = Array.isArray(j.students) ? j.students : [];
        const mapped = rows.map((r) => ({
          name: r.name || r.username,
          rating: r.rating ?? r.ratings ?? 'N',
          total: r.total_puzzles_completed ?? r.total ?? 0,
          daily: !!(r.daily_puzzle ?? r.daily),
          is_active: r.is_active ?? r.active ?? false,
        }));
        if (mounted) { setStudents(mapped); console.debug('students updated (sse)', mapped); }
      } catch (e) {
        console.error('Failed to parse SSE students message', e);
      }
    };

    es.onerror = (err) => {
      esErrorCount += 1;
      console.error('Student stream error', err, 'count', esErrorCount);
      if (esErrorCount >= MAX_ES_ERRORS) {
        try { es.close(); } catch (e) {}
        // start aggressive polling as fallback
        pollIntervalId = setInterval(fetchStudentsWithFallback, 10);
      }
    };

    return () => {
      mounted = false;
      try { if (es) es.close(); } catch (e) {}
      if (pollIntervalId) clearInterval(pollIntervalId);
    };
  }, [classroomId]);

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
        <h1 className="roster-title">{classroomName}</h1>
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
              <th className="col-daily">Daily Puzzle</th>
              <th className="col-elo">Rating</th>
            </tr>
          </thead>
          <tbody>
              {filteredStudents.map((student, idx) => {
              // We don't have online status in Student-DB; show placeholder
              const dotClass = student.is_active ? 'online' : 'offline';
              return (
                <tr key={idx}>
                  <td>
                    <span className={`status-dot ${dotClass}`}></span>
                    {/* no status available */}
                  </td>
                  <td><span className="avatar"></span></td>
                  <td>
                    <a 
                      href="#" 
                      style={{ color: '#14728F', textDecoration: 'none' }}
                      onClick={(e) => {
                        e.preventDefault();
                        setSelectedStudent(student);
                        setIsModalOpen(true);
                      }}
                    >
                      {student.name}
                    </a>
                  </td>
                  <td>{student.total ?? 0}</td>
                  <td>{student.daily ? '✓' : '✗'}</td>
                  <td>{student.rating ?? 'N'}</td>
                </tr>
              );
            })}
            {filteredStudents.length === 0 && (
              <tr>
                <td colSpan={6} style={{ textAlign: 'center', padding: '2.5rem', color: '#666' }}>
                  No students found for this classroom.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Student Overview Modal */}
      <StudentOverviewModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        student={selectedStudent}
      />
    </div>
  );
}
