import { useState } from "react";
import { useParams, Link } from "react-router-dom";

export default function StudentOverview() {
  const { studentId } = useParams();

  const [lessons] = useState([
    { name: "Lesson #1", status: "Complete", accuracy: "87%", attempts: 2, time: "5:28", elo: 923 },
    { name: "Lesson #2", status: "Incomplete", accuracy: "10%", attempts: 1, time: "1:30", elo: 378 },
    { name: "Lesson #3", status: "Complete", accuracy: "92%", attempts: 3, time: "4:15", elo: 1010 },
    { name: "Lesson #4", status: "Incomplete", accuracy: "45%", attempts: 5, time: "7:42", elo: 650 },
    { name: "Lesson #5", status: "Complete", accuracy: "76%", attempts: 4, time: "6:05", elo: 890 },
  ]);

  return (
    <div className="student-overview-container">
      {/* Header */}
      <div className="roster-header">
        <h1 className="roster-title">Student Overview</h1>
        <p className="student-id">Viewing student ID: {studentId}</p>
        <Link to={`/classroom/1`} style={{ color: "#14728F", textDecoration: "none" }}>
          ← Back to Student Hub
        </Link>
      </div>

      {/* Lessons Table */}
      <div className="table-wrap">
        <table className="roster">
          <colgroup>
            <col className="col-lesson" />
            <col className="col-status" />
            <col className="col-accuracy" />
            <col className="col-attempts" />
            <col className="col-time" />
            <col className="col-elo" />
          </colgroup>
          <thead>
            <tr>
              <th className="col-lesson">Lesson Name</th>
              <th className="col-status">Status</th>
              <th className="col-accuracy">Accuracy</th>
              <th className="col-attempts">Attempts</th>
              <th className="col-time">Time Spent</th>
              <th className="col-elo">Elo</th>
            </tr>
          </thead>
          <tbody>
            {lessons.map((lesson, idx) => (
              <tr key={idx}>
                <td>{lesson.name}</td>
                <td>{lesson.status}</td>
                <td>{lesson.accuracy}</td>
                <td>{lesson.attempts}</td>
                <td>{lesson.time}</td>
                <td>{lesson.elo}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}