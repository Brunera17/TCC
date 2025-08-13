from flask import current_app, jsonify
from sqlalchemy.exc import IntegrityError
from config import db
from functools import wraps

def handle_api_errors(f):
    """Decorator para tratamento padronizado de erros da API"""
    @wraps(f)
    def decorated_function(*args, **kwargs):
        try:
            return f(*args, **kwargs)
        except IntegrityError as e:
            db.session.rollback()
            current_app.logger.error(f"Erro de integridade: {str(e)}")
            return jsonify({'error': 'Dados duplicados ou violação de integridade'}), 409
        except ValueError as e:
            db.session.rollback()
            current_app.logger.error(f"Erro de validação: {str(e)}")
            return jsonify({'error': str(e)}), 400
        except Exception as e:
            db.session.rollback()
            current_app.logger.error(f"Erro interno: {str(e)}\n{traceback.format_exc()}")
            return jsonify({'error': 'Erro interno do servidor'}), 500
    return decorated_function
