from flask import Flask, request, jsonify, render_template, Response, stream_with_context
from flask_cors import CORS
import random
import string
import os
from supabase import create_client
from dotenv import load_dotenv
import json
import time

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

# --- Local JSON storage removed; Supabase only ---

# Initialize Supabase if credentials are present
load_dotenv() 
SUPABASE_KEY = os.getenv("SUPABASE_KEY")
SUPABASE_URL = os.getenv("SUPABASE_URL")
PORT = os.getenv("PORT")


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


def resolve_student_name_by_uid(uid):
    """Try several common tables to resolve a student's display name from their uid."""
    if not USE_SUPABASE or supabase is None:
        return None
    possible_tables = ['users', 'profiles', 'Student-Users', 'StudentUsers', 'Student-Profile', 'User-DB']
    for tbl in possible_tables:
        try:
            resp = supabase.table(tbl).select('name,username').eq('uid', uid).execute()
            data = resp.data if hasattr(resp, 'data') else resp[0]
            if data and len(data) > 0:
                row = data[0] if isinstance(data, list) else data
                return row.get('name') or row.get('username')
        except Exception:
            continue
    return None


def find_link_info_for_student(student_uid, canonical_class_id=None, classroom_code=None):
    """Try to find a linking row for a student to read flags like is_active.
    Returns a dict of link info or None.
    """
    if not USE_SUPABASE or supabase is None:
        return None

    possible_link_tables = [
        'Classroom_student-DB', 'Classroom_students-DB', 'Classroom-students-DB',
        'classroom_students', 'classroom_student', 'ClassroomStudent', 'Classroom_Students'
    ]
    possible_student_cols = ['student_uid', 'studentUid', 'student_id', 'uid']
    possible_class_cols = ['classroom_id', 'classroom', 'class_id', 'classroomId', 'join_code', 'classroom_code']

    for tbl in possible_link_tables:
        for s_col in possible_student_cols:
            try:
                # Build base query
                query = supabase.table(tbl).select('*').eq(s_col, student_uid)
                # If we have a canonical id, try to include it
                if canonical_class_id is not None:
                    for c_col in possible_class_cols:
                        try:
                            resp = supabase.table(tbl).select('*').eq(s_col, student_uid).eq(c_col, canonical_class_id).execute()
                            data = resp.data if hasattr(resp, 'data') else resp[0]
                            if data and len(data) > 0:
                                row = data[0] if isinstance(data, list) else data
                                return row
                        except Exception:
                            continue
                # Try classroom_code if provided
                if classroom_code is not None:
                    for c_col in possible_class_cols:
                        try:
                            resp = supabase.table(tbl).select('*').eq(s_col, student_uid).eq(c_col, classroom_code).execute()
                            data = resp.data if hasattr(resp, 'data') else resp[0]
                            if data and len(data) > 0:
                                row = data[0] if isinstance(data, list) else data
                                return row
                        except Exception:
                            continue
                # Last resort: just fetch by student uid only
                try:
                    resp = supabase.table(tbl).select('*').eq(s_col, student_uid).execute()
                    data = resp.data if hasattr(resp, 'data') else resp[0]
                    if data and len(data) > 0:
                        row = data[0] if isinstance(data, list) else data
                        return row
                except Exception:
                    continue
            except Exception:
                continue
    return None


