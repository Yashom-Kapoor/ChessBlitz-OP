from flask import Flask, jsonify, request
from flask_cors import CORS
from dotenv import load_dotenv
from supabase import Client, create_client
import os
import random
import requests

# === SETUP ===

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

# === FUNCTIONS ===

# Get random puzzle
def get_random_puzzle():
    try:
        response = (
            supabase
            .table("Puzzle-DB")
            .select("*")
            .execute()
        )

        if not response.data:
            return None

        return random.choice(response.data)

    except Exception as e:
        print(f"Error fetching random puzzle: {e}")
        return None    

# Get puzzle by puzzle id
def get_puzzle_by_id(puzzle_id: int):
    try:
        response = (
            supabase
            .table("Puzzle-DB")
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

# Find user by userid
def get_user_by_id(user_id: str):
    ...
    
# Create new user
def create_user(email: str, role: str):
    ...

# Get user role (student, teacher)
def get_user_role(user_id: str):
    ...

# Create new classroom
def create_classroom(name: str, teacher_id: str):
    ...

# Get classroom by classroom id
def get_classroom_by_id(classroom_id: str):
    ...

# Get all classrooms for a teacher
def get_classrooms_for_teacher(teacher_id: str):
    ...

# Add student to classroom
def add_student_to_classroom(classroom_id: str, student_id: str):
    ...

# Remove student from classroom
def remove_student_from_classroom(classroom_id: str, student_id: str):
    ...

# Get all students in a classroom
def get_students_in_classroom(classroom_id: str):
    ...

# Get classroom by student
def get_classrooms_for_student(student_id: str):
    ...


# === ROUTES ===

# Get random puzzle
@app.route("/puzzles/random", methods=["GET"])
def random_puzzle_route():
    puzzle = get_random_puzzle()

    if not puzzle:
        return jsonify({"error": "No puzzles found"}), 404

    return jsonify(puzzle), 200

# Get puzzle by puzzle id
@app.route("/puzzles/<puzzle_id:int")
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

if __name__ == "__main__":
    app.run(debug=True)

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

