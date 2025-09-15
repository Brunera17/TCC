import json
from flask import Blueprint, request, jsonify
from services.ordemServico_service import OrdemServicoService

bp = Blueprint('ordem_servico', __name__, url_prefix='/api/ordens_servico')
service = OrdemServicoService()

@bp.route('/', methods=['GET'])
def get_ordens_servico():
    ordens_servico = service.get_all()
    return jsonify([ordem.to_json() for ordem in ordens_servico])

@bp.route('/<int:ordem_id>', methods=['GET'])
def get_ordem_especifica(ordem_id):
    ordem = service.get_by_id(ordem_id)
    if not ordem:
        return jsonify({'error': 'Ordem de Serviço não encontrada'}), 404
    return jsonify(ordem.to_json())

@bp.route('/cliente/<int:cliente_id>', methods=['GET'])
def get_ordens_por_cliente(cliente_id):
    ordens_servico = service.get_by_cliente(cliente_id)
    return jsonify([ordem.to_json() for ordem in ordens_servico])

@bp.route('/', methods=['POST'])
def criar_ordem_servico():
    data = request.get_json()
    if not data:
        return jsonify({'error': 'Dados não fornecidos'}), 400
    
    try:
        ordem = service.criar_ordem_servico(**data)
        return jsonify(ordem.to_json()), 201
    except ValueError as e:
        return jsonify({'error': str(e)}), 400
    
@bp.route('/<int:ordem_id>', methods=['PUT'])
def altera_ordem_servico(ordem_id):
    data = request.get_json()
    if not data:
        return jsonify({'error': 'Dados para atualização não encontrados'}), 400
    
    try:
        ordem = service.atualiza_ordem_servico(ordem_id, **data)
        return jsonify(ordem.to_json()), 200
    except ValueError as e:
        return jsonify({'error': str(e)}), 400
    
@bp.route('/<int:ordem_id>', methods=['DELETE'])
def deleta_ordem_servico(ordem_id):
    try:
        service.deleta_ordem_servico(ordem_id)
        return jsonify({'message': 'Ordem de Serviço deletada com sucesso'}), 200
    except ValueError as e:
        return jsonify({'error': str(e)}), 400