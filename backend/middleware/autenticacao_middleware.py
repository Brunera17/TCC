from flask import request, jsonify
import jwt
import datetime
import os
import redis
import threading

SECRET_KEY = os.environ.get('SECRET_KEY', 'chave-secreta-muito-complexa-aqui')
REFRESH_SECRET_KEY = os.environ.get('REFRESH_SECRET_KEY', 'outra-chave-secreta-complexa')

refresh_token_db = []

# Usar Redis ou banco de dados
redis_client = redis.Redis(host='localhost', port=6379, db=0)

# Ou usar set thread-safe
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
    refresh_token_db.append(token)
    return token