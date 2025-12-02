This file explains the **root (`/`) route** of our backend, what it does, and how you can build on top of it. Think of it as the “home screen” of the API — if you hit it in a browser or with `curl`, it gives you a quick snapshot of everything that’s currently alive in the backend and how to navigate it.

---

## Root Route Overview

### Code:
```python
@app.get("/")
def root():
    """Returns the base api endpoints and how to run the other routes"""
    return {
        "app": "Chess Hint API",
        "version": "1.0.0",
        "status": "running",
        "endpoints": {
            "random puzzle": "/puzzles/random",
            "get best move with LLM": "/puzzles/<puzzle_id>/best-moves/<int:move_number>",
            "hints": "/puzzles/<puzzle_id>/hints/<int:move_number>"
        }
    }
```

### What It Does:
- Returns **metadata** about the backend (name, version, and status).  
- Lists all **available endpoints** so you can quickly verify what’s working.  
- Useful for checking whether the server is up without touching the database or external APIs.  
- When you deploy, this acts as the **health check endpoint** for uptime monitoring.

---

## API Summary

- **Method:** `GET`
- **Purpose:** Returns the list of endpoints and backend status.  
- **Example call:**
  ```bash
  curl http://127.0.0.1:5000/
  ```
- **Example response:**
  ```json
  {
    "app": "Chess Hint API",
    "version": "1.0.0",
    "status": "running",
    "endpoints": {
      "random puzzle": "/puzzles/random",
      "get best move with LLM": "/puzzles/<puzzle_id>/best-moves/<int:move_number>",
      "hints": "/puzzles/<puzzle_id>/hints/<int:move_number>"
    }
  }
  ```

---

## Frontend Implementation Notes

1. **Always ping `/` first** on startup or refresh — if `status isn't "running"`, show an error UI or disable hint requests.
2. **Dynamic Routes:**
   - When you see `<puzzle_id>` or `<int:move_number>`, the frontend should replace them dynamically.
   - Example:  
     `/puzzles/1234/hints/2` → get a hint for move #2 of puzzle #1234.

---

### TL;DR for Frontend Devs
Ping `/` → check health → use listed endpoints dynamically.  
If something breaks, the root route is your first debug stop.

