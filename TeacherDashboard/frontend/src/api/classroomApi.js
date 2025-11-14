// Mock API for classrooms
const mockClassrooms = [
  {
    id: 1,
    name: "Example Classroom",
    students: 20,
    filled: 1,
    background: "#4A90E2"
  },
  {
    id: 2,
    name: "Example Classroom",
    students: 20,
    filled: 0,
    background: "#7B68EE"
  },
  {
    id: 3,
    name: "Example Classroom",
    students: 20,
    filled: 0,
    background: "#E74C3C"
  },
  {
    id: 4,
    name: "Example Classroom",
    students: 20,
    filled: 0,
    background: "#3498DB"
  },
  {
    id: 5,
    name: "Example Classroom",
    students: 20,
    filled: 0,
    background: "#9B59B6"
  }
];

export function getClassrooms() {
  return new Promise((resolve) => {
    setTimeout(() => resolve(mockClassrooms), 100);
  });
}

export function getClassroomById(id) {
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve(mockClassrooms.find(c => c.id === id));
    }, 100);
  });
}

export function createClassroom(name) {
  return new Promise((resolve) => {
    setTimeout(() => {
      const colors = ["#4A90E2", "#7B68EE", "#E74C3C", "#3498DB", "#9B59B6", "#16A085", "#F39C12"];
      const newClassroom = {
        id: mockClassrooms.length + 1,
        name: name,
        students: 20,
        filled: 0,
        background: colors[Math.floor(Math.random() * colors.length)]
      };
      mockClassrooms.push(newClassroom);
      resolve(newClassroom);
    }, 100);
  });
}

export function updateClassroom(id, name) {
  return new Promise((resolve) => {
    setTimeout(() => {
      const classroom = mockClassrooms.find(c => c.id === id);
      if (classroom) {
        classroom.name = name;
        resolve(classroom);
      } else {
        resolve(null);
      }
    }, 100);
  });
}

export function deleteClassroom(id) {
  return new Promise((resolve) => {
    setTimeout(() => {
      const index = mockClassrooms.findIndex(c => c.id === id);
      if (index !== -1) {
        mockClassrooms.splice(index, 1);
        resolve(true);
      } else {
        resolve(false);
      }
    }, 100);
  });
}