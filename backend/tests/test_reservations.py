import pytest

def test_create_reservation_success(client):
    # Test pomyślnego utworzenia nowej rezerwacji (Wymaganie Klienta)
    response = client.post('/api/reservations', json={
        'first_name': 'Tomasz',
        'last_name': 'Kowalski',
        'phone': '500600700',
        'email': 'tomasz@kowal.pl',
        'reservation_date': '2026-06-20',
        'reservation_time': '18:00',
        'guest_count': 3,
        'table_id': 1,  # Stolik #1 stworzony w conftest
        'notes': 'Miejsce przy oknie'
    })
    
    assert response.status_code == 201
    assert 'confirmation_number' in response.json
    assert response.json['msg'] == 'Rezerwacja przyjęta'

def test_create_reservation_conflict(client):
    # Test konfliktu rezerwacji - próba rezerwacji zajętego stolika (Walidacja BDB)
    # 1. Tworzymy pierwszą rezerwację na dany slot
    client.post('/api/reservations', json={
        'first_name': 'Tomasz',
        'last_name': 'Kowalski',
        'phone': '500600700',
        'email': 'tomasz@kowal.pl',
        'reservation_date': '2026-06-20',
        'reservation_time': '18:00',
        'guest_count': 3,
        'table_id': 1
    })

    # 2. Próbujemy zarezerwować TEN SAM stolik na TĘ SAMĄ godzinę i dzień
    response = client.post('/api/reservations', json={
        'first_name': 'Marek',
        'last_name': 'Wiśniewski',
        'phone': '600700800',
        'email': 'marek@wisniewski.pl',
        'reservation_date': '2026-06-20',
        'reservation_time': '18:00',
        'guest_count': 2,
        'table_id': 1
    })
    
    # Powinien wystąpić błąd konfliktu terminów (400 Bad Request)
    assert response.status_code == 400
    assert 'Stolik jest już zarezerwowany' in response.json['msg']

def test_edit_reservation(client, auth_headers):
    # Test modyfikacji parametrów rezerwacji przez managera (Formularz edycji)
    # 1. Tworzymy rezerwację
    res = client.post('/api/reservations', json={
        'first_name': 'Anna',
        'last_name': 'Nowak',
        'phone': '111222333',
        'reservation_date': '2026-07-15',
        'reservation_time': '20:00',
        'guest_count': 2,
        'table_id': 1
    })
    
    # 2. Pobieramy listę rezerwacji na ten dzień, aby zdobyć ID rezerwacji
    list_resp = client.get('/api/reservations?date=2026-07-15')
    res_id = list_resp.json[0]['id']

    # 3. Modyfikujemy parametry (np. przesuwamy godzinę i zmieniamy notatki)
    edit_resp = client.put(f'/api/reservations/{res_id}', json={
        'reservation_date': '2026-07-15',
        'reservation_time': '21:00',
        'guest_count': 4,
        'notes': 'Zmiana godziny na prośbę klienta'
    }, headers=auth_headers)

    assert edit_resp.status_code == 200
    assert edit_resp.json['msg'] == 'Dane rezerwacji zaktualizowane'

    # Weryfikujemy w bazie
    check_resp = client.get('/api/reservations?date=2026-07-15')
    updated = check_resp.json[0]
    assert updated['time'] == '21:00:00'
    assert updated['guest_count'] == 4

def test_update_status_flow(client, auth_headers):
    # Test przepływu statusów (Kelner workflow: nowa -> obecny -> zakończona)
    client.post('/api/reservations', json={
        'first_name': 'Piotr',
        'last_name': 'Zieliński',
        'phone': '444555666',
        'reservation_date': '2026-08-01',
        'reservation_time': '12:00',
        'guest_count': 2,
        'table_id': 1
    })

    list_resp = client.get('/api/reservations?date=2026-08-01')
    res_id = list_resp.json[0]['id']
    assert list_resp.json[0]['status'] == 'nowa'

    # 1. Kelner wita gości (Status: obecny)
    status1 = client.put(f'/api/reservations/{res_id}/status', json={'status': 'obecny'}, headers=auth_headers)
    assert status1.status_code == 200
    
    # 2. Kelner kończy wizytę (Status: zakończona)
    status2 = client.put(f'/api/reservations/{res_id}/status', json={'status': 'zakończona'}, headers=auth_headers)
    assert status2.status_code == 200

    # Sprawdzenie w bazie
    check = client.get('/api/reservations?date=2026-08-01')
    assert check.json[0]['status'] == 'zakończona'
