import requests
url = 'http://127.0.0.1:8000/api/login'
payload = {'email':'hcp1@gmail.com','password':'password123'}
resp = requests.post(url, json=payload)
print(resp.status_code)
print(resp.text)
