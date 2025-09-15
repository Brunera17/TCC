import json
from flask import Blueprint, request, jsonify
from services.agendamento_service import AgendamentoService

bp = Blueprint('agendamento', __name__, url_prefix='/api/agendamentos')
service = AgendamentoService()

@bp.route('/', methods=['GET'])
def get_agendamentos():
    agendamentos = service.get_all()
    return jsonify([agendamento.to_json() for agendamento in agendamentos])

@bp.route('/<int:agendamento_id>', methods=['GET'])
def get_agendamento_especifico(agendamento_id):
    agendamento = service.get_by_id(agendamento_id)
    if not agendamento:
        return jsonify({'error': 'Agendamento não encontrado'}), 404
    return jsonify(agendamento.to_json())

@bp.route('/funcionario/<int:funcionario_id>', methods=['GET'])
def get_agendamentos_por_funcionario(funcionario_id):
    agendamentos = service.get_by_funcionario(funcionario_id)
    return jsonify([agendamento.to_json() for agendamento in agendamentos])

@bp.route('/', methods=['POST'])
def criar_agendamento():
    data = request.get_json()
    if not data:
        return jsonify({'error': 'Dados não fornecidos'}), 400
    
    try:
        agendamento = service.criar_agendamento(**data)
        return jsonify(agendamento.to_json()), 201
    except ValueError as e:
        return jsonify({'error': str(e)}), 400

@bp.route('/<int:agendamento_id>', methods=['PUT'])
def altera_agendamento(agendamento_id):
    data = request.get_json()
    if not data:
        return jsonify({'error': 'Dados para atualização não encontrados'}), 400
    
    try:
        agendamento = service.atualiza_agendamento(agendamento_id, **data)
        return jsonify(agendamento.to_json()), 200
    except ValueError as e:
        return jsonify({'error': str(e)}), 400
    
@bp.route('/<int:agendamento_id>', methods=['DELETE'])
def deleta_agendamento(agendamento_id):
    try:
        service.deleta_agendamento(agendamento_id)
        return jsonify({'message': 'Agendamento deletado com sucesso'}), 200
    except ValueError as e:
        return jsonify({'error': str(e)}), 400