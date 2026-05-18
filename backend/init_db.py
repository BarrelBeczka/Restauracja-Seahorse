import bcrypt
import json
from datetime import date, time, timedelta
import random
from app import app
from extensions import db
from models import Role, User, FloorPlan, Table, Client, Reservation
import uuid

def init_database():
    with app.app_context():
        print("Usuwanie starych tabel (jeśli istnieją)...")
        db.drop_all()
        
        print("Tworzenie nowych tabel na podstawie models.py...")
        db.create_all()
        
        print("Tworzenie perspektyw SQL (widoków)...")
        # Widok 1: v_dzisiejsze_rezerwacje (Dzienne obłożenie sali)
        db.session.execute(db.text("""
            CREATE OR REPLACE VIEW v_dzisiejsze_rezerwacje AS
            SELECT r.id, r.reservation_time, r.guest_count, r.status, c.first_name, c.last_name, t.table_number
            FROM reservations r
            JOIN clients c ON r.client_id = c.id
            JOIN tables t ON r.table_id = t.id
            WHERE r.reservation_date = CURRENT_DATE;
        """))
        
        # Widok 2: v_miesieczne_oblozenie (Miesięczne statystyki obłożenia)
        db.session.execute(db.text("""
            CREATE OR REPLACE VIEW v_miesieczne_oblozenie AS
            SELECT 
                EXTRACT(YEAR FROM reservation_date) as rok,
                EXTRACT(MONTH FROM reservation_date) as miesiac,
                COUNT(id) as liczba_rezerwacji,
                SUM(guest_count) as laczna_liczba_gosci,
                ROUND(AVG(guest_count), 2) as srednia_gosci_na_rezerwacje,
                COUNT(DISTINCT table_id) as liczba_unikalnych_stolikow
            FROM reservations
            GROUP BY EXTRACT(YEAR FROM reservation_date), EXTRACT(MONTH FROM reservation_date);
        """))
        db.session.commit()

        # 1. Dodawanie Ról
        manager_role = Role(name='manager')
        waiter_role = Role(name='kelner')
        db.session.add_all([manager_role, waiter_role])
        db.session.commit()
        
        # 2. Dodawanie pierwszych użytkowników
        hashed_admin = bcrypt.hashpw('admin123'.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')
        hashed_waiter = bcrypt.hashpw('kelner123'.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')
        
        admin = User(
            username='admin',
            password_hash=hashed_admin,
            first_name='Bartłomiej',
            last_name='Gruszczyński',
            email='admin@restauracja.pl'
        )
        admin.roles.append(manager_role)
        
        waiter = User(
            username='kelner',
            password_hash=hashed_waiter,
            first_name='Jan',
            last_name='Kowalski',
            email='kelner@restauracja.pl'
        )
        waiter.roles.append(waiter_role)
        
        db.session.add_all([admin, waiter])
        db.session.commit()
        print("-> Konta użytkowników utworzone (admin/admin123, kelner/kelner123).")
        
        # 3. Dodawanie Planu Sali
        polygon = [
            {"x": 0, "y": 0}, {"x": 800, "y": 0},
            {"x": 800, "y": 600}, {"x": 0, "y": 600}
        ]
        floor = FloorPlan(
            name="Sala Główna",
            polygon_points=polygon,
            canvas_width=800,
            canvas_height=600,
            background_color="#f3f4f6"
        )
        db.session.add(floor)
        db.session.commit()
        
        # Generowanie 12 stolików (zgodnie z oryginalnym planem sali)
        tables_data = [
            {"num": 1, "cap": 4, "shape": "rectangle", "x": 300, "y": 100, "label": "1"},
            {"num": 2, "cap": 4, "shape": "circle", "x": 100, "y": 100, "label": "2"},
            {"num": 3, "cap": 2, "shape": "circle", "x": 100, "y": 250, "label": "3"},
            {"num": 4, "cap": 2, "shape": "circle", "x": 100, "y": 400, "label": "4"},
            {"num": 5, "cap": 4, "shape": "circle", "x": 100, "y": 550, "label": "5"},
            {"num": 6, "cap": 6, "shape": "rectangle", "x": 650, "y": 550, "label": "6"},
            {"num": 7, "cap": 8, "shape": "rectangle", "x": 650, "y": 350, "label": "7"},
            {"num": 8, "cap": 4, "shape": "circle", "x": 650, "y": 100, "label": "8"},
            {"num": 9, "cap": 4, "shape": "rectangle", "x": 500, "y": 100, "label": "9"},
            {"num": 10, "cap": 2, "shape": "circle", "x": 250, "y": 250, "label": "Przy barze"},
            {"num": 11, "cap": 2, "shape": "circle", "x": 250, "y": 350, "label": "Przy barze"},
            {"num": 12, "cap": 2, "shape": "circle", "x": 250, "y": 450, "label": "Przy barze"}
        ]
        
        tables_list = []
        for td in tables_data:
            t = Table(
                floor_plan_id=floor.id,
                table_number=td["num"],
                capacity=td["cap"],
                shape=td["shape"],
                pos_x=td["x"],
                pos_y=td["y"],
                label=td["label"]
            )
            db.session.add(t)
            tables_list.append(t)
        db.session.commit()
        print("-> Wygenerowano 12 stolików.")
        
        # 4. Generowanie Polskich Klientów (60 rekordów)
        first_names_m = ["Jan", "Piotr", "Paweł", "Krzysztof", "Tomasz", "Andrzej", "Michał", "Marcin", "Jakub", "Adam", "Łukasz", "Grzegorz", "Wojciech", "Mariusz", "Dariusz"]
        first_names_f = ["Anna", "Maria", "Katarzyna", "Małgorzata", "Agnieszka", "Barbara", "Krystyna", "Magdalena", "Joanna", "Monika", "Zofia", "Patrycja", "Natalia", "Maja"]
        last_names = ["Kowalski", "Nowak", "Wiśniewski", "Wójcik", "Kowalczyk", "Kamiński", "Lewandowski", "Zieliński", "Szymański", "Woźniak", "Kozłowski", "Jankowski", "Wojciechowski", "Kwiatkowski", "Mazur", "Krawczyk", "Piotrowski", "Grabowski", "Pawłowski", "Michalski"]
        
        clients_list = []
        for i in range(60):
            gender = random.choice(["M", "F"])
            fn = random.choice(first_names_m if gender == "M" else first_names_f)
            ln = random.choice(last_names)
            # Obsługa poprawnych żeńskich końcówek nazwisk
            if gender == "F" and ln.endswith("ski"):
                ln = ln[:-3] + "ska"
            elif gender == "F" and ln.endswith("cki"):
                ln = ln[:-3] + "cka"
                
            c = Client(
                first_name=fn,
                last_name=ln,
                phone=f"{random.randint(500, 899)}{random.randint(100, 999)}{random.randint(100, 999)}",
                email=f"{fn.lower()}.{ln.lower()}@poczta.pl"
            )
            db.session.add(c)
            clients_list.append(c)
        db.session.commit()
        print("-> Wygenerowano 60 unikalnych klientów.")
        
        # 5. Generowanie Rezerwacji (160 rekordów dla dwóch miesięcy: Maj i Czerwiec 2026)
        start_date = date(2026, 5, 1)
        
        for i in range(160):
            delta_days = random.randint(0, 60) # Od 1 maja do 30 czerwca (60 dni)
            res_date = start_date + timedelta(days=delta_days)
            
            # Dobór statusów na podstawie daty (historyczne/obecne/przyszłe)
            today = date(2026, 5, 17)
            if res_date < today:
                status = random.choices(["zakończona", "anulowana"], weights=[90, 10])[0]
            elif res_date == today:
                status = random.choices(["obecny", "nowa", "anulowana"], weights=[70, 20, 10])[0]
            else:
                status = random.choices(["nowa", "anulowana"], weights=[95, 5])[0]
                
            res_time = time(random.choice([12, 13, 14, 15, 16, 17, 18, 19, 20, 21]), random.choice([0, 30]))
            client = random.choice(clients_list)
            table = random.choice(tables_list)
            
            conf_num = f"#R-{res_date.year}-{str(uuid.uuid4())[:8]}"
            
            res = Reservation(
                client_id=client.id,
                table_id=table.id,
                reservation_date=res_date,
                reservation_time=res_time,
                guest_count=random.randint(1, table.capacity),
                status=status,
                confirmation_number=conf_num,
                created_by=random.choice([admin.id, waiter.id])
            )
            db.session.add(res)
            
        db.session.commit()
        print("-> Wygenerowano 160 rezerwacji w roku 2026.")
        print(f"\n=== Baza zainicjalizowana SUKCESEM! Razem rekordów: {60 + 160 + 10 + 2 + 2} ===")

if __name__ == "__main__":
    init_database()
