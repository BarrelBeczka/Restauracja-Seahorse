import pytest
import sys
import os
import bcrypt

# Dodanie katalogu głównego backendu do ścieżki wyszukiwania Pythona
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from app import create_app
from extensions import db
from models import Role, User, Table, Client, Reservation, FloorPlan

@pytest.fixture(scope='session')
def app():
    # Tworzymy instancję aplikacji dla trybu testowego z nadpisaną konfiguracją
    app = create_app({
        'TESTING': True,
        'SQLALCHEMY_DATABASE_URI': 'sqlite://',  # Baza w pamięci RAM
        'JWT_SECRET_KEY': 'test-secret-key-123'
    })

    with app.app_context():
        # Tworzymy wszystkie tabele w SQLite
        db.create_all()

        # Inicjalizujemy role
        role_mgr = Role(name='manager')
        role_kelner = Role(name='kelner')
        db.session.add_all([role_mgr, role_kelner])
        db.session.commit()

        # Dodajemy domyślnego użytkownika testowego (Manager)
        hashed_pw = bcrypt.hashpw('admin123'.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')
        test_manager = User(
            username='admin',
            password_hash=hashed_pw,
            first_name='Bartłomiej',
            last_name='Manager',
            email='admin@restauracja.pl',
            is_active=True
        )
        test_manager.roles.append(role_mgr)
        db.session.add(test_manager)
        db.session.commit()

        # Dodajemy plan sali (wymagany klucz obcy dla stolika)
        test_plan = FloorPlan(
            name='Sala Główna',
            polygon_points=[[0,0],[800,0],[800,600],[0,600]],
            canvas_width=800,
            canvas_height=600,
            background_color='#ffffff'
        )
        db.session.add(test_plan)
        db.session.commit()

        # Dodajemy domyślnego klienta testowego
        test_client = Client(
            first_name='Grzegorz',
            last_name='Piotrowski',
            phone='799181799',
            email='grzegorz@gmail.com'
        )
        db.session.add(test_client)
        db.session.commit()

        # Dodajemy domyślny stolik przypisany do planu sali
        test_table = Table(
            floor_plan_id=test_plan.id,
            table_number=1,
            capacity=4,
            shape='rectangle',
            pos_x=100,
            pos_y=150,
            label='Przy Oknie'
        )
        db.session.add(test_table)
        db.session.commit()

        from datetime import date, time
        # Dodajemy domyślną rezerwację, aby raporty SQL JOIN miały dane (Wymaganie BDB)
        test_res = Reservation(
            client_id=test_client.id,
            table_id=test_table.id,
            reservation_date=date(2026, 5, 17),
            reservation_time=time(19, 0),
            guest_count=2,
            status='zakończona',
            confirmation_number='#R-2026-conftest',
            notes='Testowa rezerwacja z conftest'
        )
        db.session.add(test_res)
        db.session.commit()

        yield app

        # Po zakończeniu sesji testów usuwamy tabele
        db.drop_all()

@pytest.fixture
def client(app):
    # Klient testowy do wykonywania zapytań HTTP do API
    return app.test_client()

@pytest.fixture
def auth_headers(client):
    # Pomocnicza fixture logująca managera i zwracająca nagłówek autoryzacji JWT
    response = client.post('/api/auth/login', json={
        'username': 'admin',
        'password': 'admin123'
    })
    token = response.json['access_token']
    return {
        'Authorization': f'Bearer {token}'
    }
