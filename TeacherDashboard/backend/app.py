from flask import Flask, request, jsonify, render_template
import random
import string
import os
import json

# Get the absolute path to the frontend folder
current_dir = os.path.dirname(os.path.abspath(__file__))
frontend_dir = os.path.join(current_dir, '../frontend')

app = Flask(__name__, 
    template_folder=os.path.join(frontend_dir, 'templates'),
    static_folder=os.path.join(frontend_dir, 'static'))

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
teachers = load_data(TEACHER_FILE)
students = load_data(STUDENT_FILE)
classrooms = load_data(CLASSROOM_FILE)

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
    if any(t["email"] == email for t in teachers):
        return None, "Email already exists"
    teacher = {
        "UID": generate_uid(teachers),
        "Name": name,
        "email": email,
        "Password": password,
        "Class List": []
    }
    teachers.append(teacher)
    save_data(TEACHER_FILE, teachers)
    return teacher, "Teacher account created"

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
    teacher = next((t for t in teachers if t["email"] == teacher_email), None)
    if not teacher:
        return None, "Teacher not found"
    
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
    teacher["Class List"].append(classroom["UID"])
    save_data(CLASSROOM_FILE, classrooms)
    save_data(TEACHER_FILE, teachers)
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

# REMOVED: @app.route('/student') - since no student dashboard

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
    teacher = next((t for t in teachers if t["email"] == teacher_email), None)
    if not teacher:
        return jsonify({"error": "Teacher not found"}), 404
    teacher_classes = [c for c in classrooms if c["Primary Teacher"] == teacher_email]
    return jsonify({"classrooms": teacher_classes})

@app.route('/get_all_data', methods=['GET'])
def get_all_data():
    """Debug route to see all databases."""
    return jsonify({
        "Teachers": teachers,
        "Students": students,
        "Classrooms": classrooms
    })

# --- Run the Flask app ---
if __name__ == '__main__':
    print(f"Template folder: {app.template_folder}")
    print(f"Static folder: {app.static_folder}")
    print("Starting server on http://localhost:5000")
    app.run(debug=True)