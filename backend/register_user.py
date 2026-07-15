import requests
import json

url = 'http://127.0.0.1:8000/api/register'
payload = {
    'full_name': 'Local Tester',
    'email': 'hcp1@gmail.com',
    'password': 'password123'
}
resp = requests.post(url, json=payload)
print(resp.status_code)
print(resp.text)
