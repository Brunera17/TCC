from flask import Blueprint, request, jsonify
from services.usuario_service import UsuarioService
from middleware.autenticacao_middleware import token_obrigatorio

bp = Blueprint('funcionarios', __name__, url_prefix='/api/funcionarios')
service = UsuarioService()

# ==============================================
# 👥 ENDPOINTS PARA FUNCIONÁRIOS (alias para usuários)
# ==============================================

@bp.route('/', methods=['GET'])
@token_obrigatorio
def listar_funcionarios():
    """Lista todos os funcionários (usuários)"""
    try:
        funcionarios = service.get_all()
        return jsonify([funcionario.to_json() for funcionario in funcionarios]), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@bp.route('/', methods=['POST'])
@token_obrigatorio
def criar_funcionario():
    """Cria ou reativa um funcionário"""
    try:
        payload = request.get_json() or {}
        funcionario = service.criar_usuario(**payload)
        return jsonify(funcionario.to_json()), 201
    except ValueError as e:
        return jsonify({'error': str(e)}), 400
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@bp.route('/<int:funcionario_id>', methods=['GET'])
@token_obrigatorio
def get_funcionario_por_id(funcionario_id):
    """Busca funcionário por ID"""
    try:
        funcionario = service.get_by_id(funcionario_id)
        if not funcionario:
            return jsonify({'error': 'Funcionário não encontrado'}), 404
        return jsonify(funcionario.to_json()), 200
    except ValueError as e:
        return jsonify({'error': str(e)}), 404
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@bp.route('/<int:funcionario_id>', methods=['PUT'])
@token_obrigatorio
def atualizar_funcionario(funcionario_id):
    """Atualiza dados de um funcionário"""
    try:
        payload = request.get_json() or {}
        funcionario = service.atualizar_usuario(funcionario_id, **payload)
        return jsonify(funcionario.to_json()), 200
    except ValueError as e:
        return jsonify({'error': str(e)}), 400
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@bp.route('/<int:funcionario_id>', methods=['DELETE'])
@token_obrigatorio
def deletar_funcionario(funcionario_id):
    """Desativa um funcionário"""
    try:
        service.deletar_usuario(funcionario_id)
        return jsonify({'message': 'Funcionário desativado com sucesso'}), 200
    except ValueError as e:
        return jsonify({'error': str(e)}), 404
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@bp.route('/buscar', methods=['GET'])
@token_obrigatorio
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