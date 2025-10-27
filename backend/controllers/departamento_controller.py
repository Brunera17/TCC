from flask import Blueprint, request, jsonify
from services.departamento_service import DepartamentoService
from middleware.autenticacao_middleware import token_obrigatório

# Criar blueprint
bp = Blueprint('departamentos', __name__, url_prefix='/api/departamentos')

# Inicializar serviço
departamento_service = DepartamentoService()

# ======================================================
# 📋 ROTAS DE CONSULTA
# ======================================================

@bp.route('/', methods=['GET'])
@token_obrigatório
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
        empresa_id = request.args.get('empresa_id', type=int)
        status = request.args.get('status', type=str)
        search = request.args.get('search', type=str)
        
        # Buscar por empresa específica
        if empresa_id:
            resultado = departamento_service.get_by_empresa(empresa_id)
            if not resultado['success']:
                return jsonify({'error': resultado['error']}), 404
            return jsonify(resultado), 200
        
        # Buscar por termo
        if search:
            resultado = departamento_service.search(search)
            if not resultado['success']:
                return jsonify({'error': resultado['error']}), 400
            return jsonify(resultado), 200
        
        # Listar todos
        resultado = departamento_service.get_all()
        if not resultado['success']:
            return jsonify({'error': resultado['error']}), 500
        
        # Filtrar por status se especificado
        if status:
            departamentos_filtrados = [
                dept for dept in resultado['data'] 
                if dept.get('status') == status
            ]
            resultado['data'] = departamentos_filtrados
            resultado['total'] = len(departamentos_filtrados)
        
        return jsonify(resultado), 200
        
    except Exception as e:
        return jsonify({'error': f'Erro interno: {str(e)}'}), 500

@bp.route('/<int:departamento_id>', methods=['GET'])
@token_obrigatório
def buscar_departamento(departamento_id):
    """
    Busca um departamento específico por ID
    """
    try:
        resultado = departamento_service.get_by_id(departamento_id)
        
        if not resultado['success']:
            return jsonify({'error': resultado['error']}), 404
        
        return jsonify(resultado), 200
        
    except Exception as e:
        return jsonify({'error': f'Erro interno: {str(e)}'}), 500

@bp.route('/empresa/<int:empresa_id>', methods=['GET'])
@token_obrigatório
def listar_por_empresa(empresa_id):
    """
    Lista todos os departamentos de uma empresa específica
    """
    try:
        resultado = departamento_service.get_by_empresa(empresa_id)
        
        if not resultado['success']:
            return jsonify({'error': resultado['error']}), 404
        
        return jsonify(resultado), 200
        
    except Exception as e:
        return jsonify({'error': f'Erro interno: {str(e)}'}), 500

@bp.route('/empresa/<int:empresa_id>/estatisticas', methods=['GET'])
@token_obrigatório
def estatisticas_empresa(empresa_id):
    """
    Retorna estatísticas dos departamentos de uma empresa
    """
    try:
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
@token_obrigatório
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
        if not departamento_service.usuario_eh_admin_ou_gerente(request.usuario_atual['user']['id']):
            return jsonify({'error': 'Acesso negado. Apenas administradores e gerentes podem criar departamentos'}), 403
        
        resultado = departamento_service.create(dados)
        
        if not resultado['success']:
            return jsonify({'error': resultado['error']}), 400
        
        return jsonify(resultado), 201
        
    except Exception as e:
        return jsonify({'error': f'Erro interno: {str(e)}'}), 500

@bp.route('/<int:departamento_id>', methods=['PUT'])
@token_obrigatório
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
        
        # Verificar permissões
        if not departamento_service.usuario_eh_admin_ou_gerente(request.usuario_atual['user']['id']):
            return jsonify({'error': 'Acesso negado. Apenas administradores e gerentes podem atualizar departamentos'}), 403
        
        resultado = departamento_service.update(departamento_id, dados)
        
        if not resultado['success']:
            return jsonify({'error': resultado['error']}), 400
        
        return jsonify(resultado), 200
        
    except Exception as e:
        return jsonify({'error': f'Erro interno: {str(e)}'}), 500

@bp.route('/<int:departamento_id>', methods=['DELETE'])
@token_obrigatório
def remover_departamento(departamento_id):
    """
    Remove um departamento (soft delete)
    """
    try:
        # Verificar permissões (apenas admin pode deletar)
        if not departamento_service.usuario_eh_admin(request.usuario_atual['user']['id']):
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
@token_obrigatório
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
        
        return jsonify(resultado), 200
        
    except Exception as e:
        return jsonify({'error': f'Erro interno: {str(e)}'}), 500

# ======================================================
# 📊 ROTAS DE RELATÓRIOS
# ======================================================

@bp.route('/relatorio/geral', methods=['GET'])
@token_obrigatório
def relatorio_geral():
    """
    Relatório geral de todos os departamentos
    
    Query Parameters:
    - formato: string (opcional) - json (padrão)
    """
    try:
        # Verificar permissões
        if not departamento_service.usuario_eh_admin_ou_gerente(request.usuario_atual['user']['id']):
            return jsonify({'error': 'Acesso negado'}), 403
        
        resultado = departamento_service.get_all()
        
        if not resultado['success']:
            return jsonify({'error': resultado['error']}), 500
        
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
