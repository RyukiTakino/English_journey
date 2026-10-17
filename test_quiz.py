import requests

url = "http://127.0.0.1:5000/api/quiz"

data = {
    "title": "Australian cuisine",
    "content": """
    Australian cuisine includes food traditions from Indigenous
    Australians and influences from many cultures around the world.
    """
}

response = requests.post(url, json=data, timeout=60)

print("ステータスコード:", response.status_code)
print(response.text)