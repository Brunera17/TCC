from flask import Blueprint, request, jsonify
from services.regime_tributario_service import RegimeTributarioService
from middleware.autenticacao_middleware import token_obrigatório

bp = Blueprint('regime_tributario', __name__, url_prefix='/api/regimes-tributarios')
service = RegimeTributarioService()

# ==============================================
# 📋 ENDPOINTS PARA REGIMES TRIBUTÁRIOS
# ==============================================

@bp.route('/', methods=['GET'])
@token_obrigatório
def get_regimes():
    """Lista todos os regimes tributários"""
    try:
        regimes = service.get_all()
        return jsonify([regime.to_json() for regime in regimes]), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@bp.route('/<int:regime_id>', methods=['GET'])
@token_obrigatório
def get_regime_por_id(regime_id):
    """Busca regime tributário por ID"""
    try:
        regime = service.get_by_id(regime_id)
        return jsonify(regime.to_json()), 200
    except ValueError as e:
        return jsonify({'error': str(e)}), 404
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@bp.route('/buscar', methods=['GET'])
@token_obrigatório
def buscar_regimes():
    """Busca regimes tributários por nome"""
    try:
        nome = request.args.get('nome', '').strip()
        if not nome:
            return jsonify({'error': 'Parâmetro nome é obrigatório'}), 400
        
        regimes = service.search_by_name(nome)
        return jsonify([regime.to_json() for regime in regimes]), 200
    except ValueError as e:
        return jsonify({'error': str(e)}), 400
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@bp.route('/', methods=['POST'])
@token_obrigatório
def criar_regime():
    """Cria um novo regime tributário"""
    try:
        # Verificar se é gerente
        usuario_atual = request.usuario_atual
        if not usuario_atual['user'].get('eh_gerente'):
            return jsonify({'error': 'Acesso negado. Apenas gerentes podem criar regimes tributários.'}), 403
        
        data = request.get_json()
        if not data:
            return jsonify({'error': 'Dados não fornecidos'}), 400
        
        regime = service.criar_regime(**data)
        return jsonify(regime.to_json()), 201
    except ValueError as e:
        return jsonify({'error': str(e)}), 400
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@bp.route('/<int:regime_id>', methods=['PUT'])
@token_obrigatório
def atualizar_regime(regime_id):
    """Atualiza um regime tributário existente"""
    try:
        # Verificar se é gerente
        usuario_atual = request.usuario_atual
        if not usuario_atual['user'].get('eh_gerente'):
            return jsonify({'error': 'Acesso negado. Apenas gerentes podem atualizar regimes tributários.'}), 403
        
        data = request.get_json()
        if not data:
            return jsonify({'error': 'Dados não fornecidos'}), 400
        
        regime = service.atualizar_regime(regime_id, **data)
        return jsonify(regime.to_json()), 200
    except ValueError as e:
        return jsonify({'error': str(e)}), 400
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@bp.route('/<int:regime_id>', methods=['DELETE'])
@token_obrigatório
def deletar_regime(regime_id):
    """Remove um regime tributário"""
    try:
        # Verificar se é gerente
        usuario_atual = request.usuario_atual
        if not usuario_atual['user'].get('eh_gerente'):
            return jsonify({'error': 'Acesso negado. Apenas gerentes podem deletar regimes tributários.'}), 403
        
        service.deletar_regime(regime_id)
        return jsonify({'message': 'Regime tributário removido com sucesso'}), 200
    except ValueError as e:
        return jsonify({'error': str(e)}), 400
    except Exception as e:
        return jsonify({'error': str(e)}), 500