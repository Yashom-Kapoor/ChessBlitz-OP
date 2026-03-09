from flask import Flask, jsonify, request
from flask_cors import CORS
from dotenv import load_dotenv
from supabase import Client, create_client
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

# ======================== HELPER FUNCTIONS ========================

# -------- PUZZLES --------

# Get random puzzle
def get_random_puzzle():
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
def get_puzzle_by_id(puzzle_id: int):
    try:
        response = (
            supabase
            .table("Puzzles")
            .select("*")
            .eq("PuzzleId", puzzle_id)
            .single()
            .execute()
        )

        return response.data

    except Exception as e:
        print(f"Error fetching puzzle: {e}")
        return None

# Mark puzzle as completed
def record_puzzle_completion(puzzle_id: str, student_id: str, completed: bool):
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

def get_puzzle_attempt(puzzle_id: str, student_id: str):
    ...

def upsert_puzzle_completion(puzzle_id: str, student_id: str, completed: bool):
    ...

def get_student_progress(student_id: str):
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
def get_teacher_profile(teacher_uid):

    res = supabase.table("Users") \
        .select("*") \
        .eq("id", teacher_uid) \
        .single() \
        .execute()

    return res.data

# Update teacher bio by uid
def update_teacher_profile(teacher_uid, bio):

    supabase.table("Users") \
        .update({"bio": bio}) \
        .eq("id", teacher_uid) \
        .execute()

    return True

# -------- CLASSROOM MANAGEMENT --------

# Generate a new classroom code
def generate_classroom_code():

    while True:

        code = ''.join(random.choices(string.ascii_uppercase + string.digits, k=6))

        exists = supabase.table("Classroom-DB") \
            .select("join_code") \
            .eq("join_code", code) \
            .execute()

        if len(exists.data) == 0:
            return code
        
# Create new classroom
def create_classroom(name, teacher_uid):

    code = generate_classroom_code()

    classroom = {
        "name": name,
        "teacher_uid": teacher_uid,
        "join_code": code
    }

    supabase.table("Classroom-DB").insert(classroom).execute()

    return classroom

# Get classrooms by teacher uid
def get_teacher_classrooms(teacher_uid):

    res = supabase.table("Classroom-DB") \
        .select("*") \
        .eq("teacher_uid", teacher_uid) \
        .execute()

    return res.data

# Get classroom by classroom id
def get_classroom(classroom_id):

    res = supabase.table("Classroom-DB") \
        .select("*") \
        .eq("classroom_id", classroom_id) \
        .single() \
        .execute()

    return res.data

# Delete classroom by classroom id
def delete_classroom(classroom_id):

    supabase.table("Classroom-DB") \
        .delete() \
        .eq("classroom_id", classroom_id) \
        .execute()

    return True

# -------- STUDENT CLASSROOM MEMBERSHIP --------

# Enroll a student in a classroom
def join_classroom(student_uid, join_code):

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
def leave_classroom(student_uid):

    supabase.table("Users") \
        .update({"classroom": None}) \
        .eq("id", student_uid) \
        .execute()

    return True

# Student roster
def get_students_in_classroom(classroom_id):

    res = supabase.table("Users") \
        .select("id,name,username,email") \
        .eq("classroom", classroom_id) \
        .execute()

    return res.data

# ======================== FLASK ROUTES ========================

# -------- PUZZLES --------

# Get random puzzle
@app.route("/puzzles/random", methods=["GET"])
def random_puzzle_route():
    puzzle = get_random_puzzle()

    if not puzzle:
        return jsonify({"error": "No puzzles found"}), 404

    return jsonify(puzzle), 200

# Get puzzle by puzzle id
@app.route("/puzzles/<int:puzzle_id>")
def get_puzzle_route(puzzle_id):
    puzzle = get_puzzle_by_id(puzzle_id)

    if puzzle:
        return jsonify(puzzle), 200
    else:
        return jsonify({"error": "Puzzle not found"}), 404
    
