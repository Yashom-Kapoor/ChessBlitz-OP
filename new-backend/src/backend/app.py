from flask import Flask, jsonify, request, g
from functools import wraps
from flask_cors import CORS
from dotenv import load_dotenv
from supabase import Client, create_client
import chess
import os
import random
import string
import uuid
import requests

# ======================== SETUP ========================

load_dotenv()

# Load Supabase
SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_KEY")
supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)

# Load OpenRouter
OPENROUTER_API_KEY = os.getenv("OPENROUTER_API_KEY")
OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions"

app = Flask(__name__)
CORS(app)
# ======================== AUTHORIZATION ========================
# Extract JWT from header
def extract_header_JWT(request):
    auth = request.headers.get("Authorization")
    token_JWT = auth.split(" ")[1] if auth else None
    return token_JWT

# Make a new supabase client scoped to the user's JWT (for RLS)
def new_user_JWT(token_JWT: str):
    client = create_client(SUPABASE_URL, SUPABASE_KEY)
    client.postgrest.auth(token_JWT)
    return client

# Decorator: verify JWT, attach user_id to g, return 401 if invalid/missing
def require_auth(f):
    @wraps(f)
    def decorated(*args, **kwargs):
        token = extract_header_JWT(request)
        if not token:
            print("[auth] FAIL: no token in header")
            return jsonify({"error": "Missing authorization token"}), 401
        try:
            user_response = supabase.auth.get_user(token)
            g.user_id = user_response.user.id
            print(f"[auth] OK: user_id={g.user_id}")
        except Exception as e:
            print(f"[auth] FAIL: token present but verification failed — {e}")
            return jsonify({"error": "Invalid or expired token"}), 401
        return f(*args, **kwargs)
    return decorated

# ======================== HELPER FUNCTIONS ========================

# -------- PUZZLES --------

# Get random puzzle
def get_random_puzzle(supabase):
    try:
        ids_res = supabase.table("Puzzles").select("puzzleid").execute()
        ids = [p["puzzleid"] for p in ids_res.data]
        chosen_id = random.choice(ids)

        puzzle_res = supabase.table("Puzzles").select("*").eq("puzzleid", chosen_id).execute()
        return puzzle_res.data[0]
    
    except Exception as e:
        print(f"Error fetching random puzzle: {e}")
        return None

# Get puzzle by puzzle id
def get_puzzle_by_id(puzzle_id: int, supabase):
    try:
        response = (
            supabase
            .table("Puzzles")
            .select("*")
            .eq("puzzleid", puzzle_id)
            .single()
            .execute()
        )

        return response.data

    except Exception as e:
        print(f"Error fetching puzzle: {e}")
        return None

# Mark puzzle as completed
def record_puzzle_completion(puzzle_id: str, student_id: str, completed: bool, supabase):
    try:
        response = (
            supabase
            .table("Puzzle_Attempts")
            .insert({
                "puzzleid": puzzle_id,
                "studentid": student_id,
                "completed": completed
            })
            .execute()
        )

        return response.data[0] if response.data else None

    except Exception as e:
        print(f"Error recording puzzle attempt: {e}")
        return None

def get_puzzle_attempt(puzzle_id: str, student_id: str, supabase):
    ...

def upsert_puzzle_completion(puzzle_id: str, student_id: str, completed: bool, supabase):
    ...

def get_student_progress(student_id: str, supabase):
    ...

# -------- HINTS (LLM SUBTEAM) --------

# Handle hints
def generate_hint_with_openrouter(fen: str, move: str, player: str, model: str = "openai/gpt-4o-mini"):
    headers = {
        "Authorization": f"Bearer {OPENROUTER_API_KEY}",
        "Content-Type": "application/json",
    }

    payload = {
        "model": model,
        "temperature": 0.7,
        "max_tokens": 300,
        "messages": [
            {
                "role": "system",
                "content": (
                    "You are a chess tutor. Do not give the best move explicitly. "
                    "Guide the student toward discovering it themselves. "
                    "Be brief (max two lines)."
                ),
            },
            {
                "role": "user",
                "content": (
                    f"In the position: {fen}. "
                    f"It is {player}'s move. "
                    f"The best move is {move}. "
                    f"Provide a subtle but helpful hint."
                ),
            },
        ],
    }

    response = requests.post(OPENROUTER_URL, headers=headers, json=payload)

    if response.status_code != 200:
        return "No explanation available."

    data = response.json()
    return data["choices"][0]["message"]["content"]

# -------- TEACHER PROFILE --------

# Get teacher profile by uid
def get_teacher_profile(teacher_uid, supabase):

    res = supabase.table("Users") \
        .select("*") \
        .eq("id", teacher_uid) \
        .single() \
        .execute()

    return res.data

