from flask import Blueprint, jsonify, request

from middleware.autenticacao_middleware import token_obrigatorio
from services.notificacao_service import NotificacaoService

bp = Blueprint('notificacoes', __name__, url_prefix='/api/notificacoes')
service = NotificacaoService()


def _normalizar_lista(valor: str | None) -> list[str] | None:
    if not valor:
        return None
    itens = [item.strip() for item in valor.split(',') if item.strip()]
    return itens or None


def _responder_listagem_vencimentos():
    try:
        dias = request.args.get('dias', default=7, type=int)
        incluir_atrasadas = request.args.get('incluir_atrasadas', default='true').lower() != 'false'
        status_param = _normalizar_lista(request.args.get('status'))

        notificacoes = service.get_notificacoes_vencimento(
            dias_limite=dias,
            status=status_param,
            incluir_atrasadas=incluir_atrasadas,
        )

        return jsonify({
            'data': notificacoes,
            'total': len(notificacoes),
            'filtros': {
                'dias': dias,
                'status': status_param,
                'incluir_atrasadas': incluir_atrasadas,
            }
        }), 200
    except ValueError as exc:
        return jsonify({'error': str(exc)}), 400
    except Exception as exc:
        return jsonify({'error': f'Erro ao listar notificações: {str(exc)}'}), 500

@bp.route('/nao-lidas', methods=['GET'])
@token_obrigatorio
def listar_notificacoes_nao_lidas():
    try:
        usuario = getattr(request, 'usuario_atual', None)
        if not usuario or not usuario.get('id'):
            return jsonify({'error': 'Usuário não autenticado'}), 401
        notificacoes = service.get_notificacoes_nao_lidas(usuario_id=usuario['id'])
        return jsonify({'data': notificacoes, 'total': len(notificacoes)}), 200
    except Exception as exc:
        return jsonify({'error': f'Erro ao listar notificações não lidas: {str(exc)}'}), 500


@bp.route('/vencimentos', methods=['GET'])
@token_obrigatorio
def listar_notificacoes_vencimento():
    return _responder_listagem_vencimentos()


@bp.route('/vencimento', methods=['GET'])
@bp.route('/vencimento/', methods=['GET'])
@token_obrigatorio
def listar_notificacoes_vencimento_compat():
    return _responder_listagem_vencimentos()


@bp.route('/vencimento/<int:notificacao_id>/marcar-lida/', methods=['POST'])
@token_obrigatorio
def marcar_notificacao_vencimento_como_lida(notificacao_id):
    try:
        notificacao = service.marcar_lida(notificacao_id)
        return jsonify({'data': notificacao, 'success': True}), 200
    except ValueError as exc:
        return jsonify({'error': str(exc)}), 404
    except Exception as exc:
        return jsonify({'error': f'Erro ao marcar notificação como lida: {str(exc)}'}), 500
