from flask import Flask, request, jsonify, render_template
from flask_cors import CORS
import random
import string
import os
import json
from supabase import create_client

# Supabase client initialization
USE_SUPABASE = False
supabase = None

# Get the absolute path to the frontend folder
current_dir = os.path.dirname(os.path.abspath(__file__))
frontend_dir = os.path.join(current_dir, '../frontend')

app = Flask(__name__, 
    template_folder=os.path.join(frontend_dir, 'templates'),
    static_folder=os.path.join(frontend_dir, 'static'))

# Enable CORS for all routes
CORS(app)

# --- Setup ---
DATA_DIR = "data"
os.makedirs(DATA_DIR, exist_ok=True)

TEACHER_FILE = os.path.join(DATA_DIR, "teachers.json")
STUDENT_FILE = os.path.join(DATA_DIR, "students.json")
CLASSROOM_FILE = os.path.join(DATA_DIR, "classrooms.json")

# --- Load/Save JSON Helpers ---
def load_data(filename):
    """Load JSON data from a file or return an empty list."""
    if os.path.exists(filename):
        with open(filename, "r") as f:
            try:
                return json.load(f)
            except json.JSONDecodeError:
                return []
    return []

def save_data(filename, data):
    """Save JSON data to a file (overwrite)."""
    with open(filename, "w") as f:
        json.dump(data, f, indent=4)

# --- Initialize Databases ---
students = load_data(STUDENT_FILE)
classrooms = load_data(CLASSROOM_FILE)

# Initialize Supabase if credentials are present
SUPABASE_URL = "https://pqmamdtdvdjroosbhicu.supabase.co"
SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBxbWFtZHRkdmRqcm9vc2JoaWN1Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MTA2NjE0MywiZXhwIjoyMDc2NjQyMTQzfQ.LGWfibhYzTll5EWRBDCsgcFsT7jlXqWecXpDVuc_YcQ"
if SUPABASE_URL and SUPABASE_KEY and create_client:
    try:
        supabase = create_client(SUPABASE_URL, SUPABASE_KEY)
        USE_SUPABASE = True
        print("Supabase client initialized. Teachers will be stored in Supabase.")
    except Exception as e:
        print("Failed to initialize Supabase client:", e)
        USE_SUPABASE = False
else:
    if not (SUPABASE_URL and SUPABASE_KEY):
        print("SUPABASE_URL or SUPABASE_KEY not set; using local JSON storage for teachers.")
    else:
        print("Supabase client library not available; using local JSON storage for teachers.")

# --- Utility: Generate IDs and unique codes ---
def generate_uid(existing_list):
    while True:
        uid = ''.join(random.choices(string.ascii_uppercase + string.digits, k=8))
        if not any(item["UID"] == uid for item in existing_list):
            return uid

def generate_unique_code():
    while True:
        code = ''.join(random.choices(string.ascii_uppercase + string.digits, k=6))
        if not any(c["code"] == code for c in classrooms):
            return code

# --- Teacher functions ---
def create_teacher(name, email, password):
    # Now requires Supabase: only Name and email are stored in Supabase
    if not USE_SUPABASE or supabase is None:
        return None, "Supabase is not configured"

    # Check existing teacher in Supabase
    try:
        resp = supabase.table('Teacher-DB').select('*').eq('email', email).execute()
        data = resp.data if hasattr(resp, 'data') else resp[0]
    except Exception as e:
        return None, f"Supabase error checking existing teacher: {e}"
    if data and len(data) > 0:
        return None, "Email already exists"

    # Insert only Name and email (Supabase generates primary key/UUID)
    try:
        # Some supabase-python clients don't allow chaining `.select()` on insert.
        insert_resp = supabase.table('Teacher-DB').insert({
            'name': name,
            'email': email
        }).execute()

        # Normalize returned data across different client versions
        inserted = None
        if hasattr(insert_resp, 'data'):
            inserted = insert_resp.data
        elif isinstance(insert_resp, dict) and 'data' in insert_resp:
            inserted = insert_resp['data']
        elif isinstance(insert_resp, list):
            inserted = insert_resp

        if inserted:
            if isinstance(inserted, list) and len(inserted) > 0:
                return inserted[0], "Teacher account created (Supabase)"
            return inserted, "Teacher account created (Supabase)"

        return {'name': name, 'email': email}, "Teacher account created (Supabase, no returned row)"
    except Exception as e:
        return None, f"Supabase insert error: {e}"

# --- Student functions ---
def create_student(name, email):
    # Check if student with this email already exists
    existing_student = next((s for s in students if s["email"] == email), None)
    if existing_student:
        return existing_student
    
    student = {
        "UID": generate_uid(students),
        "Name": name,
        "email": email
    }
    students.append(student)
    save_data(STUDENT_FILE, students)
    return student

