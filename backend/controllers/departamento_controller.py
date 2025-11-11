from flask import Blueprint, request, jsonify
from services.departamento_service import DepartamentoService
from middleware.autenticacao_middleware import token_obrigatorio
from models.organizacional import Departamento, Usuario

# Criar blueprint
bp = Blueprint('departamentos', __name__, url_prefix='/api/departamentos')

# Inicializar serviço
departamento_service = DepartamentoService()


def _usuario_contexto():
    conteudo = getattr(request, 'usuario_atual', {}) or {}
    if not isinstance(conteudo, dict):
        return {}
    if isinstance(conteudo.get('user'), dict):
        return conteudo['user']
    return conteudo


def _empresa_id_usuario():
    usuario_payload = _usuario_contexto()
    empresa = usuario_payload.get('empresa')
    if isinstance(empresa, dict) and empresa.get('id') is not None:
        return empresa.get('id')

    usuario_id = usuario_payload.get('id')
    if not usuario_id:
        return None

    try:
        usuario_model = Usuario.query.get(usuario_id)
        if usuario_model and usuario_model.cargo and usuario_model.cargo.departamento:
            return usuario_model.cargo.departamento.empresa_id
    except Exception:
        pass

    return None


def _usuario_eh_admin():
    return _usuario_contexto().get('tipo_usuario') == 'admin'


def _usuario_tem_acesso_empresa(empresa_id: int):
    if empresa_id is None:
        return False
    if _usuario_eh_admin():
        return True
    return empresa_id == _empresa_id_usuario()


def _filtrar_por_empresa(resultado: dict, empresa_id: int):
    if not resultado or not empresa_id:
        return resultado
    dados = resultado.get('data')
    if isinstance(dados, list):
        filtrados = [dept for dept in dados if dept.get('empresa_id') == empresa_id]
        resultado['data'] = filtrados
        resultado['total'] = len(filtrados)
    return resultado


def _filtrar_por_status(resultado: dict, status: str):
    if not resultado or not status:
        return resultado
    dados = resultado.get('data')
    if isinstance(dados, list):
        filtrados = [dept for dept in dados if dept.get('status') == status]
        resultado['data'] = filtrados
        resultado['total'] = len(filtrados)
    return resultado

# ======================================================
# 📋 ROTAS DE CONSULTA
# ======================================================

@bp.route('/', methods=['GET'])
@token_obrigatorio
def listar_departamentos():
    """
    Lista todos os departamentos ativos
    
    Query Parameters:
    - empresa_id: int (opcional) - Filtrar por empresa
    - status: str (opcional) - Filtrar por status
    - search: str (opcional) - Buscar por nome
    """
    try:
        # Verificar parâmetros de consulta
        empresa_id_param = request.args.get('empresa_id', type=int)
        status = request.args.get('status', type=str)
        search = request.args.get('search', type=str)

        empresa_id_usuario = _empresa_id_usuario()
        usuario_admin = _usuario_eh_admin()

        if not usuario_admin:
            if not empresa_id_usuario:
                return jsonify({'error': 'Usuário não está vinculado a uma empresa.'}), 403
            if empresa_id_param and empresa_id_param != empresa_id_usuario:
                return jsonify({'error': 'Acesso negado para a empresa informada.'}), 403
            empresa_id_param = empresa_id_param or empresa_id_usuario
        
        # Buscar por empresa específica
        if empresa_id_param:
            resultado = departamento_service.get_by_empresa(empresa_id_param)
            if not resultado['success']:
                return jsonify({'error': resultado['error']}), 404
            resultado = _filtrar_por_status(resultado, status)
            return jsonify(resultado), 200
        
        # Buscar por termo
        if search:
            resultado = departamento_service.search(search)
            if not resultado['success']:
                return jsonify({'error': resultado['error']}), 400
            if not usuario_admin and empresa_id_usuario:
                resultado = _filtrar_por_empresa(resultado, empresa_id_usuario)
            resultado = _filtrar_por_status(resultado, status)
            return jsonify(resultado), 200
        
        # Listar todos
        resultado = departamento_service.get_all()
        if not resultado['success']:
            return jsonify({'error': resultado['error']}), 500
        
        if not usuario_admin and empresa_id_usuario:
            resultado = _filtrar_por_empresa(resultado, empresa_id_usuario)

        resultado = _filtrar_por_status(resultado, status)
        
        return jsonify(resultado), 200
        
    except Exception as e:
        return jsonify({'error': f'Erro interno: {str(e)}'}), 500

