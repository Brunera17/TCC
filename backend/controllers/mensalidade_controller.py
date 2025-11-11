from flask import Blueprint, jsonify, request

from middleware.autenticacao_middleware import token_obrigatorio
from services.mensalidade_service import MensalidadeService

bp = Blueprint('mensalidades', __name__, url_prefix='/api/mensalidades')
service = MensalidadeService()


@bp.route('/buscar', methods=['POST'], strict_slashes=False)
@token_obrigatorio
def buscar_mensalidade():
    payload = request.get_json() or {}
    try:
        resultado = service.buscar_mensalidade(payload)
        return jsonify(resultado), 200
    except ValueError as exc:
        return jsonify({'error': str(exc)}), 400
    except Exception as exc:  # pragma: no cover - segurança
        return jsonify({'error': f'Erro ao calcular mensalidade: {exc}'}), 500
