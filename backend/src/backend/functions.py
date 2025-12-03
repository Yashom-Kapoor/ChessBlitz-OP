import pyrebase
from pyrebase.pyrebase import Database, Auth
import random
from typing import Dict, Any, Tuple, List
import time
import re
import chess
import chess.engine
from datetime import datetime, time, timedelta
from flask import jsonify

def fetch_puzzle(db: Database, puzzle_id: str) -> Dict[str, Any]:
    """Fetches puzzle id from Firebase Database with specified puzzle_id"""
    return db.child("puzzles").child(puzzle_id).get().val()

def fetch_random_puzzle(db: Database) -> Dict[str, Any]:
    """Fetches a random puzzle from Firebase Database"""
    puzzle_ids = fetch_puzzle_ids(db)
    random_puzzle_id = random.choice(puzzle_ids)

    result = fetch_puzzle(db, random_puzzle_id)
    result['ID'] = random_puzzle_id
    return result

def fetch_puzzle_ids(db: Database) -> List[str]:
    """fetches a list of puzzle ids"""
    return list(db.child("puzzles").shallow().get().val())

def validate_puzzle_id(db: Database, puzzle_id: str) -> Tuple[bool, str]:
    """Validates if the input arguments from the frontend are valid parameters for a puzzle in the database"""
    assert type(db) == Database

    if type(puzzle_id) != str:
        return False, "Puzzle ID must be of type string"
    if len(puzzle_id) != 5:
        return False, "Malformed Puzzle ID input"

    puzzle_ids = fetch_puzzle_ids(db)
    if puzzle_id not in puzzle_ids:
        return False, "Puzzle ID does not exist in the Database"

    return True, ""

def validate_puzzle_move(moves: List[str], move_number: int) -> Tuple[bool, str]:
    """Validates if the move_number is valid for the specified puzzle"""
    if type(move_number) != int:
        return False, "Invalid Move Number, not of type int"
    if move_number-1 < 0:
        return False, "Invalid Move Number, must be greater than or equal to 0"
    if move_number-1 >= len(moves):
        return False, "Invalid Move Number, must be less than length of puzzle"
    return True, ""

def validate_puzzle(puzzle: Dict[str, Any]) -> bool:
    """Validates if a puzzle is a valid puzzle"""
    if puzzle is None:
        return False
    return True

def validate_email(email: str) -> Tuple[bool, str]:
    """Validates if the email is in the correct format"""
    if type(email) != str:
        return False, "Email must be of type string"
    if len(email) < 5 or "@" not in email:
        return False, "Malformed Email input"
    return True, ""

def validate_password(password: str) -> Tuple[bool, str]:
    """Validates if the password is in the correct format"""
    if type(password) != str:
        return False, "Password must be of type string"
    if len(password) < 6:
        return False, "Password must be at least 6 characters long"
    if not re.search(r"\d+", password):
        return False, "Password must contain at least one digit"
    return True, ""

# Sign in function
def sign_in(auth: Auth, email: str, password: str) -> Tuple[Dict[str, Any], str]:
    try:
        user = auth.sign_in_with_email_and_password(email, password)
        message = f"Signed in successfully: {user}"
        return user, message
    except Exception as e:
        message = f"Error: {e}"
        return None, message
    
# Sign-up function
def sign_up(auth: Auth, email: str, password: str) -> Tuple[Dict[str, Any], str]:
    try:
        user = auth.create_user_with_email_and_password(email, password)
        message = f"User created successfully: {user}"
        return user, message
    except Exception as e:
        message = f"Error: {e}"
        return None, message
    
def sign_up_page(db, userid: str, name: str, username: str, country: str) -> Tuple[Dict[str, Any], int]:
    try:
        user_data = {
            "name": name,
            "username": username,
            "country": country,
            "friends": [],
            "community": ["chess"],
            "rating": 1000,
            "attempted": 0,
            "solved": 0,
            "streaks": 0,
            "last_solved_date": None
        }

        db.child("users").child(userid).set(user_data)

        time.sleep(5)  # Ensure Firebase has time to update
        user_record = db.child("users").child(userid).get().val()
        if user_record:
            message = f"User created successfully: {user_record['username']}"
            return jsonify({"message": message, "user": user_record}), 201
        else:
            return jsonify({"message": "User creation failed"}), 400
    except Exception as e:
        return jsonify({"error": f"Error signing up: {e}"}), 500
    
