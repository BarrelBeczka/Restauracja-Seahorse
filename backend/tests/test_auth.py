import pytest

def test_login_success(client):
    # Test poprawności autoryzacji z poprawnym hasłem
    response = client.post('/api/auth/login', json={
        'username': 'admin',
        'password': 'admin123'
    })
    assert response.status_code == 200
    assert 'access_token' in response.json
    assert response.json['roles'] == ['manager']
    assert response.json['first_name'] == 'Bartłomiej'

def test_login_failure(client):
    # Test odrzucenia logowania ze złym hasłem
    response = client.post('/api/auth/login', json={
        'username': 'admin',
        'password': 'wrong-password'
    })
    assert response.status_code == 401
    assert 'access_token' not in response.json
    assert response.json['msg'] == 'Nieprawidłowy login lub hasło'

def test_create_user(client, auth_headers):
    # Test dodawania nowego użytkownika (Formularz Wstawiania)
    response = client.post('/api/users', json={
        'username': 'waiter_jan',
        'password': 'waiterpass123',
        'first_name': 'Jan',
        'last_name': 'Kowalski',
        'email': 'jan@restauracja.pl',
        'roles': ['kelner']
    }, headers=auth_headers)
    
    assert response.status_code == 201
    assert response.json['msg'] == 'Użytkownik dodany pomyślnie'

def test_edit_user(client, auth_headers):
    # Test edycji danych pracownika (Formularz Modyfikacji)
    # Najpierw tworzymy usera do edycji
    create_resp = client.post('/api/users', json={
        'username': 'waiter_adam',
        'password': 'adampass123',
        'first_name': 'Adam',
        'last_name': 'Nowak',
        'email': 'adam@restauracja.pl',
        'roles': ['kelner']
    }, headers=auth_headers)
    
    # Pobieramy wszystkich użytkowników, aby znaleźć nowo dodanego
    users_resp = client.get('/api/users', headers=auth_headers)
    adam_user = [u for u in users_resp.json if u['username'] == 'waiter_adam'][0]
    adam_id = adam_user['id']

    # Aktualizujemy dane
    edit_resp = client.put(f'/api/users/{adam_id}', json={
        'first_name': 'Adam-Modyfikowany',
        'last_name': 'Nowakowski',
        'is_active': False
    }, headers=auth_headers)
    
    assert edit_resp.status_code == 200
    assert edit_resp.json['msg'] == 'Dane pracownika zaktualizowane'

    # Weryfikujemy, czy dane w bazie się zmieniły
    check_resp = client.get('/api/users', headers=auth_headers)
    updated_user = [u for u in check_resp.json if u['id'] == adam_id][0]
    assert updated_user['first_name'] == 'Adam-Modyfikowany'
    assert updated_user['last_name'] == 'Nowakowski'
    assert updated_user['is_active'] is False
