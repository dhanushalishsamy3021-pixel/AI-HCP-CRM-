import requests

BASE = 'http://127.0.0.1:8000'

def health():
    r = requests.get(BASE + '/')
    print('GET / ->', r.status_code, r.text)


def login(email, password):
    r = requests.post(BASE + '/api/login', json={'email': email, 'password': password})
    print('POST /api/login ->', r.status_code)
    if r.status_code == 200:
        return r.json().get('access_token')
    print(r.text)
    return None


def list_interactions(token):
    headers = {'Authorization': f'Bearer {token}'}
    r = requests.get(BASE + '/api/interaction', headers=headers)
    print('GET /api/interaction ->', r.status_code)
    print(r.text)


if __name__ == '__main__':
    health()
    token = login('hcp1@gmail.com', 'password123')
    if token:
        print('Got token, length:', len(token))
        list_interactions(token)
    else:
        print('Login failed')
