from pathlib import Path

from flask import Blueprint, request, jsonify, current_app, send_from_directory

from services.usuario_service import UsuarioService
from models.organizacional import Usuario
from middleware.autenticacao_middleware import (
    token_obrigatorio, usuario_opcional,
    gerar_tokens, revogar_token, verificar_refresh_token
)

bp = Blueprint('usuario', __name__, url_prefix='/api/usuarios')
service = UsuarioService()


def _obter_payload() -> dict:
    """Tenta extrair o corpo da requisição como dict independente do Content-Type."""
    data = request.get_json(silent=True)
    if isinstance(data, dict):
        return data
    if request.form:
        return request.form.to_dict()
    return {}


# =======================================================
# 🔓 ROTAS PÚBLICAS
# =======================================================

@bp.route('/login', methods=['POST'])
def login():
    """Login de usuário - Público"""
    data = _obter_payload()

    identificador = data.get('identificador') or data.get('username') or data.get('email')
    senha = data.get('senha')

    if not identificador or not senha:
        return jsonify({"error": "Identificador e senha são obrigatórios."}), 400

    try:
        usuario = service.validar_credenciais(identificador, senha)
        if not usuario:
            return jsonify({"error": "Credenciais inválidas."}), 401

        # Gerar tokens (access + refresh)
        access_token, refresh_token = gerar_tokens(usuario)

        return jsonify({
            'access_token': access_token,
            'refresh_token': refresh_token,
            'token_type': 'Bearer',
            'expires_in': 900,  # 15 minutos
            'user': usuario.to_json()
        }), 200

    except Exception as e:
        return jsonify({"error": f"Erro interno no servidor: {str(e)}"}), 500


@bp.route('/registro', methods=['POST'])
def criar_usuario():
    """Registro de novo usuário - Público"""
    data = _obter_payload()
    try:
        usuario = service.criar_usuario(**data)
        return jsonify({
            'message': 'Usuário criado com sucesso.',
            'user': usuario.to_json()
        }), 201
    except ValueError as e:
        return jsonify({"error": str(e)}), 400


# =======================================================
# 🔑 ROTAS DE AUTENTICAÇÃO (REFRESH e LOGOUT)
# =======================================================

@bp.route('/refresh', methods=['POST'])
def refresh_token():
    """Gera novos tokens a partir do refresh token"""
    data = _obter_payload()
    token = data.get('refresh_token')

    if not token:
        return jsonify({"error": "Refresh token é obrigatório."}), 400

    payload, erro = verificar_refresh_token(token)
    if erro:
        return jsonify({"error": erro}), 401

    user_id = payload.get('identity', {}).get('user', {}).get('id')
    usuario = Usuario.query.get(user_id)

    if not usuario:
        return jsonify({"error": "Usuário não encontrado."}), 404

    access_token, novo_refresh_token = gerar_tokens(usuario)

    return jsonify({
        "access_token": access_token,
        "refresh_token": novo_refresh_token,
        "token_type": "Bearer",
        "expires_in": 900
    }), 200


@bp.route('/logout', methods=['POST'])
@token_obrigatorio
def logout():
    """Logout - Revoga o token atual"""
    auth_header = request.headers.get('Authorization')
    if not auth_header:
        return jsonify({"error": "Token não fornecido."}), 400

    token = auth_header.split()[1]
    sucesso = revogar_token(token)

    if not sucesso:
        return jsonify({"error": "Erro ao revogar token."}), 500

    return jsonify({"message": "Logout realizado com sucesso."}), 200


# =======================================================
# 🔐 ROTAS PROTEGIDAS
# =======================================================

@bp.route('/', methods=['GET'])
@token_obrigatorio
def get_usuarios():
    """Listar todos os usuários - Protegido"""
    usuario_logado = request.usuario_atual

    if not service.usuario_eh_admin(usuario_logado.get('id')):
        return jsonify({"error": "Acesso negado. Apenas administradores."}), 403

    usuarios = service.get_all()
    return jsonify([u.to_json() for u in usuarios]), 200


@bp.route('/<int:usuario_id>', methods=['GET'])
@token_obrigatorio
def get_usuario(usuario_id):
    """Buscar usuário específico - Protegido"""
    usuario_logado = request.usuario_atual

    if (usuario_logado.get('id') != usuario_id and 
        not service.usuario_eh_admin(usuario_logado.get('id'))):
        return jsonify({"error": "Sem permissão para acessar este perfil."}), 403

    usuario = service.get_by_id(usuario_id)
    if not usuario:
        return jsonify({"error": "Usuário não encontrado."}), 404
    return jsonify(usuario.to_json()), 200


@bp.route('/<int:usuario_id>', methods=['PUT'])
@token_obrigatorio
def atualizar_usuario(usuario_id):
    """Atualizar usuário - Protegido"""
    usuario_logado = request.usuario_atual
    data = _obter_payload()

    if (usuario_logado.get('id') != usuario_id and 
        not service.usuario_eh_admin(usuario_logado.get('id'))):
        return jsonify({"error": "Sem permissão para editar este usuário."}), 403

    try:
        usuario = service.atualizar_usuario(usuario_id, **data)
        return jsonify(usuario.to_json()), 200
    except ValueError as e:
        return jsonify({"error": str(e)}), 400


