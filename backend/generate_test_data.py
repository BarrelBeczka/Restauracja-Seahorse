import random
import string
from datetime import datetime, timedelta, date, time
from app import app
from extensions import db
from models import Reservation, Table, Client, User

def generate_confirmation():
    return ''.join(random.choices(string.ascii_uppercase + string.digits, k=8))

def run():
    with app.app_context():
        # Czyszczenie rezerwacji dla pewności
        db.session.query(Reservation).delete()
        
        tables = Table.query.all()
        if not tables:
            print("Brak stolików. Dodaj stoliki przed generowaniem rezerwacji.")
            return
            
        clients = Client.query.all()
        if not clients:
            print("Tworzę przykładowych klientów...")
            names = [
                "Jan Kowalski", "Anna Nowak", "Piotr Wiśniewski", "Katarzyna Wójcik", 
                "Michał Kamiński", "Agnieszka Kowalczyk", "Tomasz Lewandowski", 
                "Magdalena Zielińska", "Krzysztof Szymański", "Barbara Woźniak",
                "Karol Krawczyk", "Tadeusz Norek", "Halina Kiepska", "Marian Paździoch"
            ]
            for name in names:
                parts = name.split()
                client = Client(
                    first_name=parts[0], 
                    last_name=parts[1], 
                    phone=f"500{random.randint(100000, 999999)}", 
                    email=f"{parts[0].lower()}.{parts[1].lower()}@example.com"
                )
                db.session.add(client)
            db.session.commit()
            clients = Client.query.all()
            
        manager = User.query.filter(User.username == 'manager').first()
        created_by_id = manager.id if manager else None

        today = date(2026, 5, 18) # Obecna data
        
        reservations_to_add = []
        
        # Generowanie danych (-14 dni do +14 dni)
        for day_offset in range(-14, 15):
            current_date = today + timedelta(days=day_offset)
            
            # W obecnym tygodniu dużo rezerwacji (ok 5-8), w innych trochę mniej
            num_reservations = random.randint(4, 9) if -3 <= day_offset <= 7 else random.randint(1, 4)
            
            for _ in range(num_reservations):
                table = random.choice(tables)
                client = random.choice(clients)
                
                guest_count = random.randint(1, table.capacity)
                hour = random.randint(12, 21)
                minute = random.choice([0, 15, 30, 45])
                res_time = time(hour, minute)
                
                # Ustalanie logicznego statusu na podstawie daty i godziny
                if current_date < today:
                    status = random.choice(['zakończona', 'zakończona', 'zakończona', 'anulowana'])
                elif current_date == today:
                    if hour < 14:
                        status = 'zakończona'
                    elif hour < 16:
                        status = 'obecny'
                    else:
                        status = 'nowa'
                else:
                    status = random.choice(['nowa', 'nowa', 'nowa', 'anulowana'])
                    
                res = Reservation(
                    client_id=client.id,
                    table_id=table.id,
                    reservation_date=current_date,
                    reservation_time=res_time,
                    duration_minutes=120,
                    guest_count=guest_count,
                    status=status,
                    confirmation_number=generate_confirmation(),
                    notes=random.choice(["", "", "Urodziny", "Stolik przy oknie proszę", "Alergia na orzechy", "Rocznica ślubu", "Spotkanie biznesowe", "Prośba o krzesełko dla dziecka"]),
                    created_by=created_by_id
                )
                reservations_to_add.append(res)
                
        db.session.bulk_save_objects(reservations_to_add)
        db.session.commit()
        print(f"Pomyślnie wygenerowano i dodano {len(reservations_to_add)} realistycznych rezerwacji na Twoje obecne stoliki!")

if __name__ == '__main__':
    run()
