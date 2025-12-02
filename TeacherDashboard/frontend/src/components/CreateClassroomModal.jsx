import { useState } from "react";
import { createClassroom } from "../api/classroomApi";

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

      // Use centralized API helper which respects VITE_API_URL
      let created;
      try {
        created = await createClassroom(classroomName.trim(), uid);
      } catch (err) {
        setError(err.message || "Creation failed");
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
      const safeClassroom = {
        name: created.name ?? classroomName.trim(),
        join_code: created.join_code ?? null,
        id: created.id ?? created.join_code ?? null,
        teacher_uid: created.teacher_uid ?? uid ?? null,
        students: created.students ?? 0,
        filled: created.filled ?? 0,
        background: created.background
      };

      try {
        if (onCreate) onCreate(safeClassroom);
      } catch (e) {
        console.error("onCreate handler failed:", e);
        setError("Something went wrong updating the list. Please try again.");
      }
    } catch (err) {
      const apiUrl = import.meta.env.VITE_API_URL || "<backend API>";
      setError(err.message || `Failed to connect to server. Make sure backend is reachable (${apiUrl})`);
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