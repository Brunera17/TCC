from flask import Blueprint, request, jsonify
from services.cargo_service import CargoService
from middleware.autenticacao_middleware import token_obrigatório

bp = Blueprint('cargo', __name__, url_prefix='/api/cargos')
service = CargoService()

# ==============================================
# 📋 ENDPOINTS PARA CARGOS
# ==============================================

@bp.route('/', methods=['GET'])
@token_obrigatório
def get_cargos():
    """Lista todos os cargos"""
    try:
        cargos = service.get_all()
        return jsonify([cargo.to_json() for cargo in cargos]), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@bp.route('/<int:cargo_id>', methods=['GET'])
@token_obrigatório
def get_cargo_por_id(cargo_id):
    """Busca cargo por ID"""
    try:
        cargo = service.get_by_id(cargo_id)
        return jsonify(cargo.to_json()), 200
    except ValueError as e:
        return jsonify({'error': str(e)}), 404
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@bp.route('/departamento/<int:departamento_id>', methods=['GET'])
@token_obrigatório
def get_cargos_por_departamento(departamento_id):
    """Lista cargos de um departamento específico"""
    try:
        cargos = service.get_by_departamento(departamento_id)
        return jsonify([cargo.to_json() for cargo in cargos]), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@bp.route('/buscar', methods=['GET'])
@token_obrigatório
def buscar_cargos():
    """Busca cargos por nome"""
    try:
        nome = request.args.get('nome', '').strip()
        if not nome:
            return jsonify({'error': 'Parâmetro nome é obrigatório'}), 400
        
        cargos = service.search_by_name(nome)
        return jsonify([cargo.to_json() for cargo in cargos]), 200
    except ValueError as e:
        return jsonify({'error': str(e)}), 400
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@bp.route('/', methods=['POST'])
@token_obrigatório
def criar_cargo():
    """Cria um novo cargo"""
    try:
        # Verificar se é gerente
        usuario_atual = request.usuario_atual
        if not usuario_atual['user'].get('eh_gerente'):
            return jsonify({'error': 'Acesso negado. Apenas gerentes podem criar cargos.'}), 403
        
        data = request.get_json()
        if not data:
            return jsonify({'error': 'Dados não fornecidos'}), 400
        
        cargo = service.criar_cargo(**data)
        return jsonify(cargo.to_json()), 201
    except ValueError as e:
        return jsonify({'error': str(e)}), 400
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@bp.route('/<int:cargo_id>', methods=['PUT'])
@token_obrigatório
def atualizar_cargo(cargo_id):
    """Atualiza um cargo existente"""
    try:
        # Verificar se é gerente
        usuario_atual = request.usuario_atual
        if not usuario_atual['user'].get('eh_gerente'):
            return jsonify({'error': 'Acesso negado. Apenas gerentes podem atualizar cargos.'}), 403
        
        data = request.get_json()
        if not data:
            return jsonify({'error': 'Dados não fornecidos'}), 400
        
        cargo = service.atualizar_cargo(cargo_id, **data)
        return jsonify(cargo.to_json()), 200
    except ValueError as e:
        return jsonify({'error': str(e)}), 400
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@bp.route('/<int:cargo_id>', methods=['DELETE'])
@token_obrigatório
def deletar_cargo(cargo_id):
    """Remove um cargo"""
    try:
        # Verificar se é gerente
        usuario_atual = request.usuario_atual
        if not usuario_atual['user'].get('eh_gerente'):
            return jsonify({'error': 'Acesso negado. Apenas gerentes podem deletar cargos.'}), 403
        
        service.deletar_cargo(cargo_id)
        return jsonify({'message': 'Cargo removido com sucesso'}), 200
    except ValueError as e:
        return jsonify({'error': str(e)}), 400
    except Exception as e:
        return jsonify({'error': str(e)}), 500