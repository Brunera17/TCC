from flask import Blueprint, request, jsonify
from services.usuario_service import UsuarioService
from models.organizacional import Usuario

bp = Blueprint('usuario', __name__, url_prefix='/usuarios')
service = UsuarioService()
@bp.route('/', methods=['GET'])
def get_usuarios():
    usuarios = service.get_all()
    return jsonify([u.to_dict() for u in usuarios]), 200
@bp.route('/<int:usuario_id>', methods=['GET'])
def get_usuario(usuario_id):
    usuario = service.get_by_id(usuario_id)
    if not usuario:
        return jsonify({"error": "Usuário não encontrado"}), 404
    return jsonify(usuario.to_dict()), 200
@bp.route('/username/<string:username>', methods=['GET'])
def get_usuario_por_username(username):
    usuario = service.get_by_username(username)
    if not usuario:
        return jsonify({"error": "Usuário não encontrado"}), 404
    return jsonify(usuario.to_dict()), 200
@bp.route('/ultimo_login/<int:dias>', methods=['GET'])
def get_usuarios_por_ultimo_login(dias):
    usuarios = service.get_usuario_por_ultimo_login(dias)
    return jsonify([u.to_dict() for u in usuarios]), 200 
@bp.route('/', methods=['POST'])
def criar_usuario():
    data = request.json
    try:
        usuario = service.criar_usuario(**data)
        return jsonify(usuario.to_dict()), 201
    except ValueError as e:
        return jsonify({"error": str(e)}), 400
@bp.route('/<int:usuario_id>', methods=['PUT'])
def atualizar_usuario(usuario_id):
    data = request.json
    try:
        usuario = service.atualizar_usuario(usuario_id, **data)
        return jsonify(usuario.to_dict()), 200
    except ValueError as e:
        return jsonify({"error": str(e)}), 400
@bp.route('/<int:usuario_id>', methods=['DELETE'])
def deletar_usuario(usuario_id):
    try:
        usuario = service.deletar_usuario(usuario_id)
        return jsonify({"message": "Usuário deletado com sucesso"}), 200
    except ValueError as e:
        return jsonify({"error": str(e)}), 400