import pytest

def test_monthly_report(client, auth_headers):
    # Test agregacji miesięcznej rezerwacji (SQL GROUP BY)
    # Tworzymy rezerwację, aby zasilić bazę
    client.post('/api/reservations', json={
        'first_name': 'Jan',
        'last_name': 'Kowalski',
        'phone': '123456789',
        'reservation_date': '2026-05-17',
        'reservation_time': '20:00',
        'guest_count': 2,
        'table_id': 1
    })

    response = client.get('/api/reports/monthly', headers=auth_headers)
    assert response.status_code == 200
    
    # Sprawdzamy czy struktura jest poprawna
    data = response.json
    assert len(data) > 0
    assert 'year' in data[0]
    assert 'month' in data[0]
    assert 'reservations' in data[0]
    assert 'guests' in data[0]

def test_popular_clients_report(client, auth_headers):
    # Test najpopularniejszych klientów (SQL JOIN & GROUP BY)
    response = client.get('/api/reports/popular_clients', headers=auth_headers)
    assert response.status_code == 200
    
    data = response.json
    assert len(data) > 0
    assert 'id' in data[0]
    assert 'name' in data[0]
    assert 'phone' in data[0]
    assert 'reservations' in data[0]

def test_table_usage_report(client, auth_headers):
    # Test popularności stolików (SQL JOIN)
    response = client.get('/api/reports/table_usage', headers=auth_headers)
    assert response.status_code == 200
    
    data = response.json
    assert len(data) > 0
    assert 'table_number' in data[0]
    assert 'label' in data[0]
    assert 'reservations' in data[0]

def test_cancellation_report(client, auth_headers):
    # Test raportu statusów i anulowań
    response = client.get('/api/reports/cancellations', headers=auth_headers)
    assert response.status_code == 200
    
    data = response.json
    # Powinien zawierać zliczone statusy jako klucze
    assert isinstance(data, dict)
