from flask import Blueprint, request, jsonify
from services.usuario_service import UsuarioService
from models.organizacional import Usuario
from middleware.autenticacao_middleware import (
    token_obrigatório, usuario_opcional, 
    gerar_token, gerar_refresh_token
)

bp = Blueprint('usuario', __name__, url_prefix='/api/usuarios')
service = UsuarioService()

# ============= ROTAS PÚBLICAS =============

@bp.route('/login', methods=['POST'])
def login():
    """Login de usuário - Público"""
    data = request.json
    
    # ✅ ACEITAR identificador, username ou email
    identificador = data.get('identificador')  # Campo genérico que pode ser username ou email
    username = data.get('username')
    email = data.get('email')
    senha = data.get('senha')
    
    if not senha:
        return jsonify({"error": "Senha é obrigatória"}), 400
    
    if not identificador and not username and not email:
        return jsonify({"error": "Identificador, username ou email é obrigatório"}), 400
    
    try:
        # Determinar o valor do identificador
        login_value = identificador or email or username
        
        # Tentar login - primeiro por username, depois por email, por último por CPF
        usuario = service.validar_credenciais(login_value, senha)
        
        if not usuario:
            return jsonify({"error": "Credenciais inválidas"}), 401
        
        # Gerar tokens
        user_data = {'id': usuario.id, 'email': usuario.email}
        access_token = gerar_token(user_data)
        refresh_token = gerar_refresh_token(user_data)
        
        return jsonify({
            'access_token': access_token,
            'refresh_token': refresh_token,
            'token_type': 'Bearer',
            'expires_in': 900,
            'user': usuario.to_json()  # ✅ CORRIGIDO - usar to_json()
        }), 200
        
    except Exception as e:
        return jsonify({"error": "Erro interno do servidor"}), 500

@bp.route('/registro', methods=['POST'])
def criar_usuario():
    """Registro de novo usuário - Público"""
    data = request.json
    try:
        usuario = service.criar_usuario(**data)
        return jsonify({
            'message': 'Usuário criado com sucesso',
            'user': usuario.to_json()  # ✅ CORRIGIDO
        }), 201
    except ValueError as e:
        return jsonify({"error": str(e)}), 400

# ============= ROTAS PROTEGIDAS =============

@bp.route('/', methods=['GET'])
@token_obrigatório
def get_usuarios():
    """Listar todos os usuários - Protegido"""
    usuario_logado = request.usuario_atual
    
    # Verificar se é admin
    if not service.usuario_eh_admin(usuario_logado['user']['id']):  # ✅ CORRIGIDO
        return jsonify({"error": "Acesso negado. Apenas administradores."}), 403
    
    usuarios = service.get_all()
    return jsonify([u.to_json() for u in usuarios]), 200  # ✅ CORRIGIDO

@bp.route('/<int:usuario_id>', methods=['GET'])
@token_obrigatório
def get_usuario(usuario_id):
    """Buscar usuário específico - Protegido"""
    usuario_logado = request.usuario_atual
    
    # Verificar permissão (próprio perfil ou admin)
    if (usuario_logado['user']['id'] != usuario_id and 
        not service.usuario_eh_admin(usuario_logado['user']['id'])):  # ✅ CORRIGIDO
        return jsonify({"error": "Sem permissão para acessar este perfil"}), 403
    
    usuario = service.get_by_id(usuario_id)
    if not usuario:
        return jsonify({"error": "Usuário não encontrado"}), 404
    return jsonify(usuario.to_json()), 200  # ✅ CORRIGIDO

@bp.route('/<int:usuario_id>', methods=['PUT'])
@token_obrigatório
def atualizar_usuario(usuario_id):
    """Atualizar usuário - Protegido"""
    usuario_logado = request.usuario_atual
    
    # Verificar permissão
    if (usuario_logado['user']['id'] != usuario_id and 
        not service.usuario_eh_admin(usuario_logado['user']['id'])):  # ✅ CORRIGIDO
        return jsonify({"error": "Sem permissão para editar este usuário"}), 403
    
    data = request.json
    try:
        usuario = service.atualizar_usuario(usuario_id, **data)
        return jsonify(usuario.to_json()), 200  # ✅ CORRIGIDO
    except ValueError as e:
        return jsonify({"error": str(e)}), 400

@bp.route('/<int:usuario_id>', methods=['DELETE'])
@token_obrigatório
def deletar_usuario(usuario_id):
    """Deletar usuário - Protegido (só admin)"""
    usuario_logado = request.usuario_atual
    
    # Só admin pode deletar
    if not service.usuario_eh_admin(usuario_logado['user']['id']):
        return jsonify({"error": "Apenas administradores podem deletar usuários"}), 403
    
    # Não deletar a si mesmo
    if usuario_logado['user']['id'] == usuario_id:
        return jsonify({"error": "Não é possível deletar seu próprio usuário"}), 400
    
    try:
        service.deletar_usuario(usuario_id)
        return jsonify({"message": "Usuário deletado com sucesso"}), 200
    except ValueError as e:
        return jsonify({"error": str(e)}), 400

# ========== ROTAS COM MIDDLEWARE OPCIONAL ==========

@bp.route('/username/<string:username>', methods=['GET'])
@usuario_opcional
def get_usuario_por_username(username):
    """Buscar por username - Opcional"""
    usuario = service.get_by_username(username)
    if not usuario:
        return jsonify({"error": "Usuário não encontrado"}), 404
    
    # Retorna dados baseado no status de autenticação
    if request.usuario_atual:
        return jsonify(usuario.to_json()), 200
    else:
        return jsonify({
            'id': usuario.id,
            'username': usuario.username,
            'nome': usuario.nome
        }), 200

@bp.route('/ultimo_login/<int:dias>', methods=['GET'])
@token_obrigatório  # Esta rota deveria ser protegida
def get_usuarios_por_ultimo_login(dias):
    """Usuários por último login - Protegido"""
    usuario_logado = request.usuario_atual
    
    if not service.usuario_eh_admin(usuario_logado['user']['id']):
        return jsonify({"error": "Apenas administradores podem acessar estes dados"}), 403
    
    usuarios = service.get_usuario_por_ultimo_login(dias)
    return jsonify([u.to_json() for u in usuarios]), 200

# ========== ROTAS DE PERFIL ==========

@bp.route('/me', methods=['GET'])
@token_obrigatório
def get_meu_perfil():
    """Ver próprio perfil - Protegido"""
    usuario_logado = request.usuario_atual
    usuario = service.get_by_id(usuario_logado['user']['id'])
    
    if not usuario:
        return jsonify({"error": "Usuário não encontrado"}), 404
    
    return jsonify(usuario.to_json()), 200

@bp.route('/me', methods=['PUT'])
@token_obrigatório
def atualizar_meu_perfil():
    """Atualizar próprio perfil - Protegido"""
    usuario_logado = request.usuario_atual
    data = request.json
    
    try:
        usuario = service.atualizar_usuario(usuario_logado['user']['id'], **data)
        return jsonify(usuario.to_json()), 200
    except ValueError as e:
        return jsonify({"error": str(e)}), 400