# --- Classroom functions ---
def create_classroom(name, teacher_email):
    # Fetch teacher either from Supabase or local
    teacher = None
    if not USE_SUPABASE or supabase is None:
        return None, "Supabase is not configured"
    try:
        resp = supabase.table('Teacher-DB').select('*').eq('email', teacher_email).execute()
        data = resp.data if hasattr(resp, 'data') else resp[0]
        if data and len(data) > 0:
            teacher = data[0]
        else:
            return None, "Teacher not found"
    except Exception as e:
        return None, f"Supabase error finding teacher: {e}"
    
    classroom = {
        "UID": generate_uid(classrooms),
        "Name": name,
        "Primary Teacher": teacher_email,
        "Student List": [],
        "Student Email": [],
        "Student ID": [],
        "Classroom Code": generate_unique_code()
    }
    classrooms.append(classroom)
    # Update classroom list locally
    save_data(CLASSROOM_FILE, classrooms)

    # Update teacher's Class List
    try:
        # If teacher has 'Class_List' field in Supabase, append to it; otherwise create it
        class_list = teacher.get('Class_List', []) if isinstance(teacher, dict) else []
        class_list.append(classroom['UID'])
        supabase.table('Teacher-DB').update({'Class_List': class_list}).eq('email', teacher_email).execute()
    except Exception as e:
        return classroom, f"Classroom created but failed to update teacher in Supabase: {e}"
    return classroom, "Classroom created successfully"

def join_classroom(student_name, student_email, class_code):
    classroom = next((c for c in classrooms if c["code"] == class_code), None)
    if not classroom:
        return None, "Classroom not found"
    
    # Check if student exists, if not create
    student = next((s for s in students if s["email"] == student_email), None)
    if not student:
        student = create_student(student_name, student_email)
    
    # Add to class if not already in
    if student["UID"] not in classroom["Student ID"]:
        classroom["Student List"].append(student["Name"])
        classroom["Student Email"].append(student["email"])
        classroom["Student ID"].append(student["UID"])
        save_data(CLASSROOM_FILE, classrooms)
        return classroom, f"{student_name} joined {classroom['Name']}"
    else:
        return None, "Student already in class"

# --- Routes ---
@app.route('/')
def index():
    return render_template('index.html')

@app.route('/teacher')
def teacher_dashboard():
    return render_template('teacher_dashboard.html')

# PORK

@app.route('/sign_up', methods=['POST'])
def sign_up_route():
    data = request.get_json()
    name = data.get('name')
    email = data.get('email')
    password = data.get('password')

    teacher, message = create_teacher(name, email, password)
    if teacher:
        return jsonify({"message": message, "teacher": teacher}), 201
    return jsonify({"error": message}), 400

@app.route('/create_classroom', methods=['POST'])
def create_classroom_route():
    data = request.get_json()
    name = data.get('name')
    teacher_email = data.get('email')

    classroom, message = create_classroom(name, teacher_email)
    if classroom:
        return jsonify({"message": message, "classroom": classroom}), 201
    return jsonify({"error": message}), 400

@app.route('/join_classroom', methods=['POST'])
def join_classroom_route():
    data = request.get_json()
    student_name = data.get('name')
    student_email = data.get('email')
    code = data.get('code')

    classroom, message = join_classroom(student_name, student_email, code)
    if classroom:
        return jsonify({"message": message, "classroom": classroom}), 200
    return jsonify({"error": message}), 404

@app.route('/get_classrooms/<teacher_email>', methods=['GET'])
def get_classrooms_route(teacher_email):
    if not USE_SUPABASE or supabase is None:
        return jsonify({"error": "Supabase is not configured"}), 500
    try:
        resp = supabase.table('Teacher-DB').select('*').eq('email', teacher_email).execute()
        data = resp.data if hasattr(resp, 'data') else resp[0]
        if not (data and len(data) > 0):
            return jsonify({"error": "Teacher not found"}), 404
    except Exception as e:
        return jsonify({"error": f"Supabase error: {e}"}), 500
    teacher_classes = [c for c in classrooms if c["Primary Teacher"] == teacher_email]
    return jsonify({"classrooms": teacher_classes})

@app.route('/get_all_data', methods=['GET'])
def get_all_data():
    """Debug route to see all databases."""
    out = {
        "Students": students,
        "Classrooms": classrooms
    }
    if not USE_SUPABASE or supabase is None:
        out["Teachers"] = {"error": "Supabase is not configured"}
        return jsonify(out)

    try:
        resp = supabase.table('Teacher-DB').select('*').execute()
        data = resp.data if hasattr(resp, 'data') else resp[0]
        out["Teachers"] = data
    except Exception as e:
        out["Teachers"] = {"error": f"Supabase error: {e}"}
    return jsonify(out)

# --- Run the Flask app ---
if __name__ == '__main__':
    print(f"Template folder: {app.template_folder}")
    print(f"Static folder: {app.static_folder}")
    print("Starting server on http://localhost:5000")
    app.run(debug=True)