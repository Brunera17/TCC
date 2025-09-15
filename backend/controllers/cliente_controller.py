import json
from flask import Blueprint, request, jsonify
from services.cliente_service import ClienteService
from services.endereco_service import EnderecoService
from services.entidade_juridica_service import EntidadeJuridicaService

bp = Blueprint('cliente', __name__, url_prefix='/api/clientes')
service_cliente = ClienteService()
service_endereco = EnderecoService()
service_entidade = EntidadeJuridicaService()

@bp.route('/', methods=['GET'])
def get_clientes():
    clientes = service_cliente.get_all()
    return jsonify([cliente.to_json() for cliente in clientes])

@bp.route('/<int:cliente_id>', methods=['GET'])
def get_cliente_especifico(cliente_id):
    cliente = service_cliente.get_by_id(cliente_id)
    if not cliente:
        return jsonify({'error': 'Cliente não encontrado'}), 404
    
    # Busca dados relacionados
    enderecos = service_endereco.get_by_cliente(cliente_id)
    
    # Monta resposta
    response = cliente.to_json()
    if enderecos:
        response['enderecos'] = [endereco.to_json() for endereco in enderecos]
    
    return jsonify(response)

@bp.route('/', methods=['POST'])
def criar_cliente():
    data = request.get_json()
    if not data:
        return jsonify({'error': 'Dados não fornecidos'}), 400
    
    try:
        cliente = service_cliente.criar_cliente(**data)
        return jsonify(cliente.to_json()), 201
    except ValueError as e:
        return jsonify({'error': str(e)}), 400

@bp.route('/<int:cliente_id>', methods=['PUT'])
def altera_cliente(cliente_id):
    data = request.get_json()
    if not data:
        return jsonify({'error': 'Dados para atualização não encontrados'}), 400
    
    try:
        cliente = service_cliente.atualiza_cliente(cliente_id, **data)
        return jsonify(cliente.to_json()), 200
    except ValueError as e:
        return jsonify({'error': str(e)}), 400

@bp.route('/<int:cliente_id>', methods=['DELETE'])
def deleta_cliente(cliente_id):
    try:
        cliente = service_cliente.deletar_cliente(cliente_id)
        return jsonify(cliente.to_json()), 200
    except ValueError as e:
        return jsonify({'error': str(e)}), 400