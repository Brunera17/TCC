from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity, create_access_token
from config import db
from models import Funcionario
from werkzeug.security import check_password_hash
import datetime
from app.utils.decorators import handle_api_errors
from app.utils.validators import validate_required_fields
from app.utils.pagination import paginate_query
from app.utils.filters import build_search_filters

api = Blueprint('api', __name__, url_prefix='/api')

@api.route('/autenticar', methods=['POST'])
@handle_api_errors
def autenticar():
    try:
        data = request.get_json() or {}
        email = (data.get('email') or '').strip().lower()
        senha = data.get('senha') or ''

        if not email or not senha:
            return jsonify({"message": "E-mail e senha obrigatórios"})

        func = Funcionario.query.filter_by(email=email).first()
        
        if not func:
            return jsonify({"message": "E-mail não encontrado"}), 404
        
        if not func.senha_hash:
            return jsonify({"message": "senha não cadastrada para este usuário"}), 400
        
        if not check_password_hash(func.senha_hash, senha):
            return jsonify({"message": "Senha incorreta"}), 401

        token = create_access_token(
            identity=str(func.id),
            additional_claims={"email": func.email, "nome": func.nome}
        )
        return jsonify({"token": token}), 200
    
    except Exception as e:
        import traceback
        traceback.print_exc()  # imprime no console o erro detalhado
        return jsonify({"message": "Erro interno no servidor", "details": str(e)}), 500
    
@api.route('/funcionarios', methods=['GET'])
@handle_api_errors
def listar_funcionarios():
    page = request.args.get('page', 1, type=int)
    per_page = request.args.get('per_page', 20, type=int)
    termo = request.args.get('search', '', type=str)

    filters = build_search_filters(Funcionario, termo, ['nome', 'email', 'cargo'])
    query = Funcionario.query.filter(*filters)

    pagination = paginate_query(query, page=page, per_page=per_page)
    funcionarios = [f.to_json() for f in pagination.items]

    return jsonify({
        'funcionarios': funcionarios,
        'total': pagination.total,
        'pages': pagination.pages,
        'page': page,
    })
