from flask import Flask, jsonify
from flask_sqlalchemy import SQLAlchemy
from flask_cors import CORS
from flask_jwt_extended import JWTManager
from datetime import timedelta
from pathlib import Path
from dotenv import load_dotenv
import os

# Carregar variáveis de ambiente do arquivo .env, se existir
BASE_DIR = Path(__file__).resolve().parent
load_dotenv(BASE_DIR / '.env', override=False)

# Validar segredos criticos definidos via variavel de ambiente.
# Nao usamos fallback aqui: um valor padrao conhecido (e agora publico,
# ja que este repositorio e publico) tornaria SECRET_KEY/REFRESH_SECRET_KEY previsiveis.
required_secrets = ['SECRET_KEY', 'REFRESH_SECRET_KEY']
missing_secrets = [name for name in required_secrets if not os.getenv(name)]
if missing_secrets:
        raise RuntimeError(
                    "Variaveis de ambiente obrigatorias nao definidas: "
                    + ", ".join(missing_secrets)
                    + ". Defina-as no .env (fora do controle de versao) antes de iniciar a aplicacao."
        )
os.environ.setdefault('ACCESS_TOKEN_EXPIRE_MINUTES', '15')
os.environ.setdefault('REFRESH_TOKEN_EXPIRE_DAYS', '7')
os.environ.setdefault('REDIS_HOST', 'localhost')
os.environ.setdefault('REDIS_PORT', '6379')
os.environ.setdefault('REDIS_DB', '0')
os.environ.setdefault('REDIS_REQUIRED', 'false')

# Criar instância da aplicação Flask
app = Flask(__name__)

CORS(app, resources={
    r"/api/*": {
        "origins": ["http://localhost:5173", "http://127.0.0.1:5173", "http://localhost:3000"],
        "methods": ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
        "allow_headers": ["Content-Type", "Authorization", "X-Requested-With", "Accept"],
        "expose_headers": ["Content-Type", "Authorization"],
        "supports_credentials": True
    },
    r"/reports/*": {
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

# Configuração do banco de dados e integrações externas

app.config['SQLALCHEMY_DATABASE_URI'] = os.getenv('SQLALCHEMY_DATABASE_URI', 'sqlite:///database.db')
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False

# Configurações de autenticação e tokens
app.config['SECRET_KEY'] = os.getenv('SECRET_KEY')
app.config['REFRESH_SECRET_KEY'] = os.getenv('REFRESH_SECRET_KEY')
app.config['ACCESS_TOKEN_EXPIRE_MINUTES'] = int(os.getenv('ACCESS_TOKEN_EXPIRE_MINUTES', 15))
app.config['REFRESH_TOKEN_EXPIRE_DAYS'] = int(os.getenv('REFRESH_TOKEN_EXPIRE_DAYS', 7))

app.config['JWT_SECRET_KEY'] = app.config['SECRET_KEY']
app.config['JWT_ACCESS_TOKEN_EXPIRES'] = timedelta(minutes=app.config['ACCESS_TOKEN_EXPIRE_MINUTES'])

# Configurações do cookie httpOnly do refresh token
app.config['COOKIE_SECURE'] = os.getenv('COOKIE_SECURE', 'true').lower() == 'true'
app.config['COOKIE_SAMESITE'] = os.getenv('COOKIE_SAMESITE', 'Lax')

# Configurações de cache/persistência de tokens (Redis)
app.config['REDIS_HOST'] = os.getenv('REDIS_HOST')
app.config['REDIS_PORT'] = int(os.getenv('REDIS_PORT', 6379))
app.config['REDIS_DB'] = int(os.getenv('REDIS_DB', 0))
app.config['REDIS_REQUIRED'] = os.getenv('REDIS_REQUIRED', 'false').lower() == 'true'

# Configuração auxiliar (conveniência) para URLs Redis
app.config['REDIS_URL'] = (
    f"redis://{app.config['REDIS_HOST']}:{app.config['REDIS_PORT']}/{app.config['REDIS_DB']}"
)

# Diretórios auxiliares
upload_folder_env = os.getenv('UPLOAD_FOLDER')
if upload_folder_env:
    upload_folder_path = Path(upload_folder_env)
else:
    upload_folder_path = BASE_DIR / 'uploads'

upload_folder_path.mkdir(parents=True, exist_ok=True)
app.config['UPLOAD_FOLDER'] = str(upload_folder_path)

db = SQLAlchemy(app)
jwt = JWTManager(app)

# SQLite não aplica constraints de foreign key por padrão em cada conexão
# (diferente de Postgres/MySQL), então todo ondelete='CASCADE'/'SET NULL'
# declarado nos modelos fica decorativo até isso ser ligado explicitamente.
# O guard por isinstance garante que isso só roda para conexões sqlite3
# reais (o projeto também suporta Postgres em produção, onde "PRAGMA
# foreign_keys" não existe e quebraria a conexão).
import sqlite3
from sqlalchemy import event
from sqlalchemy.engine import Engine


@event.listens_for(Engine, "connect")
def _habilitar_foreign_keys_sqlite(dbapi_connection, connection_record):
    if isinstance(dbapi_connection, sqlite3.Connection):
        cursor = dbapi_connection.cursor()
        cursor.execute("PRAGMA foreign_keys=ON")
        cursor.close()