# Update teacher bio by uid
def update_teacher_profile(teacher_uid, bio, supabase):

    supabase.table("Users") \
        .update({"bio": bio}) \
        .eq("id", teacher_uid) \
        .execute()

    return True

# -------- CLASSROOM MANAGEMENT --------

# Generate a new classroom code
def generate_classroom_code(supabase):

    while True:

        code = ''.join(random.choices(string.ascii_uppercase + string.digits, k=6))

        exists = supabase.table("Classroom-DB") \
            .select("join_code") \
            .eq("join_code", code) \
            .execute()

        if len(exists.data) == 0:
            return code
        
# Create new classroom
def create_classroom(name, teacher_uid, supabase):

    code = generate_classroom_code()

    classroom = {
        "name": name,
        "teacher_uid": teacher_uid,
        "join_code": code
    }

    supabase.table("Classroom-DB").insert(classroom).execute()

    return classroom

# Get classrooms by teacher uid
def get_teacher_classrooms(teacher_uid, supabase):

    res = supabase.table("Classroom-DB") \
        .select("*") \
        .eq("teacher_uid", teacher_uid) \
        .execute()

    return res.data

# Get classroom by classroom id
def get_classroom(classroom_id, supabase):

    res = supabase.table("Classroom-DB") \
        .select("*") \
        .eq("classroom_id", classroom_id) \
        .single() \
        .execute()

    return res.data

# Delete classroom by classroom id
def delete_classroom(classroom_id, supabase):

    supabase.table("Classroom-DB") \
        .delete() \
        .eq("classroom_id", classroom_id) \
        .execute()

    return True

# -------- STUDENT CLASSROOM MEMBERSHIP --------

# Enroll a student in a classroom
def join_classroom(student_uid, join_code, supabase):

    classroom = supabase.table("Classroom-DB") \
        .select("*") \
        .eq("join_code", join_code) \
        .single() \
        .execute()

    if classroom.data is None:
        return None

    classroom_id = classroom.data["classroom_id"]

    supabase.table("Users") \
        .update({"classroom": classroom_id}) \
        .eq("id", student_uid) \
        .execute()

    return classroom_id

# Unenroll student from classroom
def leave_classroom(student_uid, supabase):

    supabase.table("Users") \
        .update({"classroom": None}) \
        .eq("id", student_uid) \
        .execute()

    return True

# Student roster
def get_students_in_classroom(classroom_id,supabase):

    res = supabase.table("Users") \
        .select("user_id,name,username,email") \
        .eq("classroom", classroom_id) \
        .execute()

    return res.data

# -------- LEADERBOARD (RANKINGS) --------
# Get Rankings by Elo
def get_rankings_by_elo(classroom_id, supabase):
    res = supabase.table("Users") \
        .select("user_id,name,username,rating") \
        .eq("classroom", classroom_id) \
        .order("rating", desc=True) \
        .execute()

    return res.data

# Get Rankings by # Puzzles completed
def get_rankings_by_puzzles_complete(classroom_id, supabase):
    res = supabase.table("Users") \
        .select("user_id,name,username,puzzles_completed") \
        .eq("classroom", classroom_id) \
        .order("puzzles_completed", desc=True) \
        .execute()

    return res.data

# -------- SHOP MANAGEMENT --------
def get_shop_data(student_id):
    resp = supabase.table('Shop').select('*').eq('student_id', student_id).execute()
    return resp.data

# ======================== FLASK ROUTES ========================

# -------- PUZZLES --------

# Get random puzzle
@app.route("/puzzles/random/", methods=["GET"])
@require_auth
def random_puzzle_route():
    token = extract_header_JWT(request)
    supabase = new_user_JWT(token)
    puzzle = get_random_puzzle(supabase)

    if not puzzle:
        return jsonify({"error": "No puzzles found"}), 404

    return jsonify(puzzle), 200

# Get puzzle by puzzle id
@app.route("/puzzles/<puzzle_id>/", methods=["GET"])
@require_auth
def get_puzzle_route(puzzle_id):
    token = extract_header_JWT(request)
    supabase = new_user_JWT(token)
    puzzle = get_puzzle_by_id(puzzle_id, supabase)

    if puzzle:
        return jsonify(puzzle), 200
    else:
        return jsonify({"error": "Puzzle not found"}), 404
    
# Mark puzzle as completed
@app.route("/puzzles/completed", methods=["POST"])
@require_auth
def completed_puzzle_route():
    token = extract_header_JWT(request)
    supabase = new_user_JWT(token)
    data = request.get_json()

    puzzle_id = data.get("puzzleid")
    student_id = data.get("studentid")
    completed = data.get("completed")

    # Basic validation
    if not puzzle_id or not student_id or not isinstance(completed, bool):
        return jsonify({"error": "Missing or invalid parameters"}), 400

    result = record_puzzle_completion(puzzle_id, student_id, completed, supabase)

    if not result:
        return jsonify({"error": "Failed to record attempt"}), 500

    return jsonify({
        "message": "Puzzle attempt recorded",
        "data": result
    }), 201

