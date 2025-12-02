// Real API integration for classrooms
// Use Vite env `VITE_API_URL` when available, otherwise fall back to Render URL.
const API_BASE = (import.meta.env.VITE_API_URL || "https://chessblitz-2.onrender.com").replace(/\/$/, "");

function pickColor() {
  const colors = ["#4A90E2", "#7B68EE", "#E74C3C", "#3498DB", "#9B59B6", "#16A085", "#F39C12"];
  return colors[Math.floor(Math.random() * colors.length)];
}

export async function getClassrooms() {
  try {
    const resp = await fetch(`${API_BASE}/get_classrooms`);
    if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
    const json = await resp.json();
    const rows = Array.isArray(json.classrooms) ? json.classrooms : [];
    // Normalize shape expected by grid/cards
    return rows.map((r) => ({
      id: r.id ?? r.uid ?? r.join_code ?? r.name,
      name: r.name ?? "Untitled",
      students: 0,
      filled: 0,
      background: pickColor(),
      join_code: r.join_code
    }));
  } catch (e) {
    console.error("Failed to fetch classrooms:", e);
    return [];
  }
}

export async function getClassroomById(id) {
  const all = await getClassrooms();
  return all.find((c) => c.id === id) || null;
}

export async function createClassroom(name, teacherUid = null) {
  try {
    const body = { name };
    if (teacherUid) body.teacher_uid = teacherUid;

    const resp = await fetch(`${API_BASE}/create_classroom`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body)
    });
    const json = await resp.json();
    if (!resp.ok) throw new Error(json.error || "Failed to create classroom");
    const c = json.classroom || {};
    return {
      id: c.id ?? c.uid ?? c.join_code ?? c.name,
      name: c.name ?? name,
      students: 0,
      filled: 0,
      background: pickColor(),
      join_code: c.join_code,
      teacher_uid: c.teacher_uid ?? teacherUid ?? null
    };
  } catch (e) {
    console.error("Create classroom error:", e);
    throw e;
  }
}

export async function updateClassroom(id, name) {
  // Placeholder: implement when backend provides update endpoint
  console.warn("updateClassroom not implemented against backend");
  return null;
}

export async function deleteClassroom(id) {
  // Placeholder: implement when backend provides delete endpoint
  console.warn("deleteClassroom not implemented against backend");
  return false;
}