import json
from flask import Blueprint, request, jsonify
from services.agendamento_services import AgendamentoService

from middleware.autenticacao_middleware import token_obrigatorio

bp = Blueprint('agendamento', __name__, url_prefix='/api/agendamentos')
service = AgendamentoService()

@bp.route('/', methods=['GET'])
@token_obrigatorio
def get_agendamentos():
    agendamentos = service.get_all()
    return jsonify([agendamento.to_json() for agendamento in agendamentos])

@bp.route('/<int:agendamento_id>', methods=['GET'])
@token_obrigatorio
def get_agendamento_especifico(agendamento_id):
    agendamento = service.get_by_id(agendamento_id)
    if not agendamento:
        return jsonify({'error': 'Agendamento não encontrado'}), 404
    return jsonify(agendamento.to_json())

@bp.route('/funcionario/<int:funcionario_id>', methods=['GET'])
@token_obrigatorio
def get_agendamentos_por_funcionario(funcionario_id):
    agendamentos = service.get_by_funcionario(funcionario_id)
    return jsonify([agendamento.to_json() for agendamento in agendamentos])

@bp.route('/', methods=['POST'])
@token_obrigatorio
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
@token_obrigatorio
def altera_agendamento(agendamento_id):
    data = request.get_json()
    if not data:
        return jsonify({'error': 'Dados para atualização não encontrados'}), 400
    
    try:
        agendamento = service.atualizar_agendamento(agendamento_id, **data)
        return jsonify(agendamento.to_json()), 200
    except ValueError as e:
        return jsonify({'error': str(e)}), 400
    
@bp.route('/<int:agendamento_id>', methods=['DELETE'])
@token_obrigatorio
def deletar_agendamento(agendamento_id):
    try:
        service.deletar_agendamento(agendamento_id)
        return jsonify({'message': 'Agendamento deletado com sucesso'}), 200
    except ValueError as e:
        return jsonify({'error': str(e)}), 400