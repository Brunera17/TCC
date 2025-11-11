from flask import Blueprint, request, jsonify
from middleware.autenticacao_middleware import token_obrigatorio, gerente_requerido
from services.regime_tributario_service import RegimeTributarioService

bp = Blueprint('regime_tributario', __name__, url_prefix='/api/regimes-tributarios')
service = RegimeTributarioService()

@bp.route('/', methods=['GET'])
@token_obrigatorio
def get_regimes():
    try:
        ativo_only = request.args.get('ativo', 'true').lower() == 'true'
        regimes = service.get_all(ativo_only=ativo_only)
        return jsonify([regime.to_json() for regime in regimes]), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@bp.route('/<int:regime_id>', methods=['GET'], strict_slashes=False)
@token_obrigatorio
def get_regime_por_id(regime_id):
    try:
        regime = service.get_by_id(regime_id)
        if not regime:
            return jsonify({'error': 'Regime Tributário não encontrado'}), 404
        return jsonify(regime.to_json()), 200
    except ValueError as e:
        return jsonify({'error': str(e)}), 404
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@bp.route('/buscar', methods=['GET'])
@token_obrigatorio
def buscar_regimes():
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
@token_obrigatorio
@gerente_requerido
def criar_regime():
    data = request.get_json()
    if not data:
        return jsonify({'error': 'Dados não fornecidos'}), 400

    if 'nome' not in data or not data['nome'].strip():
        return jsonify({'error': 'Campo Nome é obrigatório'}), 400
    try:
        regime = service.criar_regime(**data)
        status_code = 201
        return jsonify(regime.to_json()), status_code
    except ValueError as e:
        return jsonify({'error': str(e)}), 400
    except Exception as e:
        print(f"ERRO INTERNO ao criar regime: {e}")
        return jsonify({'error': 'Erro interno ao criar regime tributário'}), 500

@bp.route('/<int:regime_id>', methods=['PUT'], strict_slashes=False)
@token_obrigatorio
@gerente_requerido
def atualizar_regime(regime_id):
    data = request.get_json()
    if not data:
        return jsonify({'error': 'Dados para atualização não fornecidos'}), 400

    try:
        regime = service.atualizar_regime(regime_id, **data)
        return jsonify(regime.to_json()), 200
    except ValueError as e:
        status_code = 404 if "não encontrado" in str(e).lower() else 400
        return jsonify({'error': str(e)}), status_code
    except Exception as e:
        print(f"ERRO INTERNO ao atualizar regime {regime_id}: {e}")
        return jsonify({'error': 'Erro interno ao atualizar regime tributário'}), 500

@bp.route('/<int:regime_id>', methods=['DELETE'], strict_slashes=False)
@token_obrigatorio
@gerente_requerido
def deletar_regime(regime_id):
    try:
        service.deletar_regime(regime_id)
        return jsonify({'message': 'Regime Tributário desativado com sucesso'}), 200
    except ValueError as e:
        return jsonify({'error': str(e)}), 404
    except Exception as e:
        print(f"ERRO INTERNO ao deletar regime {regime_id}: {e}")
        return jsonify({'error': 'Erro interno ao desativar regime tributário'}), 500