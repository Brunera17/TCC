from flask import Blueprint, request, jsonify
from services.endereco_service import EnderecoService

bp = Blueprint('entidadejuridica', __name__, url_prefix='/api/auth/entidadejuridica')
service = EnderecoService()

@bp.route('/', methods=['GET'])
def get_enderecos():
    enderecos = service.get_all()
    return jsonify([endereco.to_json() for endereco in enderecos])
@bp.route('/<int:cep>', methods=['GET'])
def busca_por_cep(cep):
    pass
@bp.route('/', methods = ['POST'])
def criar_endereco():
    data = request.get_json()
    if not data:
        return jsonify({'error':'Dados de endereço faltando'})
    
    try:
        endereco = service.criar_endereco(**data)
        return jsonify(endereco.to_json())
    except ValueError as e:
        return jsonify({'error':str(e)})
@bp.route('/<int:endereco_id>', methods = ['PUT'])
def atualiza_endereco(id):
    data = request.get_json()
    if not data:
        return jsonify({'error':'Dados para atualização incompletos'})
    
    try:
        endereco = service.atualizar_endereco(id, **data)
        return jsonify(endereco.to_json())
    except ValueError as e:
        return jsonify({'error': str(e)})
@bp.route('/<int:endereco_id>', methods = ['DELETE'])
def deletar_endereco(id):
    pass