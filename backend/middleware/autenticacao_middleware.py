from functools import wraps
from flask import request, jsonify
import jwt
import datetime
import os
import threading

SECRET_KEY = os.environ.get('SECRET_KEY', 'chave-secreta-muito-complexa-aqui')
REFRESH_SECRET_KEY = os.environ.get('REFRESH_SECRET_KEY', 'outra-chave-secreta-complexa')

refresh_tokens = set()
refresh_tokens_lock = threading.Lock()

def gerar_token(user):
    payload = {
        "user": user,
        "exp": datetime.datetime.utcnow() + datetime.timedelta(minutes=15)
    }
    return jwt.encode(payload, SECRET_KEY, algorithm="HS256")
    

def gerar_refresh_token(user):
    payload = {
        "user": user,
        "exp": datetime.datetime.utcnow() + datetime.timedelta(days=7)
    }
    token = jwt.encode(payload, REFRESH_SECRET_KEY, algorithm="HS256")
    with refresh_tokens_lock:
        refresh_tokens.add(token)
    return token

def verificar_token(token):
    """Verifica e decodifica token de acesso"""
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=["HS256"])
        return payload, None
    except jwt.ExpiredSignatureError:
        return None, "Token expirado"
    except jwt.InvalidTokenError:
        return None, "Token inválido"

def verificar_refresh_token(token):
    """Verifica refresh token"""
    try:
        # Verificar se o token está na lista de tokens válidos
        with refresh_tokens_lock:
            if token not in refresh_tokens:
                return None, "Refresh token revogado ou inválido"
        
        # Decodificar o token
        payload = jwt.decode(token, REFRESH_SECRET_KEY, algorithms=["HS256"])
        return payload, None
    except jwt.ExpiredSignatureError:
        # Remover token expirado da lista
        with refresh_tokens_lock:
            refresh_tokens.discard(token)
        return None, "Refresh token expirado"
    except jwt.InvalidTokenError:
        return None, "Refresh token inválido"

def revogar_refresh_token(token):
    """Remove refresh token da lista de tokens válidos"""
    with refresh_tokens_lock:
        refresh_tokens.discard(token)

def renovar_token(refresh_token):
    """Renova access token usando refresh token"""
    payload, erro = verificar_refresh_token(refresh_token)
    if erro:
        return None, erro
    
    # Gerar novo access token
    novo_access_token = gerar_token(payload['user'])
    return novo_access_token, None

def token_obrigatório(f):
    """Decorator para proteger rotas que precisam de autenticação"""
    @wraps(f)
    def decorated(*args, **kwargs):
        # Obter token do header Authorization
        auth_header = request.headers.get('Authorization')
        
        if not auth_header:
            return jsonify({'erro': 'Token de acesso não fornecido'}), 401
        
        # Extrair token (formato: "Bearer <token>")
        try:
            token_type, token = auth_header.split(' ')
            if token_type.lower() != 'bearer':
                return jsonify({'erro': 'Formato de token inválido. Use: Bearer <token>'}), 401
        except ValueError:
            # Se não conseguir fazer split, assume que o header é só o token
            token = auth_header
        
        # Verificar token
        payload, erro = verificar_token(token)
        if erro:
            return jsonify({'erro': erro}), 401
        
        # Adicionar dados do usuário ao request para uso na rota
        request.usuario_atual = payload
        
        return f(*args, **kwargs)
    
    return decorated

def usuario_opcional(f):
    """Decorator para rotas onde autenticação é opcional"""
    @wraps(f)
    def decorated(*args, **kwargs):
        auth_header = request.headers.get('Authorization')
        
        if auth_header:
            try:
                token_type, token = auth_header.split(' ')
                if token_type.lower() == 'bearer':
                    payload, _ = verificar_token(token)
                    request.usuario_atual = payload
            except:
                pass  # Ignora erros quando token é opcional
        
        if not hasattr(request, 'usuario_atual'):
            request.usuario_atual = None
        
        return f(*args, **kwargs)
    
    return decorated