def fetch_students_for_classroom(classroom_code):
    """Return a list of normalized student dicts for the given classroom_code.
    This mirrors the logic previously in the get_students route so both the
    REST and SSE endpoints can reuse it.
    """
    if not USE_SUPABASE or supabase is None:
        return []

    # Direct Student-DB fast-path: many schemas store classroom_code on student rows
    try:
        # Try multiple possible Student-DB columns and value forms to be tolerant to schema
        candidate_student_queries = [
            ('classroom_code', classroom_code),
            ('classroom_code', str(classroom_code)),
            ('classroom_id', classroom_code),
            ('classroom_id', str(classroom_code)),
            ('classroom', classroom_code),
            ('classroom', str(classroom_code)),
            ('classroomCode', classroom_code),
            ('classroomCode', str(classroom_code)),
        ]

        s_data = None
        for col, val in candidate_student_queries:
            try:
                s_resp = supabase.table('Student-DB').select('*').eq(col, val).execute()
                s_data = s_resp.data if hasattr(s_resp, 'data') else s_resp[0]
                if s_data and len(s_data) > 0:
                    break
            except Exception:
                s_data = None
                continue

        students_out = []
        if s_data and len(s_data) > 0:
            for srow in (s_data if isinstance(s_data, list) else [s_data]):
                uid = srow.get('uid') or srow.get('id')
                name = srow.get('name') or srow.get('username') or resolve_student_name_by_uid(uid)
                rating = srow.get('rating') if srow.get('rating') is not None else srow.get('ratings')
                total = srow.get('total_puzzles_completed') or srow.get('total_completed') or 0
                daily = srow.get('daily_puzzle') if srow.get('daily_puzzle') is not None else srow.get('daily') or False

                # prefer link-table is_active when available
                is_active = None
                try:
                    link = find_link_info_for_student(uid, canonical_class_id=None, classroom_code=classroom_code)
                    if link and isinstance(link, dict):
                        is_active = link.get('is_active') if 'is_active' in link else link.get('active') if 'active' in link else link.get('isActive') if 'isActive' in link else None
                except Exception:
                    is_active = None

                if is_active is None:
                    is_active = srow.get('is_active') if srow.get('is_active') is not None else srow.get('active') if srow.get('active') is not None else False

                students_out.append({
                    'name': name,
                    'rating': rating,
                    'total_puzzles_completed': total,
                    'daily_puzzle': daily,
                    'is_active': bool(is_active),
                })
            return students_out
    except Exception:
        # fall through to relational lookup
        pass

    # If direct queries returned nothing, try to fetch all students and filter locally
    try:
        try:
            all_resp = supabase.table('Student-DB').select('*').execute()
            all_students = all_resp.data if hasattr(all_resp, 'data') else all_resp[0]
        except Exception:
            all_students = None

        if all_students and len(all_students) > 0:
            filtered = []
            for s in (all_students if isinstance(all_students, list) else [all_students]):
                code = s.get('classroom_code') or s.get('classroom') or s.get('classroomId') or s.get('classroom_id') or s.get('classroomCode')
                if code is None:
                    continue
                if str(code) == str(classroom_code):
                    filtered.append(s)

            if filtered and len(filtered) > 0:
                students_out = []
                for srow in filtered:
                    uid = srow.get('uid') or srow.get('id')
                    name = srow.get('name') or srow.get('username') or resolve_student_name_by_uid(uid)
                    rating = srow.get('rating') if srow.get('rating') is not None else srow.get('ratings')
                    total = srow.get('total_puzzles_completed') or srow.get('total_completed') or 0
                    daily = srow.get('daily_puzzle') if srow.get('daily_puzzle') is not None else srow.get('daily') or False
                    is_active = None
                    try:
                        link = find_link_info_for_student(uid, canonical_class_id=None, classroom_code=classroom_code)
                        if link and isinstance(link, dict):
                            is_active = link.get('is_active') if 'is_active' in link else link.get('active') if 'active' in link else link.get('isActive') if 'isActive' in link else None
                    except Exception:
                        is_active = None
                    if is_active is None:
                        is_active = srow.get('is_active') if srow.get('is_active') is not None else srow.get('active') if srow.get('active') is not None else False
                    students_out.append({
                        'name': name,
                        'rating': rating,
                        'total_puzzles_completed': total,
                        'daily_puzzle': daily,
                        'is_active': bool(is_active),
                    })
                return students_out
    except Exception:
        pass

    # Relational fallback: Classroom -> Classroom_student link table -> Student rows
    classroom_row = None
    try:
        resp = supabase.table('Classroom-DB').select('*').or_(f"classroom_id.eq.{classroom_code},join_code.eq.{classroom_code},id.eq.{classroom_code}").execute()
        data = resp.data if hasattr(resp, 'data') else resp[0]
        if data and len(data) > 0:
            classroom_row = data[0] if isinstance(data, list) else data
    except Exception:
        classroom_row = None

    if not classroom_row:
        return []

    canonical_class_id = classroom_row.get('classroom_id') or classroom_row.get('id') or classroom_row.get('join_code')
    if not canonical_class_id:
        return []

    # query linking table for student_uid entries — try several likely table and column names
    cs_data = None
    explicit_tbl = 'Classroom_student-DB'
    possible_class_cols = ['classroom_id', 'classroom', 'class_id', 'classroomId', 'classroom_id']
    cs_error = None
    try:
        for col in possible_class_cols:
            try:
                cs_resp = supabase.table(explicit_tbl).select('*').eq(col, canonical_class_id).execute()
                cs_data = cs_resp.data if hasattr(cs_resp, 'data') else cs_resp[0]
                if cs_data and len(cs_data) >= 0:
                    break
            except Exception as e:
                cs_error = e
                cs_data = None
                try:
                    cs_resp = supabase.table(explicit_tbl).select('*').eq(col, str(canonical_class_id)).execute()
                    cs_data = cs_resp.data if hasattr(cs_resp, 'data') else cs_resp[0]
                    if cs_data and len(cs_data) >= 0:
                        break
                except Exception:
                    cs_data = None
                    continue
        if not cs_data:
            possible_link_tables = [
                'Classroom_students-DB', 'Classroom-students-DB',
                'classroom_students', 'classroom_student', 'ClassroomStudent', 'Classroom_Students'
            ]
            for tbl in possible_link_tables:
                for col in possible_class_cols:
                    try:
                        cs_resp = supabase.table(tbl).select('*').eq(col, canonical_class_id).execute()
                        cs_data = cs_resp.data if hasattr(cs_resp, 'data') else cs_resp[0]
                        if cs_data and len(cs_data) >= 0:
                            break
                    except Exception as e:
                        cs_error = e
                        cs_data = None
                        try:
                            cs_resp = supabase.table(tbl).select('*').eq(col, str(canonical_class_id)).execute()
                            cs_data = cs_resp.data if hasattr(cs_resp, 'data') else cs_resp[0]
                            if cs_data and len(cs_data) >= 0:
                                break
                        except Exception:
                            cs_data = None
                            continue
                if cs_data:
                    break
    except Exception as e:
        cs_error = e

    if cs_data is None or (isinstance(cs_data, list) and len(cs_data) == 0):
        return []

    # Build a mapping of student_uid -> link attributes (e.g. is_active)
    student_uids = []
    student_link_map = {}
    for row in cs_data:
        uid = None
        is_active = None
        if isinstance(row, dict):
            uid = row.get('student_uid') or row.get('studentUid') or row.get('student_id') or row.get('uid') or row.get('id')
            is_active = row.get('is_active') if 'is_active' in row else row.get('active') if 'active' in row else row.get('isActive') if 'isActive' in row else None
        else:
            uid = row
        if uid:
            student_uids.append(uid)
            student_link_map[uid] = {'is_active': bool(is_active) if is_active is not None else None}

    # Batch fetch all student rows in one query to reduce round trips
    students_out = []
    try:
        # Attempt to fetch all student rows where uid in student_uids
        s_resp = supabase.table('Student-DB').select('*').in_('uid', student_uids).execute() if hasattr(supabase.table('Student-DB'), 'in_') else supabase.table('Student-DB').select('*').execute()
        # The Supabase client may not expose in_ helper; fallback to multiple filters if unavailable
        s_data = None
        try:
            s_data = s_resp.data if hasattr(s_resp, 'data') else s_resp[0]
        except Exception:
            s_data = None

        if not s_data:
            # Fallback: fetch all and filter locally (rare)
            all_resp = supabase.table('Student-DB').select('*').execute()
            all_students = all_resp.data if hasattr(all_resp, 'data') else all_resp[0]
            s_data = [r for r in (all_students or []) if (r.get('uid') or r.get('id')) in student_uids]

        # Map fetched rows by uid for quick lookup
        fetched_map = {}
        if isinstance(s_data, list):
            for r in s_data:
                key = r.get('uid') or r.get('id')
                if key:
                    fetched_map[str(key)] = r
        elif isinstance(s_data, dict):
            key = s_data.get('uid') or s_data.get('id')
            if key:
                fetched_map[str(key)] = s_data

        for su in student_uids:
            srow = fetched_map.get(str(su))
            if not srow:
                continue
            name = srow.get('name') or srow.get('username') or resolve_student_name_by_uid(srow.get('uid') or su)
            rating = srow.get('rating') if srow.get('rating') is not None else srow.get('ratings')
            total = srow.get('total_puzzles_completed') or srow.get('total_completed') or 0
            daily = srow.get('daily_puzzle') if srow.get('daily_puzzle') is not None else srow.get('daily') or False
            link_info = student_link_map.get(su, {})
            is_active = link_info.get('is_active')
            if is_active is None:
                is_active = srow.get('is_active') if srow.get('is_active') is not None else srow.get('active') if srow.get('active') is not None else False

            students_out.append({
                'name': name,
                'rating': rating,
                'total_puzzles_completed': total,
                'daily_puzzle': daily,
                'is_active': bool(is_active),
            })
    except Exception:
        # as a last resort, fall back to per-student fetch (keeps behavior but slower)
        for su in student_uids:
            try:
                s_resp = supabase.table('Student-DB').select('*').eq('uid', su).execute()
                s_data = s_resp.data if hasattr(s_resp, 'data') else s_resp[0]
                if s_data and len(s_data) > 0:
                    srow = s_data[0] if isinstance(s_data, list) else s_data
                    name = srow.get('name') or srow.get('username') or resolve_student_name_by_uid(srow.get('uid') or su)
                    rating = srow.get('rating') if srow.get('rating') is not None else srow.get('ratings')
                    total = srow.get('total_puzzles_completed') or srow.get('total_completed') or 0
                    daily = srow.get('daily_puzzle') if srow.get('daily_puzzle') is not None else srow.get('daily') or False
                    link_info = student_link_map.get(su, {})
                    is_active = link_info.get('is_active')
                    if is_active is None:
                        is_active = srow.get('is_active') if srow.get('is_active') is not None else srow.get('active') if srow.get('active') is not None else False

                    students_out.append({
                        'name': name,
                        'rating': rating,
                        'total_puzzles_completed': total,
                        'daily_puzzle': daily,
                        'is_active': bool(is_active),
                    })
            except Exception:
                continue

    return students_out

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
    
