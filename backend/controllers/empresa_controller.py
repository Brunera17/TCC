from flask import Blueprint, request, jsonify
from services.empresa_service import EmpresaService

bp = Blueprint('empresa', __name__, url_prefix='/api/empresas')
service = EmpresaService()

@bp.route('/', methods=['GET'])
def get_empresas():
    empresas = service.get_all()
    return jsonify([empresa.to_json() for empresa in empresas])

@bp.route('/<int:empresa_id>', methods=['GET'])
def get_empresa_by_id(empresa_id):
    empresa = service.get_by_id(empresa_id)
    if not empresa:
        return jsonify({'error': 'Empresa não encontrada'}), 400
    return jsonify(empresa.to_json())

@bp.route('/', methods=['POST'])
def criar_empresa():
    data = request.get_json()
    if not data:
        return jsonify({'error': 'Dados não fornecidos'}), 400

    try:
        empresa = service.criar_empresa(**data)
        return jsonify(empresa.to_json()), 201
    except ValueError as e:
        return jsonify({'error': str(e)}), 400
    
@bp.route('/<int:empresa_id>', methods=['PUT'])
def atualizar_empresa(empresa_id):
    data = request.get_json()
    if not data:
        return jsonify({'error': 'Dados não fornecidos'}), 400
    
    try:
        empresa = service.atualizar_empresa(empresa_id, **data)
        return jsonify(empresa.to_json()), 200
    except ValueError as e:
        return jsonify({'error': str(e)}), 400
    
@bp.route('/<int:empresa_id>', methods=['DELETE'])
def deletar_empresa(empresa_id):
    if not empresa_id:
        return jsonify({'error': 'ID da empresa não fornecido'}), 400
    
    try:
        empresa = service.deletar_empresa(empresa_id)
        return jsonify(empresa.to_json()), 200
    except ValueError as e:
        return jsonify({'error': str(e)}), 400

