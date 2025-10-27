from flask import Blueprint, request, jsonify
from middleware.autenticacao_middleware import token_obrigatório
from services.servico_services import ServicoService, CategoriaServicoService

# Criando o blueprint
bp = Blueprint('servicos', __name__, url_prefix='/api/servicos')
categoria_bp = Blueprint('categorias_servicos', __name__, url_prefix='/api/categorias-servicos')

# Instanciando os serviços
servico_service = ServicoService()
categoria_service = CategoriaServicoService()

# ==================== ENDPOINTS DE SERVIÇOS ====================

@bp.route('/', methods=['GET'])
@token_obrigatório
def listar_servicos():
    """Lista todos os serviços ativos"""
    try:
        servicos = servico_service.get_all()
        return jsonify([servico.to_json() for servico in servicos]), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@bp.route('/<int:servico_id>', methods=['GET'])
@token_obrigatório
def buscar_servico(servico_id):
    """Busca um serviço específico por ID"""
    try:
        servico = servico_service.get_by_id(servico_id)
        if not servico:
            return jsonify({'error': 'Serviço não encontrado'}), 404
        return jsonify(servico.to_json()), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@bp.route('/', methods=['POST'])
@token_obrigatório
def criar_servico():
    """Cria um novo serviço"""
    data = request.get_json()
    if not data:
        return jsonify({'error': 'Dados não fornecidos'}), 400
    
    # Campos obrigatórios
    campos_obrigatorios = ['codigo', 'nome', 'valor_unitario']
    for campo in campos_obrigatorios:
        if campo not in data:
            return jsonify({'error': f'Campo {campo} é obrigatório'}), 400
    
    try:
        servico = servico_service.criar_servico(**data)
        return jsonify(servico.to_json()), 201
    except ValueError as e:
        return jsonify({'error': str(e)}), 400
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@bp.route('/<int:servico_id>', methods=['PUT'])
@token_obrigatório
def atualizar_servico(servico_id):
    """Atualiza um serviço existente"""
    data = request.get_json()
    if not data:
        return jsonify({'error': 'Dados para atualização não fornecidos'}), 400
    
    try:
        servico = servico_service.atualizar_servico(servico_id, **data)
        return jsonify(servico.to_json()), 200
    except ValueError as e:
        return jsonify({'error': str(e)}), 400
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@bp.route('/<int:servico_id>', methods=['DELETE'])
@token_obrigatório
def deletar_servico(servico_id):
    """Exclui (desativa) um serviço"""
    try:
        servico_service.deletar_servico(servico_id)
        return jsonify({'message': 'Serviço excluído com sucesso'}), 200
    except ValueError as e:
        return jsonify({'error': str(e)}), 400
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@bp.route('/categoria/<int:categoria_id>', methods=['GET'])
@token_obrigatório
def listar_servicos_por_categoria(categoria_id):
    """Lista serviços por categoria"""
    try:
        servicos = servico_service.get_by_categoria(categoria_id)
        return jsonify([servico.to_json() for servico in servicos]), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@bp.route('/codigo/<string:codigo>', methods=['GET'])
@token_obrigatório
def buscar_servico_por_codigo(codigo):
    """Busca um serviço por código"""
    try:
        servico = servico_service.get_by_codigo(codigo)
        if not servico:
            return jsonify({'error': 'Serviço não encontrado'}), 404
        return jsonify(servico.to_json()), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@bp.route('/nome/<string:nome>', methods=['GET'])
@token_obrigatório
def buscar_servico_por_nome(nome):
    """Busca um serviço por nome"""
    try:
        servico = servico_service.get_by_nome(nome)
        if not servico:
            return jsonify({'error': 'Serviço não encontrado'}), 404
        return jsonify(servico.to_json()), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500

# ==================== ENDPOINTS DE CATEGORIAS DE SERVIÇOS ====================

@categoria_bp.route('/', methods=['GET'])
@token_obrigatório
def listar_categorias():
    """Lista todas as categorias de serviços ativas"""
    try:
        categorias = categoria_service.get_all()
        return jsonify([categoria.to_json() for categoria in categorias]), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@categoria_bp.route('/<int:categoria_id>', methods=['GET'])
@token_obrigatório
def buscar_categoria(categoria_id):
    """Busca uma categoria específica por ID"""
    try:
        categoria = categoria_service.get_by_id(categoria_id)
        if not categoria:
            return jsonify({'error': 'Categoria não encontrada'}), 404
        return jsonify(categoria.to_json()), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@categoria_bp.route('/', methods=['POST'])
@token_obrigatório
def criar_categoria():
    """Cria uma nova categoria de serviço"""
    data = request.get_json()
    if not data:
        return jsonify({'error': 'Dados não fornecidos'}), 400
    
    # Campos obrigatórios
    if 'nome' not in data:
        return jsonify({'error': 'Campo nome é obrigatório'}), 400
    
    try:
        categoria = categoria_service.criar_categoria(**data)
        return jsonify(categoria.to_json()), 201
    except ValueError as e:
        return jsonify({'error': str(e)}), 400
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@categoria_bp.route('/<int:categoria_id>', methods=['PUT'])
@token_obrigatório
def atualizar_categoria(categoria_id):
    """Atualiza uma categoria existente"""
    data = request.get_json()
    if not data:
        return jsonify({'error': 'Dados para atualização não fornecidos'}), 400
    
    try:
        categoria = categoria_service.atualizar_categoria(categoria_id, **data)
        return jsonify(categoria.to_json()), 200
    except ValueError as e:
        return jsonify({'error': str(e)}), 400
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@categoria_bp.route('/<int:categoria_id>', methods=['DELETE'])
@token_obrigatório
def deletar_categoria(categoria_id):
    """Exclui (desativa) uma categoria"""
    try:
        categoria_service.deletar_categoria(categoria_id)
        return jsonify({'message': 'Categoria excluída com sucesso'}), 200
    except ValueError as e:
        return jsonify({'error': str(e)}), 400
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@categoria_bp.route('/<int:categoria_id>/servicos', methods=['GET'])
@token_obrigatório
def listar_servicos_da_categoria(categoria_id):
    """Lista todos os serviços de uma categoria específica"""
    try:
        # Primeiro verifica se a categoria existe
        categoria = categoria_service.get_by_id(categoria_id)
        if not categoria:
            return jsonify({'error': 'Categoria não encontrada'}), 404
        
        servicos = servico_service.get_by_categoria(categoria_id)
        return jsonify({
            'categoria': categoria.to_json(),
            'servicos': [servico.to_json() for servico in servicos]
        }), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500