@bp.route('/<int:departamento_id>', methods=['GET'])
@token_obrigatorio
def buscar_departamento(departamento_id):
    """
    Busca um departamento específico por ID
    """
    try:
        resultado = departamento_service.get_by_id(departamento_id)
        
        if not resultado['success']:
            return jsonify({'error': resultado['error']}), 404

        empresa_id = (resultado.get('data') or {}).get('empresa_id')
        if not _usuario_tem_acesso_empresa(empresa_id):
            return jsonify({'error': 'Acesso negado para este departamento'}), 403
        
        return jsonify(resultado), 200
        
    except Exception as e:
        return jsonify({'error': f'Erro interno: {str(e)}'}), 500

@bp.route('/empresa/<int:empresa_id>', methods=['GET'])
@token_obrigatorio
def listar_por_empresa(empresa_id):
    """
    Lista todos os departamentos de uma empresa específica
    """
    try:
        if not _usuario_tem_acesso_empresa(empresa_id):
            return jsonify({'error': 'Acesso negado para a empresa informada'}), 403

        resultado = departamento_service.get_by_empresa(empresa_id)
        
        if not resultado['success']:
            return jsonify({'error': resultado['error']}), 404
        
        return jsonify(_filtrar_por_status(resultado, request.args.get('status'))), 200
        
    except Exception as e:
        return jsonify({'error': f'Erro interno: {str(e)}'}), 500

@bp.route('/empresa/<int:empresa_id>/estatisticas', methods=['GET'])
@token_obrigatorio
def estatisticas_empresa(empresa_id):
    """
    Retorna estatísticas dos departamentos de uma empresa
    """
    try:
        if not _usuario_tem_acesso_empresa(empresa_id):
            return jsonify({'error': 'Acesso negado para a empresa informada'}), 403

        resultado = departamento_service.get_estatisticas_empresa(empresa_id)
        
        if not resultado['success']:
            return jsonify({'error': resultado['error']}), 404
        
        return jsonify(resultado), 200
        
    except Exception as e:
        return jsonify({'error': f'Erro interno: {str(e)}'}), 500

# ======================================================
# ✏️ ROTAS DE MANIPULAÇÃO
# ======================================================

@bp.route('/', methods=['POST'])
@token_obrigatorio
def criar_departamento():
    """
    Cria um novo departamento
    
    Body JSON:
    {
        "nome": "string (obrigatório)",
        "descricao": "string (opcional)",
        "status": "string (opcional, padrão: ativo)",
        "empresa_id": "int (obrigatório)"
    }
    """
    try:
        # Verificar se há dados no body
        dados = request.get_json()
        if not dados:
            return jsonify({'error': 'Dados não fornecidos'}), 400
        
        # Verificar permissões (apenas admin ou gerente pode criar departamentos)
        usuario = _usuario_contexto()
        if not departamento_service.usuario_eh_admin_ou_gerente(usuario.get('id')):
            return jsonify({'error': 'Acesso negado. Apenas administradores e gerentes podem criar departamentos'}), 403

        empresa_id_usuario = _empresa_id_usuario()
        if not _usuario_eh_admin():
            if not empresa_id_usuario:
                return jsonify({'error': 'Usuário não está vinculado a uma empresa.'}), 403
            if dados.get('empresa_id') and dados['empresa_id'] != empresa_id_usuario:
                return jsonify({'error': 'Empresa informada não corresponde ao usuário autenticado.'}), 403
            dados['empresa_id'] = empresa_id_usuario
        
        resultado = departamento_service.create(dados)
        
        if not resultado['success']:
            return jsonify({'error': resultado['error']}), 400
        
        return jsonify(resultado), 201
        
    except Exception as e:
        return jsonify({'error': f'Erro interno: {str(e)}'}), 500

@bp.route('/<int:departamento_id>', methods=['PUT'])
@token_obrigatorio
def atualizar_departamento(departamento_id):
    """
    Atualiza um departamento existente
    
    Body JSON:
    {
        "nome": "string (opcional)",
        "descricao": "string (opcional)",
        "status": "string (opcional)"
    }
    """
    try:
        # Verificar se há dados no body
        dados = request.get_json()
        if not dados:
            return jsonify({'error': 'Dados não fornecidos'}), 400
        
        departamento = Departamento.query.get(departamento_id)
        if not departamento:
            return jsonify({'error': 'Departamento não encontrado'}), 404
        if not _usuario_tem_acesso_empresa(departamento.empresa_id):
            return jsonify({'error': 'Acesso negado para este departamento'}), 403

        # Verificar permissões
        usuario = _usuario_contexto()
        if not departamento_service.usuario_eh_admin_ou_gerente(usuario.get('id')):
            return jsonify({'error': 'Acesso negado. Apenas administradores e gerentes podem atualizar departamentos'}), 403

        if not _usuario_eh_admin():
            if dados.get('empresa_id') and dados['empresa_id'] != departamento.empresa_id:
                return jsonify({'error': 'Não é possível alterar a empresa do departamento'}), 403
            dados.pop('empresa_id', None)
        
        resultado = departamento_service.update(departamento_id, dados)
        
        if not resultado['success']:
            return jsonify({'error': resultado['error']}), 400
        
        return jsonify(resultado), 200
        
    except Exception as e:
        return jsonify({'error': f'Erro interno: {str(e)}'}), 500

