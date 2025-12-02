from flask import Flask, request, jsonify, render_template
from flask_cors import CORS
import random
import string
import os
from supabase import create_client
from dotenv import load_dotenv

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

# Initialize Supabase if credentials are present
load_dotenv() 
SUPABASE_KEY = os.getenv("SUPABASE_KEY")
SUPABASE_URL = os.getenv("SUPABASE_URL")

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

def generate_unique_code():
    """Generate a unique 6-character code for classrooms"""
    while True:
        code = ''.join(random.choices(string.ascii_uppercase + string.digits, k=6))
        # Check against Supabase classrooms
        if USE_SUPABASE and supabase:
            try:
                resp = supabase.table('Classroom-DB').select('join_code').eq('join_code', code).execute()
                data = resp.data if hasattr(resp, 'data') else resp[0]
                if not data or len(data) == 0:
                    return code
            except:
                return code
        else:
            return code

# --- Teacher functions ---
def create_teacher(name, email, password):
    #only Name and email are stored in Supabase
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

# --- Classroom functions ---
def create_classroom(name, teacher_uid=None):
    if not USE_SUPABASE or supabase is None:
        return None, "Supabase is not configured"

    if not teacher_uid:
        return None, "teacher_uid is required"

    # Verify teacher exists
    try:
        t_resp = supabase.table('Teacher-DB').select('*').eq('id', teacher_uid).execute()
        t_data = t_resp.data if hasattr(t_resp, 'data') else t_resp[0]
        if not t_data or len(t_data) == 0:
            return None, "teacher_uid not found"
    except Exception as e:
        return None, f"Supabase error verifying teacher: {e}"

    # Check existing classroom in Supabase
    try:
        resp = supabase.table('Classroom-DB').select('*').eq('name', name).execute()
        data = resp.data if hasattr(resp, 'data') else resp[0]
    except Exception as e:
        return None, f"Supabase error checking existing classroom: {e}"
    if data and len(data) > 0:
        return None, "Classroom name already exists"

    # Generate unique join code
    join_code = generate_unique_code()

    # Insert only name and join_code (Supabase generates primary key/UUID)
    try:
        insert_resp = supabase.table('Classroom-DB').insert({
            'name': name,
            'join_code': join_code,
            'teacher_uid': teacher_uid
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
                return inserted[0], "Classroom created (Supabase)"
            return inserted, "Classroom created (Supabase)"

        return {'name': name, 'join_code': join_code}, "Classroom created (Supabase, no returned row)"
    except Exception as e:
        return None, f"Supabase insert error: {e}"

def join_classroom(student_name, student_email, class_code):
    if not USE_SUPABASE or supabase is None:
        return None, "Supabase is not configured"

    # Find classroom by join_code in Supabase
    try:
        resp = supabase.table('Classroom-DB').select('*').eq('join_code', class_code).execute()
        data = resp.data if hasattr(resp, 'data') else resp[0]
        if not data:
            return None, "Classroom not found"
        classroom = data[0] if isinstance(data, list) else data
        # For now, just acknowledge join; student roster management not implemented
        return classroom, f"{student_name} joined {classroom.get('name', 'classroom')}"
    except Exception as e:
        return None, f"Supabase error during join: {e}"

# --- Routes ---
@app.route('/')
def index():
    return render_template('index.html')

@app.route('/teacher')
def teacher_dashboard():
    return render_template('teacher_dashboard.html')

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


@app.route('/login', methods=['POST'])
def login_route():
    """Login: check Teacher-DB for the provided email and return teacher row if exists.
    Password is not validated here because the teacher rows currently only store name/email.
    """
    if not USE_SUPABASE or supabase is None:
        return jsonify({"error": "Supabase is not configured"}), 500

    data = request.get_json() or {}
    email = data.get('email')
    if not email:
        return jsonify({"error": "Email is required"}), 400

    try:
        resp = supabase.table('Teacher-DB').select('*').eq('email', email).execute()
        rows = resp.data if hasattr(resp, 'data') else resp[0]
        if not rows or len(rows) == 0:
            return jsonify({"error": "Teacher not found"}), 404
        teacher = rows[0] if isinstance(rows, list) else rows
        return jsonify({"teacher": teacher}), 200
    except Exception as e:
        return jsonify({"error": f"Supabase error: {e}"}), 500

@app.route('/create_classroom', methods=['POST'])
def create_classroom_route():
    data = request.get_json()
    name = data.get('name')
    teacher_uid = data.get('teacher_uid')
    
    if not name:
        return jsonify({"error": "Classroom name is required"}), 400
    if not teacher_uid:
        return jsonify({"error": "teacher_uid is required"}), 400

    classroom, message = create_classroom(name, teacher_uid)
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

@app.route('/get_classrooms', methods=['GET'])
def get_classrooms_route():
    if not USE_SUPABASE or supabase is None:
        return jsonify({"error": "Supabase is not configured"}), 500
    
    try:
        resp = supabase.table('Classroom-DB').select('*').execute()
        data = resp.data if hasattr(resp, 'data') else resp[0]
        return jsonify({"classrooms": data if data else []})
    except Exception as e:
        return jsonify({"error": f"Supabase error: {e}"}), 500

@app.route('/get_all_data', methods=['GET'])
def get_all_data():
    """Debug route to see Supabase data only."""
    out = {}
    if not USE_SUPABASE or supabase is None:
        out["error"] = "Supabase is not configured"
        return jsonify(out)

    try:
        t_resp = supabase.table('Teacher-DB').select('*').execute()
        out["Teachers"] = t_resp.data if hasattr(t_resp, 'data') else t_resp[0]
    except Exception as e:
        out["Teachers"] = {"error": f"Supabase error: {e}"}

    try:
        c_resp = supabase.table('Classroom-DB').select('*').execute()
        out["Classrooms"] = c_resp.data if hasattr(c_resp, 'data') else c_resp[0]
    except Exception as e:
        out["Classrooms"] = {"error": f"Supabase error: {e}"}
    return jsonify(out)

# --- Run the Flask app ---
if __name__ == '__main__':
    print(f"Template folder: {app.template_folder}")
    print(f"Static folder: {app.static_folder}")
    print("Starting server on https://chessblitz-2.onrender.com/")
    app.run(debug=True)