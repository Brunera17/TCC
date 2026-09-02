from flask import Blueprint, request, jsonify
from services.empresa_service import EmpresaService

from middleware.autenticacao_middleware import token_obrigatorio
from middleware.acesso_empresa import empresa_id_usuario, usuario_eh_admin, usuario_tem_acesso_empresa

bp = Blueprint('empresa', __name__, url_prefix='/api/empresas')
service = EmpresaService()

@bp.route('/', methods=['GET'])
@token_obrigatorio
def get_empresas():
    empresas = service.get_all()
    if not usuario_eh_admin():
        empresa_id = empresa_id_usuario()
        empresas = [e for e in empresas if e.id == empresa_id]
    return jsonify([empresa.to_json() for empresa in empresas])

@bp.route('/<int:empresa_id>', methods=['GET'])
@token_obrigatorio
def get_empresa_by_id(empresa_id):
    empresa = service.get_by_id(empresa_id)
    if not empresa:
        return jsonify({'error': 'Empresa não encontrada'}), 404
    if not usuario_tem_acesso_empresa(empresa_id):
        return jsonify({'error': 'Acesso negado para esta empresa'}), 403
    return jsonify(empresa.to_json())

@bp.route('/', methods=['POST'])
@token_obrigatorio
def criar_empresa():
    # Cadastrar uma nova empresa (novo tenant) é uma operação de administrador global.
    if not usuario_eh_admin():
        return jsonify({'error': 'Acesso negado. Apenas administradores podem cadastrar empresas'}), 403

    data = request.get_json()
    if not data:
        return jsonify({'error': 'Dados não fornecidos'}), 400

    try:
        empresa = service.criar_empresa(**data)
        return jsonify(empresa.to_json()), 201
    except ValueError as e:
        return jsonify({'error': str(e)}), 400

@bp.route('/<int:empresa_id>', methods=['PUT'])
@token_obrigatorio
def atualizar_empresa(empresa_id):
    if not usuario_tem_acesso_empresa(empresa_id):
        return jsonify({'error': 'Acesso negado para esta empresa'}), 403

    data = request.get_json()
    if not data:
        return jsonify({'error': 'Dados não fornecidos'}), 400

    try:
        empresa = service.atualizar_empresa(empresa_id, **data)
        return jsonify(empresa.to_json()), 200
    except ValueError as e:
        return jsonify({'error': str(e)}), 400

@bp.route('/<int:empresa_id>', methods=['DELETE'])
@token_obrigatorio
def deletar_empresa(empresa_id):
    if not empresa_id:
        return jsonify({'error': 'ID da empresa não fornecido'}), 400
    # Deletar uma empresa apaga em cascata todos os clientes/propostas/etc
    # vinculados a ela - restrito a administradores globais.
    if not usuario_eh_admin():
        return jsonify({'error': 'Acesso negado. Apenas administradores podem remover empresas'}), 403

    try:
        empresa = service.deletar_empresa(empresa_id)
        return jsonify(empresa.to_json()), 200
    except ValueError as e:
        return jsonify({'error': str(e)}), 400

