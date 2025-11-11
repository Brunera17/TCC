# middleware/autenticacao_middleware.py

from functools import wraps
from flask import request, jsonify
import jwt
import datetime
import os
import traceback
import logging
import redis # Importar redis
from redis.exceptions import ConnectionError, RedisError # Importar exceções do Redis

# Configurar um logger básico (melhor configurar centralmente no app Flask)
# logger = logging.getLogger(__name__)
# logging.basicConfig(level=logging.INFO) # Ajuste o nível conforme necessário

# --- Configuração ---

# Chaves secretas - OBRIGATÓRIAS no ambiente
SECRET_KEY = os.environ.get('SECRET_KEY', 'alohomora')
REFRESH_SECRET_KEY = os.environ.get('REFRESH_SECRET_KEY', 'expectopatronum')

if not SECRET_KEY or not REFRESH_SECRET_KEY:
    raise ValueError("As variáveis de ambiente SECRET_KEY e REFRESH_SECRET_KEY devem ser configuradas.")

# Tempos de expiração (configuráveis via ambiente, com padrões)
ACCESS_TOKEN_EXPIRE_MINUTES = int(os.environ.get('ACCESS_TOKEN_EXPIRE_MINUTES', 15))
REFRESH_TOKEN_EXPIRE_DAYS = int(os.environ.get('REFRESH_TOKEN_EXPIRE_DAYS', 7))
REFRESH_TOKEN_EXPIRE_SECONDS = REFRESH_TOKEN_EXPIRE_DAYS * 24 * 60 * 60

# Configuração do Redis (idealmente vinda de config/env)
REDIS_HOST = os.environ.get('REDIS_HOST', 'localhost')
REDIS_PORT = int(os.environ.get('REDIS_PORT', 6379))
REDIS_DB = int(os.environ.get('REDIS_DB', 0))

# Tentar conectar ao Redis
try:
    redis_conn = redis.StrictRedis(
        host=REDIS_HOST,
        port=REDIS_PORT,
        db=REDIS_DB,
        decode_responses=True # Decodificar respostas de bytes para strings
    )
    redis_conn.ping() # Verifica a conexão
    # logger.info(f"Conectado ao Redis em {REDIS_HOST}:{REDIS_PORT}, DB: {REDIS_DB}")
except ConnectionError as e:
    # logger.error(f"Não foi possível conectar ao Redis: {e}", exc_info=True)
    # Decide o que fazer - falhar ao iniciar ou continuar sem persistência de token?
    # Por segurança, é melhor falhar se a persistência é crucial.
    raise ConnectionError(f"Falha ao conectar ao Redis: {e}") from e

# --- Funções Auxiliares Redis ---

def _get_redis_key_for_jti(jti):
    """Cria uma chave padronizada para armazenar no Redis."""
    return f"refresh_token:{jti}"

def _add_jti_to_allowlist(jti, user_id):
    """Adiciona o JTI à allowlist no Redis com expiração."""
    try:
        key = _get_redis_key_for_jti(jti)
        # Armazena o user_id (ou apenas '1') com expiração igual ao token
        redis_conn.setex(key, REFRESH_TOKEN_EXPIRE_SECONDS, str(user_id))
        # logger.debug(f"JTI {jti} adicionado à allowlist do Redis com TTL de {REFRESH_TOKEN_EXPIRE_SECONDS}s.")
        return True
    except (ConnectionError, RedisError) as e:
        # logger.error(f"Erro ao adicionar JTI {jti} ao Redis: {e}", exc_info=True)
        return False

def _is_jti_in_allowlist(jti):
    """Verifica se o JTI existe na allowlist do Redis."""
    try:
        key = _get_redis_key_for_jti(jti)
        exists = redis_conn.exists(key)
        # logger.debug(f"Verificação de JTI {jti} na allowlist do Redis: {'Existe' if exists else 'Não existe'}")
        return exists
    except (ConnectionError, RedisError) as e:
        # logger.error(f"Erro ao verificar JTI {jti} no Redis: {e}", exc_info=True)
        # Em caso de erro de conexão, consideramos o token inválido por segurança? Ou permitimos?
        # Por segurança, é melhor falhar fechado.
        return False

def _remove_jti_from_allowlist(jti):
    """Remove o JTI da allowlist no Redis."""
    try:
        key = _get_redis_key_for_jti(jti)
        deleted_count = redis_conn.delete(key)
        # logger.info(f"Tentativa de remover JTI {jti} da allowlist do Redis. Removido: {deleted_count > 0}")
        return deleted_count > 0
    except (ConnectionError, RedisError) as e:
        # logger.error(f"Erro ao remover JTI {jti} do Redis: {e}", exc_info=True)
        return False

# --- Geração de Tokens ---

def gerar_token(user_identity):
    if not isinstance(user_identity, dict) or 'user_id' not in user_identity:
        raise TypeError("Payload de identidade do usuário deve ser um dicionário com 'user_id'.")

    payload = {
        "identity": user_identity,
        "type": "access",
        "exp": datetime.datetime.utcnow() + datetime.timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES),
        "iat": datetime.datetime.utcnow(),
        "jti": os.urandom(16).hex()
    }
    return jwt.encode(payload, SECRET_KEY, algorithm="HS256")

