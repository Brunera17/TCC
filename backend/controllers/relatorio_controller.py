import json
from flask import Blueprint, request, jsonify
from services.relatorio_services import RelatorioService

bp = Blueprint('relatorio', __name__, url_prefix='/api/relatorios')
service = RelatorioService()

@bp.route('/clientes', methods=['GET'])
def relatorio_clientes():
    try:
        relatorio = service.gerar_relatorio_clientes()
        return jsonify(relatorio), 200
    except ValueError as e:
        return jsonify({'error': str(e)}), 400
    
@bp.route('/propostas', methods=['GET'])
def relatorio_propostas():
    try:
        relatorio = service.gerar_relatorio_propostas()
        return jsonify(relatorio), 200
    except ValueError as e:
        return jsonify({'error': str(e)}), 400

@bp.route('/agendamentos', methods=['GET'])
def relatorio_agendamentos():
    try:
        relatorio = service.gerar_relatorio_agendamentos()
        return jsonify(relatorio), 200
    except ValueError as e:
        return jsonify({'error': str(e)}), 400

@bp.route('/servicos', methods=['GET'])
def relatorio_servicos():
    try:
        relatorio = service.gerar_relatorio_servicos()
        return jsonify(relatorio), 200
    except ValueError as e:
        return jsonify({'error': str(e)}), 400

@bp.route('/financeiro', methods=['GET'])
def relatorio_financeiro():
    try:
        relatorio = service.gerar_relatorio_financeiro()
        return jsonify(relatorio), 200
    except ValueError as e:
        return jsonify({'error': str(e)}), 400

@bp.route('/custom', methods=['POST'])
def relatorio_customizado():
    data = request.get_json()
    if not data:
        return jsonify({'error': 'Dados não fornecidos'}), 400
    
    try:
        relatorio = service.gerar_relatorio_customizado(**data)
        return jsonify(relatorio), 200
    except ValueError as e:
        return jsonify({'error': str(e)}), 400
    except Exception as e:
        return jsonify({'error': 'Erro inesperado: ' + str(e)}), 500
@bp.route('/<int:relatorio_id>', methods=['GET'])
def get_relatorio_especifico(relatorio_id):  
    relatorio = service.get_by_id(relatorio_id)
    if not relatorio:
        return jsonify({'error': 'Relatório não encontrado'}), 404
    return jsonify(relatorio.to_json())
@bp.route('/<int:relatorio_id>', methods=['DELETE'])
def deletar_relatorio(relatorio_id):
    try:
        service.deletar_relatorio(relatorio_id)
        return jsonify({'message': 'Relatório deletado com sucesso'}), 200
    except ValueError as e:
        return jsonify({'error': str(e)}), 400
@bp.route('/', methods=['GET'])
def get_relatorios():
    relatorios = service.get_all()
    return jsonify([relatorio.to_json() for relatorio in relatorios])   
@bp.route('/', methods=['POST'])
def criar_relatorio():
    data = request.get_json()
    if not data:
        return jsonify({'error': 'Dados não fornecidos'}), 400
    
    try:
        relatorio = service.criar_relatorio(**data)
        return jsonify(relatorio.to_json()), 201
    except ValueError as e:
        return jsonify({'error': str(e)}), 400  
@bp.route('/<int:relatorio_id>', methods=['PUT'])
def alterar_relatorio(relatorio_id):
    data = request.get_json()
    if not data:
        return jsonify({'error': 'Dados para atualização não encontrados'}), 400
    
    try:
        relatorio = service.atualizar_relatorio(relatorio_id, **data)
        return jsonify(relatorio.to_json()), 200
    except ValueError as e:
        return jsonify({'error': str(e)}), 400
    except Exception as e:
        return jsonify({'error': 'Erro inesperado: ' + str(e)}), 500
    
@bp.route('/export', methods=['POST'])
def exportar_relatorio():
    data = request.get_json()
    if not data:
        return jsonify({'error': 'Dados não fornecidos'}), 400
    
    try:
        formato = data.get('formato', 'pdf')
        conteudo = service.exportar_relatorio(**data)
        
        if formato == 'pdf':
            response = app.response_class(
                response=conteudo,
                status=200,
                mimetype='application/pdf'
            )
            response.headers['Content-Disposition'] = 'attachment; filename=relatorio.pdf'
            return response
        elif formato == 'xlsx':
            response = app.response_class(
                response=conteudo,
                status=200,
                mimetype='application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
            )
            response.headers['Content-Disposition'] = 'attachment; filename=relatorio.xlsx'
            return response
        else:
            return jsonify({'error': 'Formato não suportado'}), 400
    except ValueError as e:
        return jsonify({'error': str(e)}), 400
    except Exception as e:
        return jsonify({'error': 'Erro inesperado: ' + str(e)}), 500