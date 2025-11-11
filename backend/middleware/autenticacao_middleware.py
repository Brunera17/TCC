from functools import wraps
from flask import request, jsonify
import jwt
import datetime
import logging
import redis
from redis.exceptions import ConnectionError, RedisError
from models.organizacional import Usuario
from config import app

# -----------------------------------------------------------
# 🔧 Configuração de log
# -----------------------------------------------------------
logger = logging.getLogger(__name__)
logging.basicConfig(level=logging.INFO)

# -----------------------------------------------------------
# 💬 Mensagens de erro padronizadas
# -----------------------------------------------------------
ERROS = {
    'token_nao_fornecido': 'Token de acesso não fornecido.',
    'formato_invalido': 'Formato de header Authorization inválido. Use: Bearer <token>.',
    'token_expirado': 'Token expirado.',
    'token_invalido': 'Token inválido.',
    'payload_invalido': 'Payload de identidade inválido no token.',
    'acesso_negado_gerente': 'Acesso negado. Permissões de gerente necessárias.',
    'erro_autenticacao_interna': 'Erro interno de autenticação.',
    'refresh_token_invalido': 'Refresh token inválido ou revogado.'
}

# -----------------------------------------------------------
# ⚙️ Configurações principais
# -----------------------------------------------------------
SECRET_KEY = app.config.get('SECRET_KEY', 'alohomora')
REFRESH_SECRET_KEY = app.config.get('REFRESH_SECRET_KEY', 'expectopatronum')

ACCESS_TOKEN_EXPIRE_MINUTES = int(app.config.get('ACCESS_TOKEN_EXPIRE_MINUTES', 15))
REFRESH_TOKEN_EXPIRE_DAYS = int(app.config.get('REFRESH_TOKEN_EXPIRE_DAYS', 7))
REFRESH_TOKEN_EXPIRE_SECONDS = REFRESH_TOKEN_EXPIRE_DAYS * 24 * 60 * 60

# -----------------------------------------------------------
# 🧱 Conexão Redis
# -----------------------------------------------------------
REDIS_HOST = app.config.get('REDIS_HOST', 'localhost')
REDIS_PORT = int(app.config.get('REDIS_PORT', 6379))
REDIS_DB = int(app.config.get('REDIS_DB', 0))

try:
    redis_client = redis.Redis(
        host=REDIS_HOST,
        port=REDIS_PORT,
        db=REDIS_DB,
        decode_responses=True
    )
    redis_client.ping()
    REDIS_AVAILABLE = True
except (ConnectionError, RedisError):
    logger.warning("Redis indisponível. Continuando sem cache de tokens.")
    REDIS_AVAILABLE = False


# -----------------------------------------------------------
# 🧠 Funções auxiliares
# -----------------------------------------------------------
def _extrair_token_header():
    """Extrai o token do header Authorization."""
    auth_header = request.headers.get('Authorization')

    if not auth_header:
        return None, ERROS['token_nao_fornecido']

    partes = auth_header.split()

    if len(partes) == 2 and partes[0].lower() == 'bearer':
        return partes[1], None

    return None, ERROS['formato_invalido']


def _verificar_token(token, secret_key=SECRET_KEY):
    """Decodifica e valida o token JWT."""
    try:
        payload = jwt.decode(token, secret_key, algorithms=['HS256'])
        if REDIS_AVAILABLE and redis_client.get(f"blacklist:{token}"):
            return None, ERROS['refresh_token_invalido']
        return payload, None
    except jwt.ExpiredSignatureError:
        return None, ERROS['token_expirado']
    except jwt.InvalidTokenError:
        return None, ERROS['token_invalido']
    except Exception as e:
        logger.error(f"Erro inesperado ao verificar token: {e}")
        return None, ERROS['token_invalido']


def _serializar_empresa(empresa):
    if not empresa:
        return None
    try:
        return {
            'id': empresa.id,
            'nome': getattr(empresa, 'nome', None),
            'cnpj': getattr(empresa, 'cnpj', None),
            'email': getattr(empresa, 'email', None),
            'telefone': getattr(empresa, 'telefone', None),
            'ativo': getattr(empresa, 'ativo', None)
        }
    except Exception as exc:  # pragma: no cover - serialização defensiva
        logger.error(f"Erro ao serializar empresa: {exc}")
        return None


def _serializar_departamento(departamento):
    if not departamento:
        return None
    try:
        return {
            'id': departamento.id,
            'nome': getattr(departamento, 'nome', None),
            'descricao': getattr(departamento, 'descricao', None),
            'status': getattr(departamento, 'status', None),
            'empresa_id': getattr(departamento, 'empresa_id', None)
        }
    except Exception as exc:  # pragma: no cover - serialização defensiva
        logger.error(f"Erro ao serializar departamento: {exc}")
        return None


