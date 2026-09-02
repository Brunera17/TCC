from flask import Blueprint, request, jsonify
from services.endereco_service import EnderecoService
from services.cliente_service import ClienteService

from middleware.autenticacao_middleware import token_obrigatorio
from middleware.acesso_empresa import usuario_eh_admin, usuario_tem_acesso_empresa

bp = Blueprint('endereco', __name__, url_prefix='/api/enderecos')
service = EnderecoService()
service_cliente = ClienteService()


def _tem_acesso_endereco(endereco) -> bool:
    """Endereco não tem empresa_id próprio: o acesso é derivado do cliente dono dele."""
    if not endereco or not endereco.cliente:
        return False
    return usuario_tem_acesso_empresa(endereco.cliente.empresa_id)


@bp.route('/', methods=['GET'])
@token_obrigatorio
def get_enderecos():
    enderecos = service.get_all()
    if not usuario_eh_admin():
        enderecos = [e for e in enderecos if _tem_acesso_endereco(e)]
    return jsonify([endereco.to_json() for endereco in enderecos])

@bp.route('/<int:endereco_id>', methods=['GET'])
@token_obrigatorio
def get_endereco_por_id(endereco_id):
    endereco = service.get_by_id(endereco_id)
    if not endereco:
        return jsonify({'error': 'Endereço não encontrado'}), 404
    if not _tem_acesso_endereco(endereco):
        return jsonify({'error': 'Acesso negado para este endereço'}), 403
    return jsonify(endereco.to_json())

@bp.route('/', methods=['POST'])
@token_obrigatorio
def criar_endereco():
    data = request.get_json()
    if not data:
        return jsonify({'error': 'Dados de endereço faltando'}), 400

    cliente = service_cliente.get_by_id(data.get('cliente_id')) if data.get('cliente_id') else None
    if not cliente:
        return jsonify({'error': 'Cliente não encontrado'}), 404
    if not usuario_tem_acesso_empresa(cliente.empresa_id):
        return jsonify({'error': 'Cliente não pertence à sua empresa'}), 403

    try:
        endereco = service.criar_endereco(**data)
        return jsonify(endereco.to_json()), 201
    except ValueError as e:
        return jsonify({'error': str(e)}), 400

@bp.route('/<int:endereco_id>', methods=['PUT'])
@token_obrigatorio
def atualizar_endereco(endereco_id):
    data = request.get_json()
    if not data:
        return jsonify({'error': 'Dados para atualização incompletos'}), 400

    endereco_existente = service.get_by_id(endereco_id)
    if not endereco_existente:
        return jsonify({'error': 'Endereço não encontrado'}), 404
    if not _tem_acesso_endereco(endereco_existente):
        return jsonify({'error': 'Acesso negado para este endereço'}), 403
    data.pop('cliente_id', None)

    try:
        endereco = service.atualizar_endereco(endereco_id, **data)
        return jsonify(endereco.to_json()), 200
    except ValueError as e:
        return jsonify({'error': str(e)}), 400

@bp.route('/<int:endereco_id>', methods=['DELETE'])
@token_obrigatorio
def deletar_endereco(endereco_id):
    endereco_existente = service.get_by_id(endereco_id)
    if not endereco_existente:
        return jsonify({'error': 'Endereço não encontrado'}), 404
    if not _tem_acesso_endereco(endereco_existente):
        return jsonify({'error': 'Acesso negado para este endereço'}), 403

    try:
        endereco = service.deletar_endereco(endereco_id)
        return jsonify(endereco.to_json()), 200
    except ValueError as e:
        return jsonify({'error': str(e)}), 400