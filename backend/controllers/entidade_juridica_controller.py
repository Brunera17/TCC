from flask import Blueprint, request, jsonify
from services.entidade_juridica_service import EntidadeJuridicaService

bp = Blueprint('entidadejuridica', __name__, url_prefix='/api/auth/entidadejuridica')
serviceEntidade = EntidadeJuridicaService()

@bp.route('/', methods=['GET'])
def get_entidades_juridica():
    pass
@bp.route('/<int:entidade_id>', methods=['GET'])
def get_entidade_juridica_especifica(id):
    pass
@bp.route('/', methods = ['POST'])
def criar_entidade_juridica():
    pass
@bp.route('/<int:entidade_id>', methods = ['PUT'])
def atualiza_entidade_juridica(id):
    pass
@bp.route('/<int:entidade_id>', methods = ['DELETE'])
def deletar_entidade_juridica(id):
    pass