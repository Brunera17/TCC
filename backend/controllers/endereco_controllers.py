from flask import Blueprint, request, jsonify
from services.endereco_service import EnderecoService

bp = Blueprint('endereco', __name__, url_prefix='/api/enderecos')
service = EnderecoService()

@bp.route('/', methods=['GET'])
def get_enderecos():
    enderecos = service.get_all()
    return jsonify([endereco.to_json() for endereco in enderecos])

@bp.route('/<int:endereco_id>', methods=['GET'])
def get_endereco_por_id(endereco_id):
    endereco = service.get_by_id(endereco_id)
    if not endereco:
        return jsonify({'error': 'Endereço não encontrado'}), 404
    return jsonify(endereco.to_json())

@bp.route('/', methods=['POST'])
def criar_endereco():
    data = request.get_json()
    if not data:
        return jsonify({'error': 'Dados de endereço faltando'}), 400
    
    try:
        endereco = service.criar_endereco(**data)
        return jsonify(endereco.to_json()), 201
    except ValueError as e:
        return jsonify({'error': str(e)}), 400

@bp.route('/<int:endereco_id>', methods=['PUT'])
def atualiza_endereco(endereco_id):
    data = request.get_json()
    if not data:
        return jsonify({'error': 'Dados para atualização incompletos'}), 400
    
    try:
        endereco = service.atualizar_endereco(endereco_id, **data)
        return jsonify(endereco.to_json()), 200
    except ValueError as e:
        return jsonify({'error': str(e)}), 400

@bp.route('/<int:endereco_id>', methods=['DELETE'])
def deletar_endereco(endereco_id):
    try:
        endereco = service.deletar_endereco(endereco_id)
        return jsonify(endereco.to_json()), 200
    except ValueError as e:
        return jsonify({'error': str(e)}), 400