def gerar_refresh_token(user_identity):
    if not isinstance(user_identity, dict) or 'user_id' not in user_identity:
        raise TypeError("Payload de identidade do usuário deve ser um dicionário com 'user_id'.")

    payload = {
        "identity": user_identity,
        "type": "refresh",
        "exp": datetime.datetime.utcnow() + datetime.timedelta(days=REFRESH_TOKEN_EXPIRE_DAYS),
        "iat": datetime.datetime.utcnow(),
        "jti": os.urandom(16).hex()
    }
    token = jwt.encode(payload, REFRESH_SECRET_KEY, algorithm="HS256")

    # Adiciona o JTI à allowlist no Redis
    if not _add_jti_to_allowlist(payload['jti'], user_identity['user_id']):
        # Falha ao salvar no Redis - O que fazer? Lançar exceção? Logar erro grave?
        # Depende do requisito. Se for crítico, lançar exceção.
        # logger.critical(f"Falha CRÍTICA ao adicionar JTI {payload['jti']} para user_id {user_identity['user_id']} à allowlist do Redis.")
        raise RedisError("Não foi possível registrar o refresh token.")

    return token

# --- Verificação de Tokens ---

def verificar_token(token):
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=["HS256"])
        if payload.get('type') != 'access':
            return None, "Tipo de token inválido (esperado: access)"

        return payload, None
    except jwt.ExpiredSignatureError:
        return None, "Token expirado"
    except jwt.InvalidTokenError as e:
        return None, "Token inválido"
    except Exception as e:
        traceback.print_exc()
        return None, "Erro ao verificar token"

def verificar_refresh_token(token):
    try:
        # Decodifica sem verificar assinatura para pegar JTI (mais rápido que decodificar tudo)
        unverified_payload = jwt.decode(token, options={"verify_signature": False, "verify_exp": False})
        jti = unverified_payload.get('jti')

        if not jti:
            return None, "Refresh token inválido (sem JTI)"

        # Verifica se o JTI está na allowlist do Redis
        if not _is_jti_in_allowlist(jti):
            return None, "Refresh token inválido ou revogado"

        # Agora decodifica completamente para verificar assinatura e expiração
        payload = jwt.decode(token, REFRESH_SECRET_KEY, algorithms=["HS256"])
        if payload.get('type') != 'refresh':
            return None, "Tipo de token inválido (esperado: refresh)"

        # Confirma JTI caso haja manipulação entre as decodificações (pouco provável)
        if payload.get('jti') != jti:
            return None, "Inconsistência de JTI no refresh token"

        return payload, None
    except jwt.ExpiredSignatureError:
        # A expiração do Redis deve lidar com isso, mas é bom ter o fallback
        jti_expired = jwt.decode(token, options={"verify_signature": False}).get('jti')
        if jti_expired:
            _remove_jti_from_allowlist(jti_expired) # Tenta limpar do Redis
        return None, "Refresh token expirado"
    except jwt.InvalidTokenError as e:
        return None, "Refresh token inválido"
    except Exception as e:
        traceback.print_exc()
        return None, "Erro ao verificar refresh token"

# --- Revogação e Renovação ---

def revogar_refresh_token(token):
    try:
        payload = jwt.decode(token, options={"verify_signature": False, "verify_exp": False})
        jti = payload.get('jti')

        if jti:
            _remove_jti_from_allowlist(jti)
        else:
             pass # Log warning: Tentativa de revogar token sem JTI

    except Exception as e:
         pass # Log error: Erro ao tentar revogar

def renovar_token(refresh_token):
    payload, erro = verificar_refresh_token(refresh_token)
    if erro:
        return None, erro

    user_identity = payload.get('identity')
    if not user_identity or 'user_id' not in user_identity:
        return None, "Payload de usuário inválido no refresh token"

    novo_access_token = gerar_token(user_identity)
    return novo_access_token, None

# --- Decorators (sem mudanças na lógica interna, apenas logging/prints removidos) ---

def token_obrigatório(f):
    @wraps(f)
    def decorated(*args, **kwargs):
        auth_header = request.headers.get('Authorization')

        if not auth_header:
            return jsonify({'erro': 'Token de acesso não fornecido'}), 401

        token = None
        parts = auth_header.split()
        if len(parts) == 2 and parts[0].lower() == 'bearer':
            token = parts[1]
        elif len(parts) == 1:
            token = parts[0]
        else:
            return jsonify({'erro': 'Formato de header Authorization inválido. Use: Bearer <token>'}), 401

        if not token:
            return jsonify({'erro': 'Token não encontrado no header Authorization'}), 401

        payload, erro = verificar_token(token)
        if erro:
            status_code = 401
            return jsonify({'erro': erro}), status_code

        request.usuario_atual = payload
        user_identity = payload.get('identity', {})

        return f(*args, **kwargs)

    return decorated

def gerente_requerido(f):
    @wraps(f)
    @token_obrigatório
    def decorated(*args, **kwargs):
        if not hasattr(request, 'usuario_atual') or not request.usuario_atual:
            return jsonify({'erro': 'Erro interno de autenticação'}), 500

        user_identity = request.usuario_atual.get('identity')

        if not user_identity or not isinstance(user_identity, dict) or 'user_id' not in user_identity:
            return jsonify({'erro': 'Payload de identidade inválido no token'}), 401

        is_gerente = user_identity.get('eh_gerente') is True # Ajuste conforme seu payload

        if not is_gerente:
            user_id = user_identity.get('user_id', 'N/A')
            return jsonify({'erro': 'Acesso negado. Permissões de gerente necessárias.'}), 403

        return f(*args, **kwargs)
    return decorated

def usuario_opcional(f):
    @wraps(f)
    def decorated(*args, **kwargs):
        auth_header = request.headers.get('Authorization')
        request.usuario_atual = None

        if auth_header:
            token = None
            parts = auth_header.split()
            if len(parts) == 2 and parts[0].lower() == 'bearer':
                token = parts[1]
            elif len(parts) == 1:
                token = parts[0]

            if token:
                payload, erro = verificar_token(token)
                if payload and not erro:
                    request.usuario_atual = payload

        return f(*args, **kwargs)

    return decorated