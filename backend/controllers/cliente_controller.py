import json
import logging
from flask import Blueprint, request, jsonify
from services.cliente_service import ClienteService
from services.endereco_service import EnderecoService
from services.entidade_juridica_service import EntidadeJuridicaService
from sqlalchemy.exc import IntegrityError
from middleware.autenticacao_middleware import token_obrigatorio
from middleware.acesso_empresa import empresa_id_usuario, usuario_eh_admin, usuario_tem_acesso_empresa

logger = logging.getLogger(__name__)

bp = Blueprint('cliente', __name__, url_prefix='/api/clientes')
service_cliente = ClienteService()
service_endereco = EnderecoService()
service_entidade = EntidadeJuridicaService()

@bp.route('/', methods=['GET'])
@token_obrigatorio
def get_clientes():
    clientes = service_cliente.get_all()
    if not usuario_eh_admin():
        empresa_id = empresa_id_usuario()
        clientes = [c for c in clientes if c.empresa_id == empresa_id]
    return jsonify([cliente.to_json() for cliente in clientes])

@bp.route('/<int:cliente_id>', methods=['GET'])
@token_obrigatorio
def get_cliente_especifico(cliente_id):
    cliente = service_cliente.get_by_id(cliente_id)
    if not cliente:
        return jsonify({'error': 'Cliente não encontrado'}), 404
    if not usuario_tem_acesso_empresa(cliente.empresa_id):
        return jsonify({'error': 'Acesso negado para este cliente'}), 403

    # Busca dados relacionados
    enderecos = service_endereco.get_by_cliente(cliente_id)

    # Monta resposta
    response = cliente.to_json()
    if enderecos:
        response['enderecos'] = [endereco.to_json() for endereco in enderecos]

    return jsonify(response)

@bp.route('/', methods=['POST'])
@token_obrigatorio
def criar_cliente():
    try:
        data = request.get_json()
        if not data:
            return jsonify({'error': 'Dados não fornecidos'}), 400

        empresa_id = empresa_id_usuario()
        if not usuario_eh_admin():
            if not empresa_id:
                return jsonify({'error': 'Usuário não está vinculado a uma empresa.'}), 403
            if data.get('empresa_id') and data['empresa_id'] != empresa_id:
                return jsonify({'error': 'Empresa informada não corresponde ao usuário autenticado.'}), 403
            data['empresa_id'] = empresa_id
        elif not data.get('empresa_id'):
            data['empresa_id'] = empresa_id
        if not data.get('empresa_id'):
            return jsonify({'error': 'Campo empresa_id é obrigatório.'}), 400

        cliente = service_cliente.criar_cliente(**data)
        return jsonify(cliente.to_json()), 201
    except ValueError as e:
        logger.warning("Erro de validação ao criar cliente: %s", e)
        return jsonify({'error': str(e)}), 400
    except IntegrityError as e:
        # Erro de unicidade em banco - retorna 409 Conflict com detalhe
        logger.warning("Conflito de integridade ao criar cliente: %s", e)
        return jsonify({'error': 'Conflito ao criar cliente', 'details': str(e)}), 409
    except Exception as e:
        logger.exception("Erro inesperado ao criar cliente")
        return jsonify({'error': f'Erro interno do servidor: {str(e)}'}), 500

@bp.route('/<int:cliente_id>', methods=['PUT'])
@token_obrigatorio
def altera_cliente(cliente_id):
    data = request.get_json()
    if not data:
        return jsonify({'error': 'Dados para atualização não encontrados'}), 400

    cliente_existente = service_cliente.get_by_id(cliente_id)
    if not cliente_existente:
        return jsonify({'error': 'Cliente não encontrado'}), 404
    if not usuario_tem_acesso_empresa(cliente_existente.empresa_id):
        return jsonify({'error': 'Acesso negado para este cliente'}), 403
    if not usuario_eh_admin():
        data.pop('empresa_id', None)
    elif data.get('empresa_id') and data['empresa_id'] != cliente_existente.empresa_id:
        return jsonify({'error': 'Não é possível alterar a empresa do cliente'}), 403

    try:
        cliente = service_cliente.atualizar_cliente(cliente_id, **data)
        return jsonify(cliente.to_json()), 200
    except ValueError as e:
        return jsonify({'error': str(e)}), 400

@bp.route('/<int:cliente_id>', methods=['DELETE'])
@token_obrigatorio
def deletar_cliente(cliente_id):
    cliente_existente = service_cliente.get_by_id(cliente_id)
    if not cliente_existente:
        return jsonify({'error': 'Cliente não encontrado'}), 404
    if not usuario_tem_acesso_empresa(cliente_existente.empresa_id):
        return jsonify({'error': 'Acesso negado para este cliente'}), 403

    try:
        cliente = service_cliente.deletar_cliente(cliente_id)
        return jsonify(cliente.to_json()), 200
    except ValueError as e:
        return jsonify({'error': str(e)}), 400