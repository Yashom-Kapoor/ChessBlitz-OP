import { useEffect, useState } from "react";
import ClassroomCard from "./ClassroomCard";
import { getClassrooms } from "../api/classroomApi";

export default function ClassroomGrid({ refreshTrigger, onRenameClassroom, onDeleteClassroom }) {
  const [classrooms, setClassrooms] = useState([]);

  useEffect(() => {
    getClassrooms().then(setClassrooms);
  }, [refreshTrigger]);

  return (
    <div className="classroom-grid">
      {classrooms.map((cls) => (
        <ClassroomCard 
          key={cls.id} 
          classroom={cls}
          onRenameClassroom={onRenameClassroom}
          onDeleteClassroom={onDeleteClassroom}
        />
      ))}
    </div>
  );
}
