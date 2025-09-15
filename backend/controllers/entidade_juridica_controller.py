from flask import Blueprint, request, jsonify
from services.entidade_juridica_service import EntidadeJuridicaService

bp = Blueprint('entidade_juridica', __name__, url_prefix='/api/entidades-juridicas')
service = EntidadeJuridicaService()

@bp.route('/', methods=['GET'])
def get_entidades_juridicas():
    entidades = service.get_all()
    return jsonify([entidade.to_json() for entidade in entidades])

@bp.route('/<int:entidade_id>', methods=['GET'])
def get_entidade_juridica(entidade_id):
    entidade = service.get_by_id(entidade_id)
    if not entidade:
        return jsonify({'error': 'Entidade jurídica não encontrada'}), 404
    return jsonify(entidade.to_json())

@bp.route('/', methods=['POST'])
def criar_entidade_juridica():
    data = request.get_json()
    if not data:
        return jsonify({'error': 'Dados não fornecidos'}), 400
    
    try:
        entidade = service.criar_entidade_juridica(**data)
        return jsonify(entidade.to_json()), 201
    except ValueError as e:
        return jsonify({'error': str(e)}), 400

@bp.route('/<int:entidade_id>', methods=['PUT'])
def atualiza_entidade_juridica(entidade_id):
    data = request.get_json()
    if not data:
        return jsonify({'error': 'Dados não fornecidos'}), 400
    
    try:
        entidade = service.atualizar_entidade_juridica(entidade_id, **data)
        return jsonify(entidade.to_json()), 200
    except ValueError as e:
        return jsonify({'error': str(e)}), 400

@bp.route('/<int:entidade_id>', methods=['DELETE'])
def deletar_entidade_juridica(entidade_id):
    try:
        entidade = service.deletar_entidade_juridica(entidade_id)
        return jsonify(entidade.to_json()), 200
    except ValueError as e:
        return jsonify({'error': str(e)}), 400