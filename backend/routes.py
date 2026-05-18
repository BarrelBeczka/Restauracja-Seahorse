import bcrypt
import uuid
from datetime import datetime
from flask import Blueprint, request, jsonify
from flask_jwt_extended import create_access_token, jwt_required, get_jwt_identity
from models import User, FloorPlan, Table, Reservation, Client, Role
from extensions import db

api_bp = Blueprint('api', __name__)

@api_bp.route('/api/auth/login', methods=['POST'])
def login():
    data = request.get_json()
    if not data or not data.get('username') or not data.get('password'):
        return jsonify({"msg": "Brak danych logowania"}), 400

    user = User.query.filter_by(username=data['username']).first()
    if not user:
        return jsonify({"msg": "Nieprawidłowy login lub hasło"}), 401

    if bcrypt.checkpw(data['password'].encode('utf-8'), user.password_hash.encode('utf-8')):
        roles = [role.name for role in user.roles]
        access_token = create_access_token(
            identity=str(user.id),
            additional_claims={"roles": roles, "first_name": user.first_name}
        )
        return jsonify(
            access_token=access_token,
            roles=roles,
            first_name=user.first_name
        )
    else:
        return jsonify({"msg": "Nieprawidłowy login lub hasło"}), 401


@api_bp.route('/api/floor_plans', methods=['GET'])
def get_floor_plans():
    plans = FloorPlan.query.filter_by(is_active=True).all()
    result = []
    for plan in plans:
        tables = Table.query.filter_by(floor_plan_id=plan.id, is_active=True).all()
        tables_data = [{
            "id": t.id,
            "table_number": t.table_number,
            "capacity": t.capacity,
            "shape": t.shape,
            "pos_x": t.pos_x,
            "pos_y": t.pos_y,
            "label": t.label
        } for t in tables]
        
        result.append({
            "id": plan.id,
            "name": plan.name,
            "polygon_points": plan.polygon_points,
            "canvas_width": plan.canvas_width,
            "canvas_height": plan.canvas_height,
            "background_color": plan.background_color,
            "tables": tables_data
        })
    return jsonify(result)


@api_bp.route('/api/reservations', methods=['POST'])
def create_reservation():
    data = request.get_json()
    
    try:
        res_date = datetime.strptime(data['reservation_date'], '%Y-%m-%d').date()
        res_time = datetime.strptime(data['reservation_time'], '%H:%M').time()
    except (ValueError, KeyError, TypeError):
        return jsonify({"msg": "Błędny format daty lub czasu"}), 400

    # Walidacja nakładania się rezerwacji (Wymaganie BDB - 5.0)
    # Stolik nie może być zarezerwowany, jeśli inny gość zajął go w przedziale +- 2 godzin (120 minut)
    table_id = data.get('table_id')
    existing_reservations = Reservation.query.filter(
        Reservation.table_id == table_id,
        Reservation.reservation_date == res_date,
        Reservation.status != 'anulowana'
    ).all()

    new_res_minutes = res_time.hour * 60 + res_time.minute
    for res in existing_reservations:
        existing_minutes = res.reservation_time.hour * 60 + res.reservation_time.minute
        if abs(new_res_minutes - existing_minutes) < 120:
            return jsonify({"msg": "Stolik jest już zarezerwowany w tym przedziale czasowym!"}), 400

    client = None
    if 'client' in data:
        client_data = data['client']
        client = Client(
            first_name=client_data.get('first_name'),
            last_name=client_data.get('last_name'),
            phone=client_data.get('phone'),
            email=client_data.get('email')
        )
        db.session.add(client)
        db.session.flush()
    elif 'first_name' in data:
        # Obsługa płaskiej struktury danych (np. z prostego formularza lub testów jednostkowych)
        client = Client(
            first_name=data.get('first_name'),
            last_name=data.get('last_name'),
            phone=data.get('phone'),
            email=data.get('email')
        )
        db.session.add(client)
        db.session.flush()

    conf_num = f"#R-{res_date.year}-{str(uuid.uuid4())[:4]}"
    
    new_res = Reservation(
        client_id=client.id if client else None,
        table_id=table_id,
        reservation_date=res_date,
        reservation_time=res_time,
        guest_count=data.get('guest_count', 1),
        status='nowa',
        confirmation_number=conf_num,
        notes=data.get('notes')
    )
    
    db.session.add(new_res)
    db.session.commit()
    
    return jsonify({
        "msg": "Rezerwacja przyjęta",
        "confirmation_number": conf_num
    }), 201