# Mark puzzle as completed
@app.route("/puzzles/completed", methods=["POST"])
def completed_puzzle_route():
    data = request.get_json()

    puzzle_id = data.get("puzzleid")
    student_id = data.get("studentid")
    completed = data.get("completed")

    # Basic validation
    if not puzzle_id or not student_id or not isinstance(completed, bool):
        return jsonify({"error": "Missing or invalid parameters"}), 400

    result = record_puzzle_completion(puzzle_id, student_id, completed)

    if not result:
        return jsonify({"error": "Failed to record attempt"}), 500

    return jsonify({
        "message": "Puzzle attempt recorded",
        "data": result
    }), 201

# -------- HINTS (LLM SUBTEAM) --------

# Handle hints
@app.route("/puzzles/<puzzle_id>/hints/<int:move_number>", methods=["GET"])
def gethint(puzzle_id, move_number):
    try:
        puzzle = get_puzzle_by_id(puzzle_id)

        if not puzzle:
            return jsonify({"error": "Puzzle not found"}), 404

        moves = puzzle["moves"].split(" ")

        if move_number <= 0 or move_number > len(moves):
            return jsonify({"error": "Invalid move number"}), 400

        move = moves[move_number - 1]
        fen = puzzle["fen"]  # assuming you're not recalculating move-by-move yet
        player = "white" if " w " in fen else "black"

        hint = generate_hint_with_openrouter(fen, move, player)

        return jsonify({"hint": hint}), 200

    except Exception as e:
        return jsonify({"error": "Something went wrong"}), 500

# -------- TEACHER PROFILE --------

# Return teacher profile
@app.route("/teachers/<teacher_uid>", methods=["GET"])
def route_get_teacher_profile(teacher_uid):

    teacher = get_teacher_profile(teacher_uid)

    return jsonify(teacher)

# Update teacher bio
@app.route("/teachers/<teacher_uid>", methods=["PATCH"])
def route_update_teacher_profile(teacher_uid):

    data = request.json

    bio = data["bio"]

    update_teacher_profile(teacher_uid, bio)

    return jsonify({"status": "updated"})

# -------- CLASSROOM MANAGEMENT --------

# Create a classroom
@app.route("/classrooms", methods=["POST"])
def route_create_classroom():

    data = request.json

    name = data["name"]
    teacher_uid = data["teacher_uid"]

    classroom = create_classroom(name, teacher_uid)

    return jsonify(classroom)

# Get all classrooms owned by a teacher
@app.route("/classrooms/<teacher_uid>", methods=["GET"])
def route_get_classrooms(teacher_uid):

    classrooms = get_teacher_classrooms(teacher_uid)

    return jsonify(classrooms)

# Get a single classroom's info
@app.route("/classrooms/<classroom_id>", methods=["GET"])
def route_get_classroom(classroom_id):

    classroom = get_classroom(classroom_id)

    return jsonify(classroom)

# Delete a classroom
@app.route("/classrooms/<classroom_id>", methods=["DELETE"])
def route_delete_classroom(classroom_id):

    delete_classroom(classroom_id)

    return jsonify({"status": "deleted"})

# -------- STUDENT CLASSROOM MEMBERSHIP --------

# Join a classroom
@app.route("/classrooms/join", methods=["POST"])
def route_join_classroom():

    data = request.json

    student_uid = data["student_uid"]
    join_code = data["join_code"]

    classroom_id = join_classroom(student_uid, join_code)

    if classroom_id is None:
        return jsonify({"error": "Invalid join code"}), 400

    return jsonify({"classroom_id": classroom_id})

# Get students in a classroom
@app.route("/classrooms/<classroom_id>/students", methods=["GET"])
def route_get_students(classroom_id):

    students = get_students_in_classroom(classroom_id)

    return jsonify(students)

if __name__ == "__main__":
    app.run(debug=True)
