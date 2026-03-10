import { useEffect, useState } from "react";
import ClassroomCard from "./ClassroomCard";
import { getClassrooms } from "../api/classroomApi";

export default function ClassroomGrid({ refreshTrigger, onRenameClassroom, onDeleteClassroom, teacherUid, onEmpty }) {
  const [classrooms, setClassrooms] = useState([]);

  useEffect(() => {
    let mounted = true;
    getClassrooms(teacherUid).then((rows) => {
      if (!mounted) return;
      setClassrooms(rows);
      if (onEmpty) onEmpty(Array.isArray(rows) && rows.length === 0);
    }).catch((e) => {
      if (onEmpty) onEmpty(true);
    });
    return () => { mounted = false; };
  }, [refreshTrigger, teacherUid]);

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