@bp.route('/<int:usuario_id>', methods=['DELETE'])
@token_obrigatorio
def deletar_usuario(usuario_id):
    """Deletar usuário - Protegido (somente admin)"""
    usuario_logado = request.usuario_atual

    if not service.usuario_eh_admin(usuario_logado.get('id')):
        return jsonify({"error": "Apenas administradores podem deletar usuários."}), 403

    if usuario_logado.get('id') == usuario_id:
        return jsonify({"error": "Não é possível deletar seu próprio usuário."}), 400

    try:
        service.deletar_usuario(usuario_id)
        return jsonify({"message": "Usuário deletado com sucesso."}), 200
    except ValueError as e:
        return jsonify({"error": str(e)}), 400


# =======================================================
# 🧱 ROTAS OPCIONAIS E DE PERFIL
# =======================================================

@bp.route('/username/<string:username>', methods=['GET'])
@usuario_opcional
def get_usuario_por_username(username):
    """Buscar por username - Opcional"""
    usuario = service.get_by_username(username)
    if not usuario:
        return jsonify({"error": "Usuário não encontrado."}), 404

    if request.usuario_atual:
        return jsonify(usuario.to_json()), 200

    return jsonify({
        'id': usuario.id,
        'username': usuario.username,
        'nome': usuario.nome
    }), 200


@bp.route('/me', methods=['GET'], strict_slashes=False)
@token_obrigatorio
def get_meu_perfil():
    """Ver próprio perfil - Protegido"""
    usuario_logado = request.usuario_atual
    usuario = service.get_by_id(usuario_logado.get('id'))

    if not usuario:
        return jsonify({"error": "Usuário não encontrado."}), 404

    return jsonify(usuario.to_json()), 200


@bp.route('/me', methods=['PUT'], strict_slashes=False)
@token_obrigatorio
def atualizar_meu_perfil():
    """Atualizar próprio perfil - Protegido"""
    usuario_logado = request.usuario_atual
    data = _obter_payload()

    try:
        usuario = service.atualizar_usuario(usuario_logado.get('id'), **data)
        return jsonify(usuario.to_json()), 200
    except ValueError as e:
        return jsonify({"error": str(e)}), 400


# =======================================================
# 📸 ROTAS DE FOTO DE USUÁRIO
# =======================================================


def _usuario_tem_permissao(usuario_logado: dict, alvo_id: int) -> bool:
    return usuario_logado.get('id') == alvo_id or service.usuario_eh_admin(usuario_logado.get('id'))


def _resolver_caminho_foto(usuario):
    if not usuario or not usuario.foto:
        return None
    upload_root = Path(current_app.config.get('UPLOAD_FOLDER', 'uploads'))
    foto_relativa = usuario.foto.replace('\\', '/')
    caminho = upload_root / foto_relativa
    if not caminho.exists() or not caminho.is_file():
        return None
    return upload_root, caminho, foto_relativa


@bp.route('/<int:usuario_id>/foto', methods=['GET'])
@token_obrigatorio
def obter_foto_usuario(usuario_id):
    usuario_logado = request.usuario_atual
    if not _usuario_tem_permissao(usuario_logado, usuario_id):
        return jsonify({"error": "Sem permissão para acessar esta foto."}), 403

    usuario = service.get_by_id(usuario_id)
    resultado = _resolver_caminho_foto(usuario)
    if not resultado:
        return jsonify({"error": "Foto não encontrada."}), 404

    upload_root, caminho, caminho_relativo = resultado
    return send_from_directory(str(upload_root), caminho_relativo, as_attachment=False, download_name=caminho.name)


@bp.route('/<int:usuario_id>/foto', methods=['POST', 'PUT'])
@token_obrigatorio
def salvar_foto_usuario(usuario_id):
    usuario_logado = request.usuario_atual
    if not _usuario_tem_permissao(usuario_logado, usuario_id):
        return jsonify({"error": "Sem permissão para atualizar esta foto."}), 403

    arquivo = request.files.get('foto') if request.files else None
    if not arquivo or not arquivo.filename:
        return jsonify({"error": "Arquivo de foto é obrigatório."}), 400

    try:
        usuario = service.salvar_foto(usuario_id, arquivo)
        return jsonify(usuario.to_json()), 200
    except ValueError as exc:
        return jsonify({"error": str(exc)}), 400


@bp.route('/<int:usuario_id>/foto', methods=['DELETE'])
@token_obrigatorio
def remover_foto_usuario(usuario_id):
    usuario_logado = request.usuario_atual
    if not _usuario_tem_permissao(usuario_logado, usuario_id):
        return jsonify({"error": "Sem permissão para remover esta foto."}), 403

    try:
        usuario = service.remover_foto(usuario_id)
        return jsonify(usuario.to_json()), 200
    except ValueError as exc:
        return jsonify({"error": str(exc)}), 400


@bp.route('/me/foto', methods=['GET'], strict_slashes=False)
@token_obrigatorio
def obter_minha_foto():
    usuario_logado = request.usuario_atual
    usuario = service.get_by_id(usuario_logado.get('id'))
    resultado = _resolver_caminho_foto(usuario)
    if not resultado:
        return jsonify({"error": "Foto não encontrada."}), 404
    upload_root, caminho, caminho_relativo = resultado
    return send_from_directory(str(upload_root), caminho_relativo, as_attachment=False, download_name=caminho.name)


@bp.route('/me/foto', methods=['POST', 'PUT'], strict_slashes=False)
@token_obrigatorio
def salvar_minha_foto():
    usuario_logado = request.usuario_atual
    return salvar_foto_usuario(usuario_logado.get('id'))


@bp.route('/me/foto', methods=['DELETE'], strict_slashes=False)
@token_obrigatorio
def remover_minha_foto():
    usuario_logado = request.usuario_atual
    return remover_foto_usuario(usuario_logado.get('id'))


