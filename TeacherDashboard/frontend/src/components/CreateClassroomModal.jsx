import { useState } from "react";

export default function CreateClassroomModal({ isOpen, onClose, onCreate }) {
  const [classroomName, setClassroomName] = useState("");

  if (!isOpen) return null;

  const handleSubmit = (e) => {
    e.preventDefault();
    if (classroomName.trim()) {
      onCreate(classroomName.trim());
      setClassroomName("");
      onClose();
    }
  };

  const handleBackdropClick = (e) => {
    if (e.target === e.currentTarget) {
      onClose();
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
          <div className="modal-actions">
            <button type="button" className="modal-button cancel" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className="modal-button create" disabled={!classroomName.trim()}>
              Create
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

