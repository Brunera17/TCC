from flask import Blueprint, request, jsonify
from services.usuario_service import UsuarioService
from middleware.autenticacao_middleware import gerar_token, gerar_refresh_token

bp = Blueprint('usuario', __name__, url_prefix='/api/usuarios')
service = UsuarioService()

@bp.route('/', methods=['GET'])
def get_usuarios():
    usuarios = service.get_all()
    return jsonify([usuario.to_json() for usuario in usuarios])

@bp.route('/<int:usuario_id>', methods=['GET'])
def get_usuario_by_id(usuario_id):
    usuario = service.get_by_id(usuario_id)
    if not usuario:
        