def _serializar_usuario(usuario):
    if not usuario:
        return {}

    usuario_data = usuario.to_json()

    departamento = getattr(usuario.cargo, 'departamento', None) if usuario.cargo else None
    if departamento:
        usuario_data['departamento'] = _serializar_departamento(departamento)
        usuario_data['empresa'] = _serializar_empresa(getattr(departamento, 'empresa', None))
    else:
        usuario_data['departamento'] = None
        usuario_data['empresa'] = None

    return usuario_data


def _enriquecer_payload_usuario(user_info):
    """Adiciona dados extras do usuário (se existirem no banco) mantendo compatibilidade."""
    if not isinstance(user_info, dict):
        return {'user': {}, 'id': None}

    try:
        usuario = Usuario.query.get(user_info.get('id'))
        if usuario:
            usuario_serializado = _serializar_usuario(usuario)
            contexto = {'user': usuario_serializado}
            contexto.update(usuario_serializado)
            return contexto
    except Exception as e:  # pragma: no cover - log para diagnósticos
        logger.error(f"Erro ao enriquecer payload de usuário: {e}")

    contexto = {'user': user_info.copy()}
    contexto.update(user_info)
    return contexto


# -----------------------------------------------------------
# 🧱 Decorators
# -----------------------------------------------------------
def token_obrigatorio(f):
    """Decorator que exige token de autenticação válido."""
    @wraps(f)
    def decorated(*args, **kwargs):
        token, erro = _extrair_token_header()
        if erro:
            return jsonify({'erro': erro}), 401

        payload, erro = _verificar_token(token)
        if erro:
            return jsonify({'erro': erro}), 401

        user_info = payload.get('identity', {}).get('user')
        if not user_info:
            return jsonify({'erro': ERROS['payload_invalido']}), 401

        request.usuario_atual = _enriquecer_payload_usuario(user_info)
        return f(*args, **kwargs)
    return decorated


def gerente_requerido(f):
    """Decorator que exige token e permissão de gerente."""
    @wraps(f)
    @token_obrigatorio
    def decorated(*args, **kwargs):
        user = getattr(request, 'usuario_atual', None)
        if not user:
            return jsonify({'erro': ERROS['erro_autenticacao_interna']}), 500

        if not user.get('eh_gerente', False):
            return jsonify({'erro': ERROS['acesso_negado_gerente']}), 403

        return f(*args, **kwargs)
    return decorated


def usuario_opcional(f):
    """Decorator que tenta autenticar o usuário, mas não obriga."""
    @wraps(f)
    def decorated(*args, **kwargs):
        token, erro = _extrair_token_header()
        if token and not erro:
            payload, erro = _verificar_token(token)
            if payload and not erro:
                user_info = payload.get('identity', {}).get('user')
                request.usuario_atual = _enriquecer_payload_usuario(user_info)
        return f(*args, **kwargs)
    return decorated


# -----------------------------------------------------------
# 🔑 Funções de geração e revogação de tokens
# -----------------------------------------------------------
def gerar_tokens(usuario):
    """Gera access token e refresh token para o usuário."""
    access_payload = {
        'identity': {'user': {'id': usuario.id, 'nome': usuario.nome, 'eh_gerente': usuario.eh_gerente}},
        'exp': datetime.datetime.utcnow() + datetime.timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    }

    refresh_payload = {
        'identity': {'user': {'id': usuario.id}},
        'exp': datetime.datetime.utcnow() + datetime.timedelta(days=REFRESH_TOKEN_EXPIRE_DAYS)
    }

    access_token = jwt.encode(access_payload, SECRET_KEY, algorithm='HS256')
    refresh_token = jwt.encode(refresh_payload, REFRESH_SECRET_KEY, algorithm='HS256')

    if REDIS_AVAILABLE:
        redis_client.setex(
            f"refresh:{usuario.id}:{refresh_token}",
            REFRESH_TOKEN_EXPIRE_SECONDS,
            'valid'
        )

    return access_token, refresh_token


def revogar_token(token):
    """Adiciona o token à blacklist (logout)."""
    if not REDIS_AVAILABLE:
        return False
    try:
        redis_client.setex(f"blacklist:{token}", REFRESH_TOKEN_EXPIRE_SECONDS, 'revogado')
        return True
    except Exception as e:
        logger.error(f"Erro ao revogar token: {e}")
        return False


def verificar_refresh_token(token):
    """Verifica se o refresh token é válido e não revogado."""
    payload, erro = _verificar_token(token, REFRESH_SECRET_KEY)
    if erro:
        return None, erro

    user_id = payload.get('identity', {}).get('user', {}).get('id')
    if not user_id:
        return None, ERROS['payload_invalido']

    if REDIS_AVAILABLE:
        chave = f"refresh:{user_id}:{token}"
        if not redis_client.get(chave):
            return None, ERROS['refresh_token_invalido']

    return payload, None
