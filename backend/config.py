from flask import Flask, jsonify
from flask_sqlalchemy import SQLAlchemy
from flask_cors import CORS
from flask_jwt_extended import JWTManager
import os

# Criar instância da aplicação Flask
app = Flask(__name__)

# ✅ CONFIGURAR CORS - Mais permissivo para debug
CORS(app, resources={
    r"/api/*": {
        "origins": ["http://localhost:5173", "http://127.0.0.1:5173", "http://localhost:3000"],
        "methods": ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
        "allow_headers": ["Content-Type", "Authorization", "X-Requested-With", "Accept"],
        "expose_headers": ["Content-Type", "Authorization"],
        "supports_credentials": True
    }
})

@app.route('/')
def home():
    return jsonify({'message': 'API está funcionando'})

@app.route('/health')
def health():
    return jsonify({
        'status': 'OK',
        'message': 'API funcionando corretamente',
        'cors_enabled': True,
        'endpoints': [
            '/api/clientes/',
            '/api/usuarios/',
            '/api/servicos/',
            '/api/cargos/',
            '/api/regimes-tributarios/',
            '/api/funcionarios/',
            '/api/tipos-atividade/'
        ]
    })

# Configuração do banco de dados

app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///database.db'
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
app.config['JWT_SECRET_KEY'] = 'alohomora'
app.config["JWT_ACCESS_TOKEN_EXPIRES"] = False

# Inicializar extensões
db = SQLAlchemy(app)
jwt = JWTManager(app)
