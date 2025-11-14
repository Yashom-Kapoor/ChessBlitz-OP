import { useState } from "react";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import Sidebar from "./components/Sidebar";
import MyClassrooms from "./pages/MyClassrooms";
import StudentHub from "./pages/StudentHub";
import Landing from "./pages/Landing";
import Login from "./pages/Login";
import Signup from "./pages/Signup";
import CreateClassroomModal from "./components/CreateClassroomModal";
import RenameClassroomModal from "./components/RenameClassroomModal";
import { createClassroom, updateClassroom, deleteClassroom } from "./api/classroomApi";

export default function App() {
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isRenameModalOpen, setIsRenameModalOpen] = useState(false);
  const [renameClassroomId, setRenameClassroomId] = useState(null);
  const [renameClassroomName, setRenameClassroomName] = useState("");
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  const handleCreateClassroom = async (name) => {
    await createClassroom(name);
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
      await deleteClassroom(id);
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
          <Route path="/login" element={<Login />} />
          <Route path="/signup" element={<Signup />} />
          <Route path="/classrooms" element={
            <>
              <Sidebar onCreateClassroomClick={() => setIsCreateModalOpen(true)} />
              <MyClassrooms 
                refreshTrigger={refreshTrigger}
                onRenameClassroom={openRenameModal}
                onDeleteClassroom={handleDeleteClassroom}
              />
            </>
          } />
          <Route path="/classroom/:classroomId" element={
            <>
              <Sidebar onCreateClassroomClick={() => setIsCreateModalOpen(true)} />
              <StudentHub />
            </>
          } />
        </Routes>
        <CreateClassroomModal
          isOpen={isCreateModalOpen}
          onClose={() => setIsCreateModalOpen(false)}
          onCreate={handleCreateClassroom}
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