def add_friends(db: Database, userid: str, friendid: str) -> Tuple[Dict[str, Any], int]:
    try:
        user = db.child("users").child(userid).get().val()
        friend = db.child("users").child(friendid).get().val()

        if not user:
            return jsonify({"error": "User not found"}), 400
        if not friend: 
            return jsonify({"error": "Friend not found"}), 400
        
        friendlist = db.child("users").child(userid).child("friends").get().val() or {}
        if friendid in friendlist:
            return jsonify({"message": "Already friends!"}), 400
        
        db.child("users").child(userid).child("friends").update({friendid: True})
        db.child("users").child(friendid).child("friends").update({userid: True})

        return jsonify({"message": f"Friend added successfully: {friend['username']}"}), 200
    
    except Exception as e:
        return jsonify({"error": f"Error adding friend: {e}"}), 500

def join_community(db: Database, userid: str, community_name: str) -> Tuple[Dict[str, Any], int]:
    try:
        # Get user
        user = db.child("users").child(userid).get().val()
        if not user:
            return jsonify({"error": "User not found"}), 400

        # Add community to user's profile if not already present
        current_communities = set(user.get("community", []))
        if community_name not in current_communities:
            current_communities.add(community_name)
            db.child("users").child(userid).update({"community": list(current_communities)})

        # Add user to the community node in Firebase
        community_members = db.child("communities").child(community_name).child("members").get().val() or {}
        if userid not in community_members:
            db.child("communities").child(community_name).child("members").update({userid: True})

        return jsonify({"message": f"{user['username']} joined community '{community_name}'"}), 200
    except Exception as e:
        return jsonify({"error": f"Error joining community: {e}"}), 500

def get_fen(fen: str, moves: list, move: int) -> str:
   """
   Returns the fen after move number of specified moves from the moves list applied to the original fen

   Parameters:
   - fen (str): current fen
   - moves (list): a list of moves to apply to the fen
   - move (int): the number of moves into the puzzle

   Returns:
       str: the fen after the moves have been applied
   """
   temp_fen = fen
   for i in range(0, move):
       current_move = moves[i]
       temp_fen = update_fen(temp_fen, current_move)
   return temp_fen


def update_fen(fen: str, move: str) -> str:
   """
   Update a FEN string with a given move in UCI format.


   Parameters:
   - fen (str): The FEN string of the current board position.
   - move (str): The move in UCI format (e.g., "e2e4", "e7e8q").


   Returns:
   - str: The updated FEN string after the move.
   """
   board = chess.Board(fen)
   uci_move = chess.Move.from_uci(move)


   #if uci_move not in board.legal_moves:
   #    raise ValueError(f"Illegal move: {move}")


   board.push(uci_move)
   return board.fen()

def get_current_player(fen: str) -> str:
    """ 
    Gets the current player of a game defined by an input fen string

    Parameters:
    - fen (str): current fen

    Returns:
    - str: The current player
    """
    board = chess.Board(fen)

    return "white" if board.turn else "black"

def get_principal_variation(fen: str, engine_path: str) -> list:
    """returns a list of best moves"""
    board = chess.Board(fen)
    try:
        with chess.engine.SimpleEngine.popen_uci(engine_path) as engine:
            info = engine.analyse(board, chess.engine.Limit(time=0.1))
            return info.get("pv", [])
    except Exception as e:
        return [f"Engine error: {e}"]
    
    
def get_score(fen: str, engine_path: str) -> str:
    """returns a score object"""
    board = chess.Board(fen)
    try:
        with chess.engine.SimpleEngine.popen_uci(engine_path) as engine:
            info = engine.analyse(board, chess.engine.Limit(time=0.1))
            return info["score"]
    except Exception as e:
        return f"Engine error: {e}"

def get_info(fen: str, engine_path: str) -> dict:
    """gets all the board info"""
    board = chess.Board(fen)
    try:
        with chess.engine.SimpleEngine.popen_uci(engine_path) as engine:
            return engine.analyse(board, chess.engine.Limit(time=0.1))
    except Exception as e:
        return {"error": f"Engine error: {e}"}

def update_streaks(db: Database, userid: str, puzzleid: str, correct: bool) -> None:
    """Updates the streaks of a user"""
    user_ref = db.child("users").child(userid)
    user_data = user_ref.get().val()   
    
    if not correct:
        return   
    
    current_date = datetime.now().date()
    streaks = user_data.get("streaks")
    last_solved_date = user_data.get("last_solved_date")   
    
    if last_solved_date == current_date:
        return
    if last_solved_date and last_solved_date + timedelta(days=1) == current_date:
        streaks += 1
    else:
        streaks = 1   

    user_ref.update({
        "streaks": streaks,
        "last_solved_date": current_date
    })

