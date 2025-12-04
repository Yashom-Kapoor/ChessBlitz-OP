// Real API integration for classrooms
const API_BASE = "http://localhost:5000";

function pickColor() {
  const colors = ["#4A90E2", "#7B68EE", "#E74C3C", "#3498DB", "#9B59B6", "#16A085", "#F39C12"];
  return colors[Math.floor(Math.random() * colors.length)];
}

export async function getClassrooms(teacherUid = null) {
  try {
    const url = teacherUid ? `${API_BASE}/get_classrooms?teacher_uid=${encodeURIComponent(teacherUid)}` : `${API_BASE}/get_classrooms`;
    const resp = await fetch(url);
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

export async function createClassroom(name) {
  try {
    const resp = await fetch(`${API_BASE}/create_classroom`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name })
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
      join_code: c.join_code
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
  try {
    const resp = await fetch(`${API_BASE}/delete_classroom`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id })
    });
    const json = await resp.json();
    if (!resp.ok) throw new Error(json.error || `Failed to delete classroom (${resp.status})`);
    return true;
  } catch (e) {
    console.error("deleteClassroom error:", e);
    return false;
  }
}