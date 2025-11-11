from flask import Blueprint, request, jsonify
from services.tipo_atividade_service import TipoAtividadeService
from middleware.autenticacao_middleware import token_obrigatorio

bp = Blueprint('tipo_atividade', __name__, url_prefix='/api/tipos-atividade')
service = TipoAtividadeService()


def _usuario_eh_admin_ou_gerente():
    contexto = getattr(request, 'usuario_atual', {}) or {}
    if isinstance(contexto, dict) and isinstance(contexto.get('user'), dict):
        usuario = contexto['user']
    elif isinstance(contexto, dict):
        usuario = contexto
    else:
        usuario = {}
    return usuario.get('eh_gerente') is True or usuario.get('tipo_usuario') == 'admin'

# ==============================================
# 📋 ENDPOINTS PARA TIPOS DE ATIVIDADE
# ==============================================

@bp.route('/', methods=['GET'])
@token_obrigatorio
def get_tipos():
    """Lista todos os tipos de atividade"""
    try:
        tipos = service.get_all()
        return jsonify([tipo.to_json() for tipo in tipos]), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@bp.route('/<int:tipo_id>', methods=['GET'])
@token_obrigatorio
def get_tipo_por_id(tipo_id):
    """Busca tipo de atividade por ID"""
    try:
        tipo = service.get_by_id(tipo_id)
        return jsonify(tipo.to_json()), 200
    except ValueError as e:
        return jsonify({'error': str(e)}), 404
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@bp.route('/buscar', methods=['GET'])
@token_obrigatorio
def buscar_tipos():
    """Busca tipos de atividade por nome"""
    try:
        nome = request.args.get('nome', '').strip()
        if not nome:
            return jsonify({'error': 'Parâmetro nome é obrigatório'}), 400
        
        tipos = service.search_by_name(nome)
        return jsonify([tipo.to_json() for tipo in tipos]), 200
    except ValueError as e:
        return jsonify({'error': str(e)}), 400
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@bp.route('/', methods=['POST'])
@token_obrigatorio
def criar_tipo():
    """Cria um novo tipo de atividade"""
    try:
        if not _usuario_eh_admin_ou_gerente():
            return jsonify({'error': 'Acesso negado. Apenas administradores ou gerentes podem criar tipos de atividade.'}), 403
        
        data = request.get_json()
        if not data:
            return jsonify({'error': 'Dados não fornecidos'}), 400
        
        tipo = service.criar_tipo(**data)
        return jsonify(tipo.to_json()), 201
    except ValueError as e:
        return jsonify({'error': str(e)}), 400
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@bp.route('/<int:tipo_id>', methods=['PUT'])
@token_obrigatorio
def atualizar_tipo(tipo_id):
    """Atualiza um tipo de atividade existente"""
    try:
        if not _usuario_eh_admin_ou_gerente():
            return jsonify({'error': 'Acesso negado. Apenas administradores ou gerentes podem atualizar tipos de atividade.'}), 403
        
        data = request.get_json()
        if not data:
            return jsonify({'error': 'Dados não fornecidos'}), 400
        
        tipo = service.atualizar_tipo(tipo_id, **data)
        return jsonify(tipo.to_json()), 200
    except ValueError as e:
        return jsonify({'error': str(e)}), 400
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@bp.route('/<int:tipo_id>', methods=['DELETE'])
@token_obrigatorio
def deletar_tipo(tipo_id):
    """Remove um tipo de atividade"""
    try:
        if not _usuario_eh_admin_ou_gerente():
            return jsonify({'error': 'Acesso negado. Apenas administradores ou gerentes podem deletar tipos de atividade.'}), 403
        
        service.deletar_tipo(tipo_id)
        return jsonify({'message': 'Tipo de atividade removido com sucesso'}), 200
    except ValueError as e:
        return jsonify({'error': str(e)}), 400
    except Exception as e:
        return jsonify({'error': str(e)}), 500