def validate_teacher_data(data):
    """Check required fields"""
    required = ["user_id", "name", "email"]
    missing = [field for field in required if not data.get(field)]
    if missing:
        return False, f"Missing required fields: {', '.join(missing)}"
    return True, None

def insert_teacher(data):
    """Insert teacher row into Teacher-DB"""
    insert_data = {
        "teacher_uid": data["user_id"],
        "name": data["name"],
        "email": data["email"],
        "bio": data.get("bio"),
        "favorite_opening_move": data.get("favorite_opening_move"),
    }
    resp = supabase.table("Teacher-DB").insert(insert_data).execute()
    inserted = resp.data if hasattr(resp, "data") else resp[0]
    if not inserted:
        return None
    return inserted[0] if isinstance(inserted, list) else inserted

    # Direct insert into Teacher-DB (no Supabase Auth creation)
    # NOTE: If your DB enforces a foreign-key on `teacher_uid` referencing Auth users,
    # this insert may fail. In that case either make `teacher_uid` nullable/remove the FK,
    # or provide a valid `teacher_uid` that exists in the Auth users table.
    try:
        insert_payload = {
            'name': name,
            'email': email
        }
        insert_resp = supabase.table('Teacher-DB').insert(insert_payload).execute()

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
        # Return a clear message suggesting the probable schema constraint
        msg = f"Supabase insert error: {e}"
        if 'foreign key' in str(e).lower() or 'violates foreign key constraint' in str(e).lower():
            msg += "\nHint: your `Teacher-DB` table enforces a foreign-key on `teacher_uid`. Either make `teacher_uid` nullable, remove the FK, or supply a valid `teacher_uid` that exists in the Auth users table."
        return None, msg

