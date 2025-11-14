import ClassroomGrid from "../components/ClassroomGrid";
import EditPanel from "../components/EditPanel";

export default function MyClassrooms({ refreshTrigger, onRenameClassroom, onDeleteClassroom }) {
  return (
    <div className="main-content">
      <h1 className="page-title">My Classrooms</h1>
      
      <div className="content-wrapper">
        <div style={{ flex: 1 }}>
          <ClassroomGrid 
            refreshTrigger={refreshTrigger}
            onRenameClassroom={onRenameClassroom}
            onDeleteClassroom={onDeleteClassroom}
          />
        </div>
        <div style={{ flexShrink: 0 }}>
          <EditPanel />
        </div>
      </div>
    </div>
  );
}