# -------- LESSONS (CONTENT SUBTEAM) -------- THIS WHOLE BLACK IS OLD AND TEMPORARY, JUST FOR TESTING PURPOSES.
    
lessons = [
    {
        'id': 1,
        'name': 'Introduction to Chess',
        'desc': 'Learn the basics of chess, including piece movements and rules.',
        'content': 'Chess is a two-player strategy board game played on a checkered board...',
        'icon': 'default'
    },
    {
        'id': 2,
        'name': 'Opening Principles',
        'desc': 'Understand the fundamental principles of chess openings.',
        'content': 'In the opening phase of chess, it is important to control the center...',
        'icon': 'default'
    },
    {
        'id': 3,
        'name': 'Basic Tactics',
        'desc': 'Learn essential chess tactics like forks, pins, and skewers.',
        'content': 'Tactics are short-term tactical patterns that can be used to gain an advantage in a game of chess.',
        'icon': 'default'
    },
    {
        'id': 4,
        'name': 'Endgame Strategies',
        'desc': 'Master key endgame concepts and techniques.',
        'content': 'The endgame is the final phase of a chess game where there are few pieces left on the board...',
        'icon': 'default'
    },
    {
        'id': 5,
        'name': 'Advanced Tactics',
        'desc': 'Explore advanced tactical motifs and combinations.',
        'content': 'Advanced tactics involve more complex patterns and combinations that can lead to decisive advantages...',
        'icon': 'default'
    },
    {
        'id': 6,
        'name': 'Positional Play',
        'desc': 'Learn how to improve your position and control key squares.',
        'content': 'Positional play focuses on long-term strategic advantages rather than immediate tactical gains...',
        'icon': 'default'
    },
    {
        'id': 7,
        'name': 'Pawn Structures',
        'desc': 'Understand different pawn structures and their implications.',
        'content': 'Pawn structures play a crucial role in determining the strategic plans for both sides...',
        'icon': 'default'
    },
    {
        'id': 8,
        'name': 'lesson 8',
        'desc': 'Understand different pawn structures and their implications.',
        'content': 'Pawn structures play a crucial role in determining the strategic plans for both sides...',
        'icon': 'default'
    },
]

# Get all lessons
@app.route('/lessons', methods=['GET'])
def get_lessons():
    return jsonify(lessons)

# Get a specific lesson by name
@app.route('/lessons/<string:lesson_name>', methods=['GET'])
def get_lesson(lesson_name):
    lesson = next((l for l in lessons if l['name'] == lesson_name), None)
    if lesson:
        return jsonify(lesson)
    return jsonify({'error': 'Lesson not found'}), 404

# Create a new lesson            
@app.route('/lessons', methods=['POST'])
def create_lesson():
    data = request.get_json()
    new_lesson = {
        'id': lessons[-1]['id'] + 1 if lessons else 1,
        'name': data.get('name'),
        'desc': data.get('desc'),
        'content': data.get('content'),
        'icon': data.get('icon')
    }
    lessons.append(new_lesson)
    return jsonify(new_lesson), 201

# Update a lesson
@app.route('/lessons/<string:lesson_name>', methods=['PUT'])
def update_lesson(lesson_name):
    data = request.get_json()
    lesson = next((l for l in lessons if l['name'] == lesson_name), None)
    if lesson:
        lesson['name'] = data.get('name', lesson['name'])
        lesson['desc'] = data.get('desc', lesson['desc'])
        lesson['content'] = data.get('content', lesson['content'])
        lesson['icon'] = data.get('icon', lesson['icon'])
        return jsonify(lesson)
    return jsonify({'error': 'Lesson not found'}), 404

# Delete a lesson             
@app.route('/lessons/<string:lesson_name>', methods=['DELETE'])
def delete_lesson(lesson_name):
    global lessons
    lessons = [l for l in lessons if l['name'] != lesson_name]
    return jsonify({'message': 'Lesson deleted'}), 200

# -------- HINTS (LLM SUBTEAM) --------

# Handle hints
@app.route("/puzzles/<puzzle_id>/hints/<int:move_number>", methods=["GET"])
@require_auth
def gethint(puzzle_id, move_number):
    token = extract_header_JWT(request)
    supabase = new_user_JWT(token)
    try:
        puzzle = get_puzzle_by_id(puzzle_id, supabase)

        if not puzzle:
            return jsonify({"error": "Puzzle not found"}), 404

        moves = puzzle["moves"].split(" ")

        if move_number <= 0 or move_number > len(moves):
            return jsonify({"error": "Invalid move number"}), 400

        # Recalculate the board position right before the requested move.
        board = chess.Board(puzzle["fen"])
        for uci_move in moves[:move_number - 1]:
            board.push(chess.Move.from_uci(uci_move))

        uci_move = moves[move_number - 1]
        move = board.san(chess.Move.from_uci(uci_move))  # Convert to algebraic notation
        fen = board.fen()
        player = "white" if board.turn == chess.WHITE else "black"

        hint = generate_hint_with_openrouter(fen, move, player)

        return jsonify({"hint": hint}), 200

    except Exception as e:
        return jsonify({"error": "Something went wrong"}), 500

