from datetime import datetime, time, date
from sqlalchemy.sql import func
from extensions import db

# Tabela łącząca users i roles (user_roles) - relacja M:N
user_roles = db.Table('user_roles',
    db.Column('user_id', db.Integer, db.ForeignKey('users.id', ondelete='CASCADE'), primary_key=True),
    db.Column('role_id', db.Integer, db.ForeignKey('roles.id', ondelete='CASCADE'), primary_key=True)
)

class Role(db.Model):
    __tablename__ = 'roles'
    id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    name = db.Column(db.String(50), unique=True, nullable=False)

class User(db.Model):
    __tablename__ = 'users'
    id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    username = db.Column(db.String(100), unique=True, nullable=False)
    password_hash = db.Column(db.String(255), nullable=False)
    first_name = db.Column(db.String(100), nullable=False)
    last_name = db.Column(db.String(100), nullable=False)
    email = db.Column(db.String(255), nullable=True)
    is_active = db.Column(db.Boolean, default=True)
    created_at = db.Column(db.DateTime, default=func.now())

    roles = db.relationship('Role', secondary=user_roles, lazy='subquery',
                            backref=db.backref('users', lazy=True))

class FloorPlan(db.Model):
    __tablename__ = 'floor_plans'
    id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    name = db.Column(db.String(100), nullable=False)
    polygon_points = db.Column(db.JSON, nullable=False)
    canvas_width = db.Column(db.Integer, nullable=False)
    canvas_height = db.Column(db.Integer, nullable=False)
    background_color = db.Column(db.String(50), nullable=True)
    is_active = db.Column(db.Boolean, default=True)
    created_at = db.Column(db.DateTime, default=func.now())

    tables = db.relationship('Table', backref='floor_plan', lazy=True, cascade="all, delete-orphan")

class Table(db.Model):
    __tablename__ = 'tables'
    id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    floor_plan_id = db.Column(db.Integer, db.ForeignKey('floor_plans.id', ondelete='CASCADE'), nullable=False)
    table_number = db.Column(db.Integer, nullable=False)
    capacity = db.Column(db.Integer, nullable=False)
    shape = db.Column(db.String(50), nullable=False)
    pos_x = db.Column(db.Float, nullable=False)
    pos_y = db.Column(db.Float, nullable=False)
    is_active = db.Column(db.Boolean, default=True)
    label = db.Column(db.String(50), nullable=True)

class Client(db.Model):
    __tablename__ = 'clients'
    id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    first_name = db.Column(db.String(100), nullable=False)
    last_name = db.Column(db.String(100), nullable=False)
    phone = db.Column(db.String(20), nullable=False)
    email = db.Column(db.String(255), nullable=True)
    notes = db.Column(db.Text, nullable=True)
    created_at = db.Column(db.DateTime, default=func.now())

class Reservation(db.Model):
    __tablename__ = 'reservations'
    id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    client_id = db.Column(db.Integer, db.ForeignKey('clients.id', ondelete='SET NULL'), nullable=True)
    table_id = db.Column(db.Integer, db.ForeignKey('tables.id', ondelete='SET NULL'), nullable=True)
    reservation_date = db.Column(db.Date, nullable=False)
    reservation_time = db.Column(db.Time, nullable=False)
    duration_minutes = db.Column(db.Integer, default=120)
    guest_count = db.Column(db.Integer, nullable=False)
    status = db.Column(db.String(50), nullable=False, default='nowa')
    confirmation_number = db.Column(db.String(100), unique=True, nullable=False)
    notes = db.Column(db.Text, nullable=True)
    created_at = db.Column(db.DateTime, default=func.now())
    created_by = db.Column(db.Integer, db.ForeignKey('users.id', ondelete='SET NULL'), nullable=True)

    client = db.relationship('Client', backref=db.backref('reservations', lazy=True))
    table = db.relationship('Table', backref=db.backref('reservations', lazy=True))
    creator = db.relationship('User', backref=db.backref('created_reservations', lazy=True))
