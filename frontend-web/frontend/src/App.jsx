import { useState } from "react";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import Sidebar from "./components/Sidebar";
import MyClassrooms from "./pages/MyClassrooms";
import StudentHub from "./pages/StudentHub";
import Landing from "./pages/Landing";
import Login from "./pages/Login";
import Signup from "./pages/Signup";
import Profile from "./pages/Profile";
import CreateClassroomModal from "./components/CreateClassroomModal";
import RenameClassroomModal from "./components/RenameClassroomModal";
import { updateClassroom, deleteClassroom } from "./api/classroomApi";

export default function App() {
  const [teacher, setTeacher] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem("teacher") || "null");
    } catch {
      return null;
    }
  });
  const teacherUid = teacher ? (teacher.uid || teacher.id || teacher.teacher_uid) : null;

  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isRenameModalOpen, setIsRenameModalOpen] = useState(false);
  const [renameClassroomId, setRenameClassroomId] = useState(null);
  const [renameClassroomName, setRenameClassroomName] = useState("");
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [showCreateCoachmark, setShowCreateCoachmark] = useState(false);

  const handleCreateClassroom = async (created) => {
    // created may be a name string or a classroom object; in both cases just refresh the grid
    setRefreshTrigger(prev => prev + 1);
  };

  const handleRenameClassroom = async (name) => {
    if (renameClassroomId) {
      await updateClassroom(renameClassroomId, name);
      setRefreshTrigger(prev => prev + 1);
    }
  };

  const handleDeleteClassroom = async (id) => {
    if (window.confirm("Are you sure you want to delete this classroom? This action cannot be undone.")) {
      const ok = await deleteClassroom(id);
      if (!ok) {
        alert('Failed to delete classroom. Check console for details.');
        return;
      }
      setRefreshTrigger(prev => prev + 1);
    }
  };

  const openRenameModal = (id, name) => {
    setRenameClassroomId(id);
    setRenameClassroomName(name);
    setIsRenameModalOpen(true);
  };

  const closeRenameModal = () => {
    setIsRenameModalOpen(false);
    setRenameClassroomId(null);
    setRenameClassroomName("");
  };

  return (
    <Router>
      <div className="app-container">
        <Routes>
          <Route path="/" element={<Landing />} />
          <Route path="/login" element={<Login onLogin={setTeacher} />} />
          <Route path="/signup" element={<Signup onLogin={setTeacher} />} />
          <Route path="/classrooms" element={
            <>
              <Sidebar onCreateClassroomClick={() => { setIsCreateModalOpen(true); setShowCreateCoachmark(false); }} showCoachmark={showCreateCoachmark} onDismissCoachmark={() => setShowCreateCoachmark(false)} />
              <MyClassrooms
                refreshTrigger={refreshTrigger}
                onRenameClassroom={openRenameModal}
                onDeleteClassroom={handleDeleteClassroom}
                teacherUid={teacherUid}
                onEmpty={(isEmpty) => {
                  // Show coachmark only if teacher is logged in and there are no classrooms
                  if (isEmpty && teacherUid) setShowCreateCoachmark(true);
                  else setShowCreateCoachmark(false);
                }}
              />
            </>
          } />
          <Route path="/classroom/:classroomId" element={
            <>
              <Sidebar onCreateClassroomClick={() => setIsCreateModalOpen(true)} />
              <StudentHub />
            </>
          } />
          <Route path="/profile" element={
            <>
              <Sidebar onCreateClassroomClick={() => setIsCreateModalOpen(true)} />
              <Profile />
            </>
          } />
        </Routes>
        <CreateClassroomModal
          isOpen={isCreateModalOpen}
          onClose={() => setIsCreateModalOpen(false)}
          onCreate={handleCreateClassroom}
          teacherUid={teacherUid}
        />
        <RenameClassroomModal
          isOpen={isRenameModalOpen}
          onClose={closeRenameModal}
          onSubmit={handleRenameClassroom}
          currentName={renameClassroomName}
        />
      </div>
    </Router>
  );
}