# --- Classroom functions ---
def create_classroom(name, teacher_uid=None):
    if not USE_SUPABASE or supabase is None:
        return None, "Supabase is not configured"

    if not teacher_uid:
        return None, "teacher_uid is required"

    # Check existing classroom in Supabase
    try:
        resp = supabase.table('Classroom-DB').select('*').eq('name', name).execute()
        data = resp.data if hasattr(resp, 'data') else resp[0]
    except Exception as e:
        return None, f"Supabase error checking existing classroom: {e}"
    if data and len(data) > 0:
        return None, "Classroom name already exists"

    # Verify teacher exists — try multiple likely column names and tolerate missing columns
    t_data = None
    last_exc = None
    possible_cols = ['id', 'teacher_uid', 'uid', 'email']
    for col in possible_cols:
        try:
            t_resp = supabase.table('Teacher-DB').select('*').eq(col, teacher_uid).execute()
            t_data = t_resp.data if hasattr(t_resp, 'data') else t_resp[0]
            if t_data and len(t_data) > 0:
                break
        except Exception as e:
            # record exception and try next column name instead of failing immediately
            last_exc = e
            t_data = None
            continue

    if not t_data or len(t_data) == 0:
        if last_exc:
            return None, f"Supabase error verifying teacher: {last_exc}"
        return None, "teacher_uid not found"

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
    """Login route - authenticates teacher by email"""
    if not USE_SUPABASE or supabase is None:
        return jsonify({"error": "Supabase is not configured"}), 500
    
    data = request.get_json()
    email = data.get('email')
    password = data.get('password')  # Note: Password validation not implemented yet
    
    if not email or not password:
        return jsonify({"error": "Email and password are required"}), 400
    
    try:
        # Find teacher by email
        print(email)
        resp = supabase.table('Teacher-DB').select('*').eq('email', email).execute()
        print(resp.data)
        data = resp.data if hasattr(resp, 'data') else resp[0]
        print(len(data))
        if not data or len(data) == 0:
            return jsonify({"error": "Invalid email or password"}), 401
        
        teacher = data[0] if isinstance(data, list) else data
        
        # TODO: In production, verify password hash here
        # For now, we just return the teacher if email exists
        
        return jsonify({"message": "Login successful", "teacher": teacher}), 200
    except Exception as e:
        return jsonify({"error": f"Login error: {e}"}), 500

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
        teacher_uid = request.args.get('teacher_uid')
        if teacher_uid:
            resp = supabase.table('Classroom-DB').select('*').eq('teacher_uid', teacher_uid).execute()
        else:
            resp = supabase.table('Classroom-DB').select('*').execute()
        data = resp.data if hasattr(resp, 'data') else resp[0]
        return jsonify({"classrooms": data if data else []})
    except Exception as e:
        return jsonify({"error": f"Supabase error: {e}"}), 500


