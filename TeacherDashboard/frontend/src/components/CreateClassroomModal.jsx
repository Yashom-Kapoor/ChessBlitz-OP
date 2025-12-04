import { useState } from "react";

export default function CreateClassroomModal({ isOpen, onClose, onCreate, teacherUid }) {
  const [classroomName, setClassroomName] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  if (!isOpen) return null;

  const handleBackdropClick = (e) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!classroomName.trim()) return;

    setLoading(true);
    setError("");

    try {
      // Resolve teacher uid from prop or localStorage
      let uid = teacherUid;
      if (!uid) {
        try {
          const stored = JSON.parse(localStorage.getItem("teacher") || "{}");
          uid = stored.uid || stored.id || stored.teacher_uid;
        } catch {}
      }

      const response = await fetch("http://localhost:5001/create_classroom", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: classroomName.trim(),
          teacher_uid: uid
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || "Creation failed");
        setLoading(false);
        return;
      }

      // Reset form first
      setClassroomName("");
      setLoading(false);
      setError("");
      
      // Close modal regardless to avoid stuck UI
      onClose();

      // Normalize backend response shape and safely notify parent
      const raw = (data && (data.classroom || data)) || {};
      const safeClassroom = {
        name: raw.name ?? classroomName.trim(),
        join_code: raw.join_code ?? raw.Classroom_Code ?? null,
        id: raw.id ?? raw.UID ?? null,
        teacher_uid: raw.teacher_uid ?? uid ?? null
      };

      try {
        if (onCreate) onCreate(safeClassroom);
      } catch (e) {
        console.error("onCreate handler failed:", e);
        setError("Something went wrong updating the list. Please try again.");
      }
    } catch (err) {
      setError("Failed to connect to server. Make sure backend is running on localhost:5000");
      setLoading(false);
    }
  };

  return (
    <div className="modal-backdrop" onClick={handleBackdropClick}>
      <div className="modal-container" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2 className="modal-title">Create a classroom</h2>
        </div>
        <form onSubmit={handleSubmit} className="modal-form">
          <div className="modal-field">
            <label className="modal-label">Name</label>
            <input
              type="text"
              className="modal-input"
              value={classroomName}
              onChange={(e) => setClassroomName(e.target.value)}
              placeholder="Classroom name"
              autoFocus
            />
          </div>
          {error && <div style={{ color: '#ef4444', marginTop: '8px', fontSize: '14px' }}>{error}</div>}
          <div className="modal-actions">
            <button type="button" className="modal-button cancel" onClick={onClose} disabled={loading}>
              Cancel
            </button>
            <button type="submit" className="modal-button create" disabled={!classroomName.trim() || loading}>
              {loading ? "Creating..." : "Create"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}