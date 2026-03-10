import { useState, useEffect } from "react";

export default function RenameClassroomModal({ isOpen, onClose, onSubmit, currentName }) {
  const [classroomName, setClassroomName] = useState("");

  useEffect(() => {
    if (isOpen && currentName) {
      setClassroomName(currentName);
    }
  }, [isOpen, currentName]);

  if (!isOpen) return null;

  const handleSubmit = (e) => {
    e.preventDefault();
    if (classroomName.trim()) {
      onSubmit(classroomName.trim());
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
          <h2 className="modal-title">Rename classroom</h2>
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
              Rename
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