# -------- TEACHER PROFILE --------

# Return teacher profile
@app.route("/teachers/<teacher_uid>", methods=["GET"])
@require_auth
def route_get_teacher_profile(teacher_uid):
    token = extract_header_JWT(request)
    supabase = new_user_JWT(token)
    teacher = get_teacher_profile(teacher_uid, supabase)

    return jsonify(teacher)

# Update teacher bio
@app.route("/teachers/<teacher_uid>", methods=["PATCH"])
@require_auth
def route_update_teacher_profile(teacher_uid):
    token = extract_header_JWT(request)
    supabase = new_user_JWT(token)
    data = request.json

    bio = data["bio"]

    update_teacher_profile(teacher_uid, bio, supabase)

    return jsonify({"status": "updated"})

# -------- CLASSROOM MANAGEMENT --------

# Create a classroom
@app.route("/classrooms", methods=["POST"])
@require_auth
def route_create_classroom():
    token = extract_header_JWT(request)
    supabase = new_user_JWT(token)
    data = request.json

    name = data["name"]
    teacher_uid = data["teacher_uid"]

    classroom = create_classroom(name, teacher_uid, supabase)

    return jsonify(classroom)

# Get all classrooms owned by a teacher
@app.route("/classrooms/<teacher_uid>", methods=["GET"])
@require_auth
def route_get_classrooms(teacher_uid):
    token = extract_header_JWT(request)
    supabase = new_user_JWT(token)
    classrooms = get_teacher_classrooms(teacher_uid, supabase)

    return jsonify(classrooms)

# Get a single classroom's info
@app.route("/classrooms/<classroom_id>", methods=["GET"])
@require_auth
def route_get_classroom(classroom_id):
    token = extract_header_JWT(request)
    supabase = new_user_JWT(token)
    classroom = get_classroom(classroom_id, supabase)

    return jsonify(classroom)

# Delete a classroom
@app.route("/classrooms/<classroom_id>", methods=["DELETE"])
@require_auth
def route_delete_classroom(classroom_id):
    token = extract_header_JWT(request)
    supabase = new_user_JWT(token)
    delete_classroom(classroom_id, supabase)

    return jsonify({"status": "deleted"})

# -------- STUDENT CLASSROOM MEMBERSHIP --------

# Join a classroom
@app.route("/classrooms/join", methods=["POST"])
@require_auth
def route_join_classroom():
    token = extract_header_JWT(request)
    supabase = new_user_JWT(token)
    data = request.json

    student_uid = data["student_uid"]
    join_code = data["join_code"]

    classroom_id = join_classroom(student_uid, join_code, supabase)

    if classroom_id is None:
        return jsonify({"error": "Invalid join code"}), 400

    return jsonify({"classroom_id": classroom_id})

# Get students in a classroom
@app.route("/classrooms/<classroom_id>/students", methods=["GET"])
@require_auth
def route_get_students(classroom_id):
    token = extract_header_JWT(request)
    supabase = new_user_JWT(token)
    students = get_students_in_classroom(classroom_id, supabase)

    return jsonify(students)

# -------- LEADERBOARD MANAGEMENT --------
# Get students in a classroom
@app.route("/leaderboards/<classroom_id>/<sorting_method>", methods=["GET"])
@require_auth
def route_get_students_with_ordering(classroom_id, sorting_method:str):
    token = extract_header_JWT(request)
    supabase = new_user_JWT(token)
    if sorting_method:
        if sorting_method.lower() == "elo":
            students = get_rankings_by_elo(classroom_id, supabase)
        elif sorting_method.lower() == "puzzles_completed":
            students = get_rankings_by_puzzles_complete(classroom_id, supabase)
        else:
            students = get_rankings_by_elo(classroom_id, supabase)
    else:
        students = get_rankings_by_elo(classroom_id, supabase)
   
    return jsonify(students)

# -------- SHOP MANAGEMENT --------
@app.route("/get_shop_data/<student_id>", methods=["GET"])
def get_shop_data_route(student_id):
    data = get_shop_data(student_id)
    return jsonify(data), 200

def main():
    #app.run(debug=False, host='0.0.0.0', port=int(os.getenv("PORT", 5000)))
    app.run(debug=True)

if __name__ == "__main__":
    main()

