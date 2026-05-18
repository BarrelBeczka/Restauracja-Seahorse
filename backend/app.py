import os
from flask import Flask, jsonify
from flask_cors import CORS
from dotenv import load_dotenv
from extensions import db, jwt

load_dotenv(os.path.join(os.path.dirname(__file__), '..', '.env'))

def create_app(config_override=None):
    app = Flask(__name__)
    CORS(app)

    db_user = os.environ.get('DB_USER', 'postgres')
    db_pass = os.environ.get('DB_PASSWORD', 'postgres')
    db_name = os.environ.get('DB_NAME', 'restauracja')
    db_host = os.environ.get('DB_HOST', 'localhost')
    db_port = os.environ.get('DB_PORT', '5433')
    
    app.config['SQLALCHEMY_DATABASE_URI'] = f"postgresql+pg8000://{db_user}:{db_pass}@{db_host}:{db_port}/{db_name}"
    app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
    app.config['JWT_SECRET_KEY'] = os.environ.get('JWT_SECRET', 'super-tajny-klucz')

    if config_override:
        app.config.update(config_override)

    db.init_app(app)
    jwt.init_app(app)

    # Rejestracja ścieżek API
    from routes import api_bp
    app.register_blueprint(api_bp)

    @app.route('/api/status', methods=['GET'])
    def status():
        return jsonify({
            "status": "ok", 
            "message": "Serwer Flask (Backend) i Baza danych podłączone!"
        })

    return app

app = create_app()

if __name__ == '__main__':
    # Tryb debugowania do tworzenia aplikacji na uczelni i w domu
    app.run(debug=True, host='0.0.0.0', port=5000)
