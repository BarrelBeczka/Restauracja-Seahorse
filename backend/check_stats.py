from app import app
from extensions import db
from models import Client, Reservation, Table, User, Role

with app.app_context():
    print("=== STATYSTYKI BAZY DANYCH ===")
    print(f"Klienci: {Client.query.count()}")
    print(f"Rezerwacje: {Reservation.query.count()}")
    print(f"Stoliki: {Table.query.count()}")
    print(f"Użytkownicy: {User.query.count()}")
    print(f"Role: {Role.query.count()}")
    print("==============================")
