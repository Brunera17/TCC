import json
from flask import Blueprint, request, jsonify
from services.agendamento_services import AgendamentoService

from middleware.autenticacao_middleware import token_obrigatorio
from middleware.acesso_empresa import empresa_id_usuario, usuario_eh_admin, usuario_tem_acesso_empresa

bp = Blueprint('agendamento', __name__, url_prefix='/api/agendamentos')
service = AgendamentoService()

@bp.route('/', methods=['GET'])
@token_obrigatorio
def get_agendamentos():
    agendamentos = service.get_all()
    if not usuario_eh_admin():
        agendamentos = [a for a in agendamentos if usuario_tem_acesso_empresa(a.empresa_id)]
    return jsonify([agendamento.to_json() for agendamento in agendamentos])

@bp.route('/<int:agendamento_id>', methods=['GET'])
@token_obrigatorio
def get_agendamento_especifico(agendamento_id):
    agendamento = service.get_by_id(agendamento_id)
    if not agendamento:
        return jsonify({'error': 'Agendamento não encontrado'}), 404
    if not usuario_tem_acesso_empresa(agendamento.empresa_id):
        return jsonify({'error': 'Acesso negado para este agendamento'}), 403
    return jsonify(agendamento.to_json())

@bp.route('/funcionario/<int:funcionario_id>', methods=['GET'])
@token_obrigatorio
def get_agendamentos_por_funcionario(funcionario_id):
    agendamentos = service.get_by_funcionario(funcionario_id)
    if not usuario_eh_admin():
        agendamentos = [a for a in agendamentos if usuario_tem_acesso_empresa(a.empresa_id)]
    return jsonify([agendamento.to_json() for agendamento in agendamentos])

@bp.route('/', methods=['POST'])
@token_obrigatorio
def criar_agendamento():
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

    agendamento_existente = service.get_by_id(agendamento_id)
    if not agendamento_existente:
        return jsonify({'error': 'Agendamento não encontrado'}), 404
    if not usuario_tem_acesso_empresa(agendamento_existente.empresa_id):
        return jsonify({'error': 'Acesso negado para este agendamento'}), 403
    if not usuario_eh_admin():
        data.pop('empresa_id', None)
    elif data.get('empresa_id') and data['empresa_id'] != agendamento_existente.empresa_id:
        return jsonify({'error': 'Não é possível alterar a empresa do agendamento'}), 403

    try:
        agendamento = service.atualizar_agendamento(agendamento_id, **data)
        return jsonify(agendamento.to_json()), 200
    except ValueError as e:
        return jsonify({'error': str(e)}), 400

@bp.route('/<int:agendamento_id>', methods=['DELETE'])
@token_obrigatorio
def deletar_agendamento(agendamento_id):
    agendamento_existente = service.get_by_id(agendamento_id)
    if not agendamento_existente:
        return jsonify({'error': 'Agendamento não encontrado'}), 404
    if not usuario_tem_acesso_empresa(agendamento_existente.empresa_id):
        return jsonify({'error': 'Acesso negado para este agendamento'}), 403

    try:
        service.deletar_agendamento(agendamento_id)
        return jsonify({'message': 'Agendamento deletado com sucesso'}), 200
    except ValueError as e:
        return jsonify({'error': str(e)}), 400