def update_rating(db, user_id: str, puzzle_rating: int, correct: bool) -> dict:
    '''Updates the rating of a user'''
    user_ref = db.child("users").child(user_id)
    user_data = user_ref.get().val()

    # Defaults
    current_rating = user_data.get("rating", 1200)
    attempted = user_data.get("attempted", 0)
    solved = user_data.get("solved", 0)

    # Compute expected score using Elo formula
    expected_score = 1 / (1 + 10 ** ((puzzle_rating - current_rating) / 400))
    actual_score = 1.0 if correct else 0.0

    # Dynamic K-factor (optional: decrease as experience grows)
    k = 32 if attempted < 30 else 16

    # New rating
    new_rating = current_rating + k * (actual_score - expected_score)
    new_rating = round(new_rating)

    # Update stats
    attempted += 1
    if correct:
        solved += 1

    # Write back to Firebase
    user_ref.update({
        "rating": new_rating,
        "attempted": attempted,
        "solved": solved
    })

    return {
        "new_rating": new_rating,
        "attempted": attempted,
        "solved": solved,
        "delta": round(k * (actual_score - expected_score), 2)
    }

def global_leaderboard(db, limit=25):
    '''Returns a global leaderboard of players'''
    # Get all users from Firebase
    users_data = db.child("users").get().val()
    
    # If no users are there
    if not users_data:
        return []

    # Convert to list and sort by rating
    sorted_rating = sorted(
        users_data.items(),
        key=lambda item: item[1].get("rating", 0),  # Default rating if missing
        reverse=True
    )

    # Leaderboard with limited number of top users
    leaderboard = []
    for user_id, user_info in sorted_rating[:limit]:
        leaderboard.append({
            "userid": user_id,
            "username": user_info.get("username", "Unknown"),
            "rating": user_info.get("rating", 0),
            "country": user_info.get("country", "N/A"),
            "streaks": user_info.get("streaks", 0)
        })

    return leaderboard

def community_leaderboard(db: Database, community_name: str, limit: int = 25) -> List[Dict[str, Any]]:
    '''Returns a community leaderboard'''
    try:
        members = db.child("communities").child(community_name).child("members").get().val()
        if not members:
            return []

        leaderboard = []
        for uid in members:
            user_data = db.child("users").child(uid).get().val()
            if user_data:
                leaderboard.append({
                    "userid": uid,
                    "username": user_data.get("username", "Unknown"),
                    "rating": user_data.get("rating", 0),
                    "country": user_data.get("country", "N/A"),
                    "streaks": user_data.get("streaks", 0)
                })

        sorted_leaderboard = sorted(leaderboard, key=lambda x: x["rating"], reverse=True)
        return sorted_leaderboard[:limit]
    except Exception as e:
        return [{"error": f"Failed to get community leaderboard: {e}"}]

def friends_leaderboard(db: Database, userid: str, limit: int = 25) -> List[Dict[str, Any]]:
    '''Returns a friends leaderboard'''
    try:
        user = db.child("users").child(userid).get().val()
        if not user or "friends" not in user:
            return []

        friends_dict = user.get("friends", {})
        leaderboard = []

        for friend_id in friends_dict:
            friend_data = db.child("users").child(friend_id).get().val()
            if friend_data:
                leaderboard.append({
                    "userid": friend_id,
                    "username": friend_data.get("username", "Unknown"),
                    "rating": friend_data.get("rating", 0),
                    "country": friend_data.get("country", "N/A"),
                    "streaks": friend_data.get("streaks", 0)
                })

        sorted_leaderboard = sorted(leaderboard, key=lambda x: x["rating"], reverse=True)
        return sorted_leaderboard[:limit]
    except Exception as e:
        return [{"error": f"Failed to get friends leaderboard: {e}"}]

#Rating

def deltaRating(currentRating, puzzleRating, num_solved, solved):
  '''
  currentRating = student current rating
  puzzleRating = how hard the puzzle is
  num_solved = number_solved
  solved = 0/1 if they solved the puzzle
  deltaMax = max amount of change
  shapeOfDecay = how much the deltaRating changes as the student progresses
  '''

  deltaMax = 100
  shapeOfDecay = 2
  Kmin = 12 #Learning Rate
  Kmax = 75 #Learning Rates
  k = Kmin + (Kmax - Kmin) * (1/(1+num_solved)) ** shapeOfDecay

  expected = 1 / (1 + 10 ** ((puzzleRating - currentRating) / 400))

  delta = k * (solved - expected)
  delta = max(-deltaMax, min(delta, deltaMax))

  return delta