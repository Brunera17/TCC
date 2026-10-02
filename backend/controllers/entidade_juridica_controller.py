from flask import Blueprint, request, jsonify
from services.entidade_juridica_service import EntidadeJuridicaService
from services.cliente_service import ClienteService

from middleware.autenticacao_middleware import token_obrigatorio
from middleware.acesso_empresa import usuario_eh_admin, usuario_tem_acesso_empresa

bp = Blueprint('entidade_juridica', __name__, url_prefix='/api/entidades-juridicas')
service = EntidadeJuridicaService()
service_cliente = ClienteService()

@bp.route('/', methods=['GET'])
@token_obrigatorio
def get_entidades_juridicas():
    entidades = service.get_all()
    if not usuario_eh_admin():
        entidades = [e for e in entidades if usuario_tem_acesso_empresa(e.empresa_id)]
    return jsonify([entidade.to_json() for entidade in entidades])

@bp.route('/<int:entidade_id>', methods=['GET'])
@token_obrigatorio
def get_entidade_juridica(entidade_id):
    entidade = service.get_by_id(entidade_id)
    if not entidade:
        return jsonify({'error': 'Entidade jurídica não encontrada'}), 404
    if not usuario_tem_acesso_empresa(entidade.empresa_id):
        return jsonify({'error': 'Acesso negado para esta entidade jurídica'}), 403
    return jsonify(entidade.to_json())

@bp.route('/', methods=['POST'])
@token_obrigatorio
def criar_entidade_juridica():
    data = request.get_json()
    if not data:
        return jsonify({'error': 'Dados não fornecidos'}), 400

    cliente = service_cliente.get_by_id(data.get('cliente_id')) if data.get('cliente_id') else None
    if not cliente:
        return jsonify({'error': 'Cliente não encontrado'}), 404
    if not usuario_tem_acesso_empresa(cliente.empresa_id):
        return jsonify({'error': 'Cliente não pertence à sua empresa'}), 403
    # A entidade jurídica sempre herda a empresa do cliente ao qual pertence.
    data['empresa_id'] = cliente.empresa_id

    try:
        entidade = service.criar_entidade_juridica(**data)
        return jsonify(entidade.to_json()), 201
    except ValueError as e:
        return jsonify({'error': str(e)}), 400

@bp.route('/<int:entidade_id>', methods=['PUT'])
@token_obrigatorio
def atualiza_entidade_juridica(entidade_id):
    data = request.get_json()
    if not data:
        return jsonify({'error': 'Dados não fornecidos'}), 400

    entidade_existente = service.get_by_id(entidade_id)
    if not entidade_existente:
        return jsonify({'error': 'Entidade jurídica não encontrada'}), 404
    if not usuario_tem_acesso_empresa(entidade_existente.empresa_id):
        return jsonify({'error': 'Acesso negado para esta entidade jurídica'}), 403
    # Nem empresa_id nem cliente_id podem ser trocados por aqui - trocar o
    # cliente dono mudaria também a empresa e não há por onde revalidar isso.
    data.pop('empresa_id', None)
    data.pop('cliente_id', None)

    try:
        entidade = service.atualizar_entidade_juridica(entidade_id, **data)
        return jsonify(entidade.to_json()), 200
    except ValueError as e:
        return jsonify({'error': str(e)}), 400

@bp.route('/<int:entidade_id>', methods=['DELETE'])
@token_obrigatorio
def deletar_entidade_juridica(entidade_id):
    entidade_existente = service.get_by_id(entidade_id)
    if not entidade_existente:
        return jsonify({'error': 'Entidade jurídica não encontrada'}), 404
    if not usuario_tem_acesso_empresa(entidade_existente.empresa_id):
        return jsonify({'error': 'Acesso negado para esta entidade jurídica'}), 403

    try:
        entidade = service.deletar_entidade_juridica(entidade_id)
        return jsonify(entidade.to_json()), 200
    except ValueError as e:
        return jsonify({'error': str(e)}), 400