@api_bp.route('/api/reservations', methods=['GET'])
def get_reservations():
    date_str = request.args.get('date')
    query = Reservation.query
    
    if date_str:
        try:
            target_date = datetime.strptime(date_str, '%Y-%m-%d').date()
            query = query.filter_by(reservation_date=target_date)
        except ValueError:
            return jsonify({"msg": "Błędny format daty, oczekiwano YYYY-MM-DD"}), 400
            
    reservations = query.all()
    result = []
    for res in reservations:
        result.append({
            "id": res.id,
            "date": str(res.reservation_date),
            "time": str(res.reservation_time),
            "table_id": res.table_id,
            "guest_count": res.guest_count,
            "status": res.status,
            "confirmation_number": res.confirmation_number,
            "client_name": f"{res.client.first_name} {res.client.last_name}" if res.client else "Brak danych"
        })
        
    return jsonify(result)


@api_bp.route('/api/reservations/<int:res_id>/status', methods=['PUT'])
def update_reservation_status(res_id):
    data = request.get_json()
    new_status = data.get('status')
    if not new_status:
        return jsonify({"msg": "Brak nowego statusu"}), 400
        
    res = Reservation.query.get(res_id)
    if not res:
        return jsonify({"msg": "Nie znaleziono rezerwacji"}), 404
        
    res.status = new_status
    db.session.commit()
    return jsonify({"msg": "Status zaktualizowany pomyślnie"})


# ==========================================
# SEKCJA RAPORTÓW (SQL JOIN & GROUP BY) - Wymagania [25, 26, 27]
# ==========================================

from sqlalchemy import extract, func
from datetime import date


@api_bp.route('/api/reports/daily', methods=['GET'])
def get_daily_report():
    # Raport dzienny — złączenie (JOIN) rezerwacji z klientami i stolikami dla dzisiejszej daty
    today = date.today()
    results = db.session.query(
        Reservation.id,
        Reservation.reservation_time,
        Reservation.guest_count,
        Reservation.status,
        Reservation.confirmation_number,
        Client.first_name,
        Client.last_name,
        Client.phone,
        Table.table_number,
        Table.label
    ).join(Client, Reservation.client_id == Client.id)\
     .join(Table, Reservation.table_id == Table.id)\
     .filter(Reservation.reservation_date == today)\
     .order_by(Reservation.reservation_time).all()

    report = [{
        "id": r.id,
        "time": str(r.reservation_time),
        "guest_count": r.guest_count,
        "status": r.status,
        "confirmation_number": r.confirmation_number,
        "client_name": f"{r.first_name} {r.last_name}",
        "client_phone": r.phone,
        "table_number": r.table_number,
        "table_label": r.label or f"Stolik {r.table_number}"
    } for r in results]
    return jsonify(report)


@api_bp.route('/api/reports/monthly', methods=['GET'])
def get_monthly_report():
    # Grupowanie rezerwacji po roku i miesiącu, zliczanie ich oraz sumowanie liczby gości
    results = db.session.query(
        extract('year', Reservation.reservation_date).label('year'),
        extract('month', Reservation.reservation_date).label('month'),
        func.count(Reservation.id).label('reservation_count'),
        func.sum(Reservation.guest_count).label('total_guests')
    ).filter(Reservation.status != 'anulowana')\
     .group_by('year', 'month')\
     .order_by('year', 'month').all()

    report = [{
        "year": int(r.year),
        "month": int(r.month),
        "reservations": r.reservation_count,
        "guests": int(r.total_guests or 0)
    } for r in results]
    return jsonify(report)


@api_bp.route('/api/reports/popular_clients', methods=['GET'])
def get_popular_clients_report():
    # Złączenie tabel Client JOIN Reservation, grupowanie i sortowanie po liczbie rezerwacji (TOP 10)
    results = db.session.query(
        Client.id,
        Client.first_name,
        Client.last_name,
        Client.phone,
        func.count(Reservation.id).label('res_count')
    ).join(Reservation, Client.id == Reservation.client_id)\
     .group_by(Client.id, Client.first_name, Client.last_name, Client.phone)\
     .order_by(func.count(Reservation.id).desc())\
     .limit(10).all()

    report = [{
        "id": r.id,
        "name": f"{r.first_name} {r.last_name}",
        "phone": r.phone,
        "reservations": r.res_count
    } for r in results]
    return jsonify(report)


