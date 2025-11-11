from flask import Blueprint, jsonify, request

from middleware.autenticacao_middleware import gerente_requerido, token_obrigatorio
from services.faixa_faturamento_service import FaixaFaturamentoService

bp = Blueprint('faixa_faturamento', __name__, url_prefix='/api/faixas-faturamento')
service = FaixaFaturamentoService()


def _parse_bool(value, default=True):
    if value is None:
        return default
    if isinstance(value, bool):
        return value
    value = str(value).strip().lower()
    if value in {"true", "1", "sim", "yes"}:
        return True
    if value in {"false", "0", "nao", "não", "no"}:
        return False
    return default


@bp.route('/', methods=['GET'])
@token_obrigatorio
def listar_faixas():
    try:
        regime_id = request.args.get('regime_tributario_id', type=int)
        ativo_only = _parse_bool(request.args.get('apenas_ativas'), default=True)
        faixas = service.listar(regime_tributario_id=regime_id, ativo_only=ativo_only)
        return jsonify([faixa.to_json() for faixa in faixas]), 200
    except ValueError as exc:
        return jsonify({'error': str(exc)}), 400
    except Exception as exc:  # pragma: no cover - segurança
        return jsonify({'error': f'Erro ao listar faixas de faturamento: {exc}'}), 500


@bp.route('/<int:faixa_id>', methods=['GET'])
@token_obrigatorio
def obter_faixa(faixa_id):
    try:
        faixa = service.obter(faixa_id)
        return jsonify(faixa.to_json()), 200
    except ValueError as exc:
        return jsonify({'error': str(exc)}), 404
    except Exception as exc:  # pragma: no cover - segurança
        return jsonify({'error': f'Erro ao buscar faixa de faturamento: {exc}'}), 500


@bp.route('/', methods=['POST'])
@token_obrigatorio
@gerente_requerido
def criar_faixa():
    dados = request.get_json() or {}
    try:
        faixa = service.criar(**dados)
        return jsonify(faixa.to_json()), 201
    except ValueError as exc:
        return jsonify({'error': str(exc)}), 400
    except Exception as exc:  # pragma: no cover - segurança
        return jsonify({'error': f'Erro ao criar faixa de faturamento: {exc}'}), 500


@bp.route('/<int:faixa_id>', methods=['PUT'])
@token_obrigatorio
@gerente_requerido
def atualizar_faixa(faixa_id):
    dados = request.get_json() or {}
    try:
        faixa = service.atualizar(faixa_id, **dados)
        return jsonify(faixa.to_json()), 200
    except ValueError as exc:
        mensagem = str(exc)
        status = 404 if 'não encontrada' in mensagem.lower() else 400
        return jsonify({'error': mensagem}), status
    except Exception as exc:  # pragma: no cover - segurança
        return jsonify({'error': f'Erro ao atualizar faixa de faturamento: {exc}'}), 500


@bp.route('/<int:faixa_id>', methods=['DELETE'])
@token_obrigatorio
@gerente_requerido
def remover_faixa(faixa_id):
    try:
        faixa = service.deletar(faixa_id)
        return jsonify({'message': 'Faixa de faturamento desativada com sucesso', 'faixa': faixa.to_json()}), 200
    except ValueError as exc:
        return jsonify({'error': str(exc)}), 404
    except Exception as exc:  # pragma: no cover - segurança
        return jsonify({'error': f'Erro ao desativar faixa de faturamento: {exc}'}), 500
