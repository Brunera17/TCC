import json
from flask import Blueprint, request, jsonify
from services.proposta_services import PropostaService
from services.cliente_service import ClienteService
from services.servico_services import ServicoService

bp = Blueprint('proposta', __name__, url_prefix='/api/propostas')
service = PropostaService()

@bp.route('/', methods=['GET'])
def get_propostas():
    propostas = service.get_all()
    return jsonify([proposta.to_json() for proposta in propostas])

@bp.route('/<int:proposta_id>', methods=['GET'])
def get_proposta_especifica(proposta_id):
    proposta = service.get_by_id(proposta_id)
    if not proposta:
        return jsonify({'error': 'Proposta não encontrada'}), 404
    return jsonify(proposta.to_json())

@bp.route('/cliente/<int:cliente_id>', methods=['GET'])
def get_propostas_por_cliente(cliente_id):
    propostas = service.get_by_cliente(cliente_id)
    return jsonify([proposta.to_json() for proposta in propostas])

@bp.route('/', methods=['POST'])
def criar_proposta():
    data = request.get_json()
    if not data:
        return jsonify({'error': 'Dados não fornecidos'}), 400
    
    try:
        proposta = service.criar_proposta(**data)
        return jsonify(proposta.to_json()), 201
    except ValueError as e:
        return jsonify({'error': str(e)}), 400
    
@bp.route('/<int:proposta_id>', methods=['PUT'])
def altera_proposta(proposta_id):   
    data = request.get_json()
    if not data:
        return jsonify({'error': 'Dados para atualização não encontrados'}), 400
    
    try:
        proposta = service.atualizar_proposta(proposta_id, **data)
        return jsonify(proposta.to_json()), 200
    except ValueError as e:
        return jsonify({'error': str(e)}), 400
    
@bp.route('/<int:proposta_id>', methods=['DELETE'])
def deletar_proposta(proposta_id):
    try:
        service.deletar_proposta(proposta_id)
        return jsonify({'message': 'Proposta deletada com sucesso'}), 200
    except ValueError as e:
        return jsonify({'error': str(e)}), 400