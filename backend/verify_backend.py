import requests
import json
import uuid

url = "http://127.0.0.1:8000/user/profile/update"
headers = {"Content-Type": "application/json"}
test_uid = str(uuid.uuid4())
data = {
    "teacher_uid": test_uid,
    "updates": {
        "name": "Test Teacher",
        "email": "teacher@example.com"
        # Note: bio and favorite_opening_move would go here once added to schema
    }
}

try:
    response = requests.post(url, headers=headers, json=data)
    print(f"Status Code: {response.status_code}")
    print(f"Response: {response.text}")
except Exception as e:
    print(f"Error: {e}")