@app.route('/delete_classroom', methods=['POST', 'DELETE'])
def delete_classroom_route():
    """Delete a classroom by id or join_code. Expects JSON { id } or { join_code } or { classroom_id }."""
    if not USE_SUPABASE or supabase is None:
        return jsonify({"error": "Supabase is not configured"}), 500

    data = request.get_json() or {}
    classroom_id = data.get('id') or data.get('classroom_id')
    join_code = data.get('join_code')

    if not classroom_id and not join_code:
        return jsonify({"error": "id or join_code is required to delete classroom"}), 400

    # Try deleting by a set of possible identifier columns to be robust
    possible_cols = []
    if classroom_id:
        possible_cols = ['id', 'uid', 'join_code']
    else:
        possible_cols = ['join_code', 'id', 'uid']

    last_exc = None
    deleted = False
    deleted_row = None
    for col in possible_cols:
        try:
            val = classroom_id if classroom_id else join_code
            del_resp = supabase.table('Classroom-DB').delete().eq(col, val).execute()
            del_data = del_resp.data if hasattr(del_resp, 'data') else del_resp[0]
            # If backend returns rows deleted, consider success
            if del_data:
                deleted = True
                # del_data may be a list or single row
                deleted_row = del_data[0] if isinstance(del_data, list) and len(del_data) > 0 else del_data
                break
            # Some clients may return empty on success; still treat as success
            # Check by attempting to fetch the row
            fetch_resp = supabase.table('Classroom-DB').select('*').eq(col, val).execute()
            fetch_data = fetch_resp.data if hasattr(fetch_resp, 'data') else fetch_resp[0]
            if not fetch_data or len(fetch_data) == 0:
                deleted = True
                deleted_row = {col: val}
                break
        except Exception as e:
            last_exc = e
            continue

    if not deleted:
        if last_exc:
            return jsonify({"error": f"Supabase error deleting classroom: {last_exc}"}), 500
        return jsonify({"error": "Classroom not found or could not be deleted"}), 404

    return jsonify({"message": "Classroom deleted", "deleted": deleted_row}), 200

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
    try:
        s_resp = supabase.table('Student-DB').select('*').execute()
        out["Students"] = s_resp.data if hasattr(s_resp, 'data') else s_resp[0]
    except Exception as e:
        out["Students"] = {"error": f"Supabase error: {e}"}
    return jsonify(out)