@api_bp.route('/api/reports/table_usage', methods=['GET'])
def get_table_usage_report():
    # Złączenie tabel Table JOIN Reservation, pokazujące obłożenie stolików
    results = db.session.query(
        Table.id,
        Table.table_number,
        Table.label,
        func.count(Reservation.id).label('res_count')
    ).join(Reservation, Table.id == Reservation.table_id)\
     .filter(Reservation.status != 'anulowana')\
     .group_by(Table.id, Table.table_number, Table.label)\
     .order_by(func.count(Reservation.id).desc()).all()

    report = [{
        "id": r.id,
        "table_number": r.table_number,
        "label": r.label or f"Stolik {r.table_number}",
        "reservations": r.res_count
    } for r in results]
    return jsonify(report)


@api_bp.route('/api/reports/cancellations', methods=['GET'])
def get_cancellation_report():
    # Grupowanie po statusach, aby pokazać proporcje anulowań
    results = db.session.query(
        Reservation.status,
        func.count(Reservation.id).label('count')
    ).group_by(Reservation.status).all()

    report = {r.status: r.count for r in results}
    return jsonify(report)


# ==========================================
# ENDPOINTY CRUD DLA FORMULARZY (Wymagania [23, 24, 42])
# ==========================================

# 1. Zarządzanie Pracownikami (Użytkownikami)
@api_bp.route('/api/users', methods=['GET'])
def get_users():
    users = User.query.all()
    user_list = []
    for u in users:
        user_list.append({
            "id": u.id,
            "username": u.username,
            "first_name": u.first_name,
            "last_name": u.last_name,
            "email": u.email,
            "is_active": u.is_active,
            "roles": [r.name for r in u.roles]
        })
    return jsonify(user_list)


@api_bp.route('/api/users', methods=['POST'])
def add_user():
    data = request.get_json()
    if not data or not data.get('username') or not data.get('password'):
        return jsonify({"msg": "Brak wymaganych danych"}), 400

    if User.query.filter_by(username=data['username']).first():
        return jsonify({"msg": "Użytkownik o takiej nazwie już istnieje"}), 400

    hashed_pw = bcrypt.hashpw(data['password'].encode('utf-8'), bcrypt.gensalt()).decode('utf-8')
    new_user = User(
        username=data['username'],
        password_hash=hashed_pw,
        first_name=data.get('first_name', ''),
        last_name=data.get('last_name', ''),
        email=data.get('email')
    )

    # Nadanie ról
    role_names = data.get('roles', ['kelner'])
    for r_name in role_names:
        role = Role.query.filter_by(name=r_name).first()
        if role:
            new_user.roles.append(role)

    db.session.add(new_user)
    db.session.commit()
    return jsonify({"msg": "Użytkownik dodany pomyślnie"}), 201


@api_bp.route('/api/users/<int:user_id>', methods=['PUT'])
def edit_user(user_id):
    user = User.query.get(user_id)
    if not user:
        return jsonify({"msg": "Nie znaleziono użytkownika"}), 404

    data = request.get_json()
    user.first_name = data.get('first_name', user.first_name)
    user.last_name = data.get('last_name', user.last_name)
    user.email = data.get('email', user.email)
    user.is_active = data.get('is_active', user.is_active)

    if data.get('password'):
        user.password_hash = bcrypt.hashpw(data['password'].encode('utf-8'), bcrypt.gensalt()).decode('utf-8')

    # Aktualizacja ról
    if 'roles' in data:
        user.roles = []
        for r_name in data['roles']:
            role = Role.query.filter_by(name=r_name).first()
            if role:
                user.roles.append(role)

    db.session.commit()
    return jsonify({"msg": "Dane pracownika zaktualizowane"})


# 2. Zarządzanie Klientami
@api_bp.route('/api/clients', methods=['GET'])
def get_clients():
    clients = Client.query.all()
    client_list = [{
        "id": c.id,
        "first_name": c.first_name,
        "last_name": c.last_name,
        "phone": c.phone,
        "email": c.email,
        "notes": c.notes
    } for c in clients]
    return jsonify(client_list)


@api_bp.route('/api/clients', methods=['POST'])
def add_client():
    data = request.get_json()
    if not data or not data.get('first_name') or not data.get('last_name') or not data.get('phone'):
        return jsonify({"msg": "Brak wymaganych pól klienta"}), 400

    new_client = Client(
        first_name=data['first_name'],
        last_name=data['last_name'],
        phone=data['phone'],
        email=data.get('email'),
        notes=data.get('notes')
    )
    db.session.add(new_client)
    db.session.commit()
    return jsonify({"msg": "Klient dodany pomyślnie", "id": new_client.id}), 201