@bp.route('/<int:departamento_id>', methods=['DELETE'])
@token_obrigatorio
def remover_departamento(departamento_id):
    """
    Remove um departamento (soft delete)
    """
    try:
        departamento = Departamento.query.get(departamento_id)
        if not departamento:
            return jsonify({'error': 'Departamento não encontrado'}), 404
        if not _usuario_tem_acesso_empresa(departamento.empresa_id):
            return jsonify({'error': 'Acesso negado para este departamento'}), 403

        # Verificar permissões (apenas admin pode deletar)
        usuario = _usuario_contexto()
        if not departamento_service.usuario_eh_admin(usuario.get('id')):
            return jsonify({'error': 'Acesso negado. Apenas administradores podem remover departamentos'}), 403
        
        resultado = departamento_service.delete(departamento_id)
        
        if not resultado['success']:
            return jsonify({'error': resultado['error']}), 400
        
        return jsonify(resultado), 200
        
    except Exception as e:
        return jsonify({'error': f'Erro interno: {str(e)}'}), 500

# ======================================================
# 🔍 ROTAS DE BUSCA AVANÇADA
# ======================================================

@bp.route('/search', methods=['GET'])
@token_obrigatorio
def buscar_departamentos():
    """
    Busca departamentos por termo no nome
    
    Query Parameters:
    - q: string (obrigatório) - Termo de busca
    """
    try:
        termo = request.args.get('q', '').strip()
        
        if not termo:
            return jsonify({'error': 'Parâmetro de busca "q" é obrigatório'}), 400
        
        resultado = departamento_service.search(termo)
        
        if not resultado['success']:
            return jsonify({'error': resultado['error']}), 400

        if not _usuario_eh_admin():
            empresa_id_usuario = _empresa_id_usuario()
            if not empresa_id_usuario:
                return jsonify({'error': 'Usuário não está vinculado a uma empresa.'}), 403
            resultado = _filtrar_por_empresa(resultado, empresa_id_usuario)
        
        return jsonify(resultado), 200
        
    except Exception as e:
        return jsonify({'error': f'Erro interno: {str(e)}'}), 500

# ======================================================
# 📊 ROTAS DE RELATÓRIOS
# ======================================================

@bp.route('/relatorio/geral', methods=['GET'])
@token_obrigatorio
def relatorio_geral():
    """
    Relatório geral de todos os departamentos
    
    Query Parameters:
    - formato: string (opcional) - json (padrão)
    """
    try:
        # Verificar permissões
        usuario = _usuario_contexto()
        if not departamento_service.usuario_eh_admin_ou_gerente(usuario.get('id')):
            return jsonify({'error': 'Acesso negado'}), 403
        
        resultado = departamento_service.get_all()
        
        if not resultado['success']:
            return jsonify({'error': resultado['error']}), 500
        
        empresa_id_usuario = _empresa_id_usuario()
        if not _usuario_eh_admin():
            if not empresa_id_usuario:
                return jsonify({'error': 'Usuário não está vinculado a uma empresa.'}), 403
            resultado = _filtrar_por_empresa(resultado, empresa_id_usuario)

        # Adicionar estatísticas gerais
        departamentos = resultado['data']
        total = len(departamentos)
        ativos = len([d for d in departamentos if d.get('status') == 'ativo'])
        inativos = len([d for d in departamentos if d.get('status') == 'inativo'])
        
        relatorio = {
            'success': True,
            'relatorio': 'Departamentos - Relatório Geral',
            'data_geracao': request.args.get('data', 'N/A'),
            'estatisticas': {
                'total_departamentos': total,
                'departamentos_ativos': ativos,
                'departamentos_inativos': inativos,
                'percentual_ativos': round((ativos / total * 100) if total > 0 else 0, 2)
            },
            'departamentos': departamentos
        }
        
        return jsonify(relatorio), 200
        
    except Exception as e:
        return jsonify({'error': f'Erro interno: {str(e)}'}), 500

# ======================================================
# ❌ TRATAMENTO DE ERROS
# ======================================================

@bp.errorhandler(404)
def not_found(error):
    return jsonify({'error': 'Endpoint não encontrado'}), 404

@bp.errorhandler(405)
def method_not_allowed(error):
    return jsonify({'error': 'Método não permitido'}), 405

@bp.errorhandler(500)
def internal_error(error):
    return jsonify({'error': 'Erro interno do servidor'}), 500
