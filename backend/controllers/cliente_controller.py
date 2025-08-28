import json
from flask import Blueprint, request, jsonify
from services.cliente_service import ClienteService
from services.endereco_service import EnderecoService
from services.entidade_juridica import EntidadeJuridica

bp = Blueprint('cliente', __name__, url_prefix='/api/clientes')
serviceCliente = ClienteService()
serviceEndereco = EnderecoService()
serviceEntidade = EntidadeJuridica()

@bp.route('/', methods = ['GET'])
def get_clientes():
    clientes = serviceCliente.get_all()
    return jsonify([cliente.to_json() for cliente in clientes])
@bp.route('/<int:cliente_id>', methods=['GET'])
def get_cliente_especifico(id):
    cliente = serviceCliente.get_by_id(id)
    endereco = serviceEndereco.get_by_cliente(id)
    entidade = serviceEntidade.get_by_cliente(id)

    dados = []
    if not cliente:
        return jsonify({'error': 'Empresa não encontrada'}), 400
    if not endereco:
        if not entidade:
            dados = jsonify(cliente.to_json())
        else:
            dados = jsonify(cliente.to_json(), entidade.to_json())
    else:
        if not entidade:
            dados = jsonify(cliente.to_json(), endereco.to_json())
        dados = jsonify(cliente.to_json(), endereco.to_json(), entidade.to_json())
    return dados

@bp.route('/', methods=['POST'])
def criar_cliente():
    data = request.get_json()
    if not data:
        return jsonify({'error': 'Dados não fornecidos'}), 400
    
    try: 
        cliente = serviceCliente.criar_cliente(**data)
        return jsonify(cliente.to_json()), 201
    except ValueError as e:
        return jsonify({'error': str(e)}), 400

@bp.route('/<int:cliente_id', methods=['PUT'])
def altera_cliente(id):
    data = request.get_json()
    if not data:
        return jsonify({'error': 'Dados para atualização não encontrados'}), 400
    
    try:
        cliente = serviceCliente.atualiza_cliente(id, **data)
        return jsonify(cliente.to_json()), 200
    except ValueError as e:
        return jsonify({'error': str(e)}),400
@bp.route('/<int:cliente_id>', methods=['DELETE'])
def deleta_cliente(id):
    if not id:
        return jsonify({'error': 'ID do cliente não fornecido'})
    
    try:
        cliente = serviceCliente.deletar_cliente(id)
        return jsonify(cliente.to_json()), 200
    except ValueError as e:
        return jsonify({'error': str(e)}), 400