@api_bp.route('/api/clients/<int:client_id>', methods=['PUT'])
def edit_client(client_id):
    client = Client.query.get(client_id)
    if not client:
        return jsonify({"msg": "Nie znaleziono klienta"}), 404

    data = request.get_json()
    client.first_name = data.get('first_name', client.first_name)
    client.last_name = data.get('last_name', client.last_name)
    client.phone = data.get('phone', client.phone)
    client.email = data.get('email', client.email)
    client.notes = data.get('notes', client.notes)

    db.session.commit()
    return jsonify({"msg": "Dane klienta zaktualizowane"})


# 3. Zarządzanie Planami i Stolikami
@api_bp.route('/api/floor_plans', methods=['POST'])
def add_floor_plan():
    data = request.get_json()
    if not data or not data.get('name'):
        return jsonify({"msg": "Nazwa planu jest wymagana"}), 400

    new_plan = FloorPlan(
        name=data['name'],
        polygon_points=data.get('polygon_points', []),
        canvas_width=data.get('canvas_width', 800),
        canvas_height=data.get('canvas_height', 600),
        background_color=data.get('background_color', '#f3f4f6')
    )
    db.session.add(new_plan)
    db.session.commit()
    return jsonify({"msg": "Plan sali utworzony pomyślnie", "id": new_plan.id}), 201


@api_bp.route('/api/tables', methods=['POST'])
def add_table():
    data = request.get_json()
    if not data or not data.get('floor_plan_id') or not data.get('table_number'):
        return jsonify({"msg": "Brak wymaganych parametrów stolika"}), 400

    new_table = Table(
        floor_plan_id=data['floor_plan_id'],
        table_number=data['table_number'],
        capacity=data.get('capacity', 2),
        shape=data.get('shape', 'circle'),
        pos_x=data.get('pos_x', 100),
        pos_y=data.get('pos_y', 100),
        label=data.get('label')
    )
    db.session.add(new_table)
    db.session.commit()
    return jsonify({"msg": "Stolik dodany pomyślnie", "id": new_table.id}), 201


@api_bp.route('/api/tables/<int:table_id>', methods=['PUT'])
def edit_table(table_id):
    table = Table.query.get(table_id)
    if not table:
        return jsonify({"msg": "Nie znaleziono stolika"}), 404

    data = request.get_json()
    table.table_number = data.get('table_number', table.table_number)
    table.capacity = data.get('capacity', table.capacity)
    table.shape = data.get('shape', table.shape)
    table.pos_x = data.get('pos_x', table.pos_x)
    table.pos_y = data.get('pos_y', table.pos_y)
    table.label = data.get('label', table.label)
    table.is_active = data.get('is_active', table.is_active)

    db.session.commit()
    return jsonify({"msg": "Parametry stolika zaktualizowane"})


@api_bp.route('/api/tables/<int:table_id>', methods=['DELETE'])
def delete_table(table_id):
    table = Table.query.get(table_id)
    if not table:
        return jsonify({"msg": "Nie znaleziono stolika"}), 404

    # Sprawdzamy czy stolik ma aktywne lub trwające rezerwacje
    active_res = Reservation.query.filter_by(table_id=table_id).filter(Reservation.status.in_(['nowa', 'obecny'])).first()
    if active_res:
        return jsonify({"msg": "Nie można usunąć stolika, który posiada aktywne rezerwacje na sali"}), 400

    db.session.delete(table)
    db.session.commit()
    return jsonify({"msg": "Stolik został pomyślnie usunięty"})


# 4. Zarządzanie parametrami istniejącej rezerwacji
@api_bp.route('/api/reservations/<int:res_id>', methods=['PUT'])
def edit_reservation(res_id):
    res = Reservation.query.get(res_id)
    if not res:
        return jsonify({"msg": "Nie znaleziono rezerwacji"}), 404

    data = request.get_json()
    if 'reservation_date' in data:
        try:
            res.reservation_date = datetime.strptime(data['reservation_date'], '%Y-%m-%d').date()
        except ValueError:
            return jsonify({"msg": "Błędny format daty"}), 400
            
    if 'reservation_time' in data:
        try:
            res.reservation_time = datetime.strptime(data['reservation_time'], '%H:%M').time()
        except ValueError:
            return jsonify({"msg": "Błędny format godziny"}), 400

    res.table_id = data.get('table_id', res.table_id)
    res.guest_count = data.get('guest_count', res.guest_count)
    res.notes = data.get('notes', res.notes)
    res.status = data.get('status', res.status)

    db.session.commit()
    return jsonify({"msg": "Dane rezerwacji zaktualizowane"})

