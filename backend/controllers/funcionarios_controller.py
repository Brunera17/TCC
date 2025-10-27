from flask import Blueprint, request, jsonify
from services.usuario_service import UsuarioService
from middleware.autenticacao_middleware import token_obrigatório

bp = Blueprint('funcionarios', __name__, url_prefix='/api/funcionarios')
service = UsuarioService()

# ==============================================
# 👥 ENDPOINTS PARA FUNCIONÁRIOS (alias para usuários)
# ==============================================

@bp.route('/', methods=['GET'])
@token_obrigatório
def listar_funcionarios():
    """Lista todos os funcionários (usuários)"""
    try:
        funcionarios = service.get_all()
        return jsonify([funcionario.to_json() for funcionario in funcionarios]), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@bp.route('/<int:funcionario_id>', methods=['GET'])
@token_obrigatório
def get_funcionario_por_id(funcionario_id):
    """Busca funcionário por ID"""
    try:
        funcionario = service.get_by_id(funcionario_id)
        return jsonify(funcionario.to_json()), 200
    except ValueError as e:
        return jsonify({'error': str(e)}), 404
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@bp.route('/buscar', methods=['GET'])
@token_obrigatório
def buscar_funcionarios():
    """Busca funcionários por nome ou email"""
    try:
        termo = request.args.get('termo', '').strip()
        if not termo:
            return jsonify({'error': 'Parâmetro termo é obrigatório'}), 400
        
        funcionarios = service.search_by_name_or_email(termo)
        return jsonify([funcionario.to_json() for funcionario in funcionarios]), 200
    except ValueError as e:
        return jsonify({'error': str(e)}), 400
    except Exception as e:
        return jsonify({'error': str(e)}), 500