@app.route('/get_students', methods=['GET'])
def get_students_route():
    """Return students for a classroom_code. Query param: classroom_code=<code>"""
    if not USE_SUPABASE or supabase is None:
        return jsonify({"error": "Supabase is not configured"}), 500

    classroom_code = request.args.get('classroom_code')
    if not classroom_code:
        return jsonify({"error": "classroom_code is required"}), 400
    # New relational flow:
    # 1) Find classroom row in Classroom-DB using classroom_code as either classroom_id, join_code or id
    # 2) Read the canonical classroom id from column 'classroom_id'
    # 3) Query Classroom_student-DB where classroom_id matches to get student_uid list
    # 4) Query Student-DB for each student_uid and return requested fields

    try:
        students = fetch_students_for_classroom(classroom_code)
        return jsonify({"students": students}), 200
    except Exception as e:
        return jsonify({"error": f"Supabase error: {e}"}), 500


@app.route('/stream_students', methods=['GET'])
def stream_students_route():
    """Server-Sent Events stream that pushes student roster updates for a classroom.
    Query param: classroom_code
    """
    if not USE_SUPABASE or supabase is None:
        return jsonify({"error": "Supabase is not configured"}), 500

    classroom_code = request.args.get('classroom_code')
    if not classroom_code:
        return jsonify({"error": "classroom_code is required"}), 400

    def event_stream(code):
        try:
            while True:
                students = fetch_students_for_classroom(code)
                payload = json.dumps({"students": students})
                # Always send the payload (heartbeat) so clients receive updates every second
                yield f"data: {payload}\n\n"
                time.sleep(1)
        except GeneratorExit:
            return

    headers = {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'X-Accel-Buffering': 'no'
    }
    return Response(stream_with_context(event_stream(classroom_code)), headers=headers)


@app.route('/debug_roster', methods=['GET'])
def debug_roster_route():
    """Return raw debug info for a classroom: raw Student-DB rows, normalized roster,
    and attempted linking-table query results to help identify schema mismatches.
    Query param: classroom_code
    """
    if not USE_SUPABASE or supabase is None:
        return jsonify({"error": "Supabase is not configured"}), 500

    classroom_code = request.args.get('classroom_code')
    if not classroom_code:
        return jsonify({"error": "classroom_code is required"}), 400

    out = {"requested_classroom_code": classroom_code, "raw_students": None, "normalized_roster": None, "link_table_attempts": []}

    # Raw student rows by classroom_code
    try:
        s_resp = supabase.table('Student-DB').select('*').eq('classroom_code', classroom_code).execute()
        raw_students = s_resp.data if hasattr(s_resp, 'data') else s_resp[0]
        out['raw_students'] = raw_students
    except Exception as e:
        out['raw_students'] = {"error": str(e)}

    # Normalized roster
    try:
        roster = fetch_students_for_classroom(classroom_code)
        out['normalized_roster'] = roster
    except Exception as e:
        out['normalized_roster'] = {"error": str(e)}

    # Try several linking table names and collect results
    possible_link_tables = [
        'Classroom_student-DB', 'Classroom_students-DB', 'Classroom-students-DB',
        'classroom_students', 'classroom_student', 'ClassroomStudent', 'Classroom_Students'
    ]
    possible_class_cols = ['classroom_id', 'classroom', 'class_id', 'classroomId', 'join_code', 'classroom_code']

    # Resolve classroom canonical id if possible
    canonical = None
    try:
        resp = supabase.table('Classroom-DB').select('*').or_(f"classroom_id.eq.{classroom_code},join_code.eq.{classroom_code},id.eq.{classroom_code}").execute()
        data = resp.data if hasattr(resp, 'data') else resp[0]
        if data and len(data) > 0:
            row = data[0] if isinstance(data, list) else data
            canonical = row.get('classroom_id') or row.get('id') or row.get('join_code')
            out['resolved_classroom_row'] = row
    except Exception as e:
        out['resolved_classroom_row'] = {"error": str(e)}

    for tbl in possible_link_tables:
        tbl_entry = {"table": tbl, "queries": []}
        for col in possible_class_cols:
            try:
                q = supabase.table(tbl).select('*').eq(col, canonical if canonical is not None else classroom_code).execute()
                qdata = q.data if hasattr(q, 'data') else q[0]
                tbl_entry['queries'].append({"column": col, "result_count": len(qdata) if isinstance(qdata, list) else (1 if qdata else 0), "sample": (qdata[0] if isinstance(qdata, list) and len(qdata) > 0 else qdata)})
            except Exception as e:
                tbl_entry['queries'].append({"column": col, "error": str(e)})
        out['link_table_attempts'].append(tbl_entry)

    return jsonify(out), 200


@app.route('/get_classroom', methods=['GET'])
def get_classroom_route():
    """Return a single classroom by id or join_code. Query params: id= or join_code="""
    if not USE_SUPABASE or supabase is None:
        return jsonify({"error": "Supabase is not configured"}), 500

    classroom_id = request.args.get('id')
    join_code = request.args.get('join_code')

    if not classroom_id and not join_code:
        return jsonify({"error": "id or join_code is required"}), 400

    try:
        if classroom_id:
            resp = supabase.table('Classroom-DB').select('*').eq('id', classroom_id).execute()
            data = resp.data if hasattr(resp, 'data') else resp[0]
            if data and len(data) > 0:
                return jsonify({"classroom": data[0]}), 200
        if join_code:
            resp = supabase.table('Classroom-DB').select('*').eq('join_code', join_code).execute()
            data = resp.data if hasattr(resp, 'data') else resp[0]
            if data and len(data) > 0:
                return jsonify({"classroom": data[0]}), 200
        return jsonify({"error": "Classroom not found"}), 404
    except Exception as e:
        return jsonify({"error": f"Supabase error: {e}"}), 500

@app.route('/get_teacher_profile', methods=['GET'])
def get_teacher_profile():
    """Get teacher profile by teacher_uid"""
    if not USE_SUPABASE or supabase is None:
        return jsonify({"error": "Supabase is not configured"}), 500
    
    teacher_uid = request.args.get('teacher_uid')
    if not teacher_uid:
        return jsonify({"error": "teacher_uid is required"}), 400
    
    try:
        resp = supabase.table('Teacher-DB').select('*').eq('teacher_uid', teacher_uid).execute()
        data = resp.data if hasattr(resp, 'data') else resp[0]
        
        if not data or len(data) == 0:
            return jsonify({"error": "Teacher not found"}), 404
        
        profile = data[0] if isinstance(data, list) else data
        return jsonify({"profile": profile}), 200
    except Exception as e:
        return jsonify({"error": f"Supabase error: {e}"}), 500

@app.route('/update_teacher_profile', methods=['PUT'])
def update_teacher_profile():
    """Update teacher profile"""
    if not USE_SUPABASE or supabase is None:
        return jsonify({"error": "Supabase is not configured"}), 500
    
    data = request.get_json()
    teacher_uid = data.get('teacher_uid')
    
    if not teacher_uid:
        return jsonify({"error": "teacher_uid is required"}), 400
    
    # Build update object from provided fields
    update_data = {}
    if 'name' in data:
        update_data['name'] = data['name']
    if 'bio' in data:
        update_data['bio'] = data['bio']
    if 'favorite_opening_move' in data:
        update_data['favorite_opening_move'] = data['favorite_opening_move']
    
    if not update_data:
        return jsonify({"error": "No fields to update"}), 400
    
    try:
        # Update the teacher record
        update_resp = supabase.table('Teacher-DB').update(update_data).eq('teacher_uid', teacher_uid).execute()
        
        # Fetch the updated record
        fetch_resp = supabase.table('Teacher-DB').select('*').eq('teacher_uid', teacher_uid).execute()
        fetch_data = fetch_resp.data if hasattr(fetch_resp, 'data') else fetch_resp[0]
        
        if not fetch_data or len(fetch_data) == 0:
            return jsonify({"error": "Teacher not found after update"}), 404
        
        profile = fetch_data[0] if isinstance(fetch_data, list) else fetch_data
        return jsonify({"message": "Profile updated", "profile": profile}), 200
    except Exception as e:
        return jsonify({"error": f"Supabase error: {e}"}), 500
    
@app.route("/create_teacher", methods=["POST"])
def create_teacher_route():
    if not supabase:
        return jsonify({"error": "Supabase not initialized"}), 500

    data = request.get_json()
    is_valid, err = validate_teacher_data(data)
    if not is_valid:
        return jsonify({"error": err}), 400

    try:
        teacher = insert_teacher(data)
        if not teacher:
            return jsonify({"error": "Failed to create teacher"}), 500
        return jsonify({"message": "Teacher created", "teacher": teacher}), 201
    except Exception as e:
        return jsonify({"error": f"Supabase insert error: {e}"}), 500


# --- Run the Flask app ---
if __name__ == '__main__':
    print(f"Template folder: {app.template_folder}")
    print(f"Static folder: {app.static_folder}")
    print(f"Starting server on http://localhost:{PORT}")
    app.run(debug=True, port=8000)
