import json
from flask import Blueprint, request, jsonify, Response
from services.relatorio_services import RelatorioService
from middleware.autenticacao_middleware import token_obrigatorio

bp = Blueprint('relatorio', __name__, url_prefix='/api/relatorios')
service = RelatorioService()

# Blueprint adicional para compatibilidade com rotas do frontend em /reports
reports_bp = Blueprint('reports', __name__, url_prefix='/reports')


@reports_bp.route('/clientes', methods=['GET'])
@token_obrigatorio
def reports_clientes():
    # Rota compatível com /reports/clientes -> gera PDF
    try:
        pdf_bytes = service.gerar_relatorio_clientes_pdf()
        response = Response(pdf_bytes, status=200, mimetype='application/pdf')
        response.headers['Content-Disposition'] = 'attachment; filename=relatorio_clientes.pdf'
        return response
    except ValueError as e:
        return jsonify({'error': str(e)}), 400
    except Exception as e:
        return jsonify({'error': 'Erro inesperado: ' + str(e)}), 500


@reports_bp.route('/relatorios/clientes', methods=['GET'])
@token_obrigatorio
def reports_relatorios_clientes_alias():
    # Rota alias usada por algumas versões do frontend
    try:
        pdf_bytes = service.gerar_relatorio_clientes_pdf()
        response = Response(pdf_bytes, status=200, mimetype='application/pdf')
        response.headers['Content-Disposition'] = 'attachment; filename=relatorio_clientes.pdf'
        return response
    except ValueError as e:
        return jsonify({'error': str(e)}), 400
    except Exception as e:
        return jsonify({'error': 'Erro inesperado: ' + str(e)}), 500


# Compatibilidade: expor /reports/propostas para o frontend que espera esse caminho
@reports_bp.route('/propostas', methods=['GET'])
@token_obrigatorio
def reports_propostas():
    try:
        fmt = request.args.get('format') or request.args.get('formato')
        accept = request.headers.get('Accept', '') or request.headers.get('accept', '')
        # Se o cliente pedir explicitamente PDF via query ?format=pdf ou pelo header Accept, retornamos PDF
        if (fmt and fmt.lower() == 'pdf') or ('application/pdf' in accept.lower()):
            pdf_bytes = service.gerar_relatorio_propostas_pdf()
            response = Response(pdf_bytes, status=200, mimetype='application/pdf')
            response.headers['Content-Disposition'] = 'attachment; filename=relatorio_propostas.pdf'
            return response

        relatorio = service.gerar_relatorio_propostas()
        return jsonify(relatorio), 200
    except ValueError as e:
        return jsonify({'error': str(e)}), 400
    except Exception as e:
        return jsonify({'error': 'Erro inesperado: ' + str(e)}), 500


# Rotas adicionais de compatibilidade para relatórios predefinidos que não possuem PDF
# Se o frontend pedir PDF via Accept, retornamos 501 com mensagem instrutiva.
def _respond_or_not_implemented_json(result):
    # helper para respostas compatíveis: se o cliente pediu PDF, retorna 501
    accept = request.headers.get('Accept', '') or request.headers.get('accept', '')
    if 'application/pdf' in accept.lower():
        return jsonify({'error': 'Geração de PDF não implementada para este relatório'}), 501
    return jsonify(result), 200


@reports_bp.route('/agendamentos', methods=['GET'])
@token_obrigatorio
def reports_agendamentos():
    try:
        inicio = request.args.get('inicio')
        fim = request.args.get('fim')
        accept = request.headers.get('Accept', '') or request.headers.get('accept', '')
        # Se o cliente solicitar PDF via header Accept, retorna PDF
        if 'application/pdf' in accept.lower():
            try:
                pdf_bytes = service.gerar_relatorio_agendamentos_pdf(inicio=inicio, fim=fim)
                response = Response(pdf_bytes, status=200, mimetype='application/pdf')
                response.headers['Content-Disposition'] = 'attachment; filename=relatorio_agendamentos.pdf'
                return response
            except ValueError as e:
                # Mensagem informativa sobre falhas na geração
                return jsonify({'error': str(e)}), 400

        # Caso contrário, retorna JSON com os dados do relatório
        relatorio = service.gerar_relatorio_agendamentos(inicio=inicio, fim=fim)
        return jsonify(relatorio), 200
    except ValueError as e:
        return jsonify({'error': str(e)}), 400
    except Exception as e:
        return jsonify({'error': 'Erro inesperado: ' + str(e)}), 500


@reports_bp.route('/servicos', methods=['GET'])
@token_obrigatorio
def reports_servicos():
    try:
        accept = request.headers.get('Accept', '') or request.headers.get('accept', '')
        if 'application/pdf' in accept.lower():
            try:
                pdf_bytes = service.gerar_relatorio_servicos_pdf()
                response = Response(pdf_bytes, status=200, mimetype='application/pdf')
                response.headers['Content-Disposition'] = 'attachment; filename=relatorio_servicos.pdf'
                return response
            except ValueError as e:
                return jsonify({'error': str(e)}), 400
        relatorio = service.gerar_relatorio_servicos()
        return jsonify(relatorio), 200
    except ValueError as e:
        return jsonify({'error': str(e)}), 400
    except Exception as e:
        return jsonify({'error': 'Erro inesperado: ' + str(e)}), 500


@reports_bp.route('/financeiro', methods=['GET'])
@token_obrigatorio
def reports_financeiro():
    try:
        accept = request.headers.get('Accept', '') or request.headers.get('accept', '')
        if 'application/pdf' in accept.lower():
            try:
                pdf_bytes = service.gerar_relatorio_financeiro_pdf()
                response = Response(pdf_bytes, status=200, mimetype='application/pdf')
                response.headers['Content-Disposition'] = 'attachment; filename=relatorio_financeiro.pdf'
                return response
            except ValueError as e:
                return jsonify({'error': str(e)}), 400
        relatorio = service.gerar_relatorio_financeiro()
        return jsonify(relatorio), 200
    except ValueError as e:
        return jsonify({'error': str(e)}), 400
    except Exception as e:
        return jsonify({'error': 'Erro inesperado: ' + str(e)}), 500


@bp.route('/clientes', methods=['GET'])
@token_obrigatorio
def relatorio_clientes():
    # Gera e retorna PDF do relatório de clientes
    try:
        pdf_bytes = service.gerar_relatorio_clientes_pdf()
        response = Response(pdf_bytes, status=200, mimetype='application/pdf')
        response.headers['Content-Disposition'] = 'attachment; filename=relatorio_clientes.pdf'
        return response
    except ValueError as e:
        return jsonify({'error': str(e)}), 400
    except Exception as e:
        return jsonify({'error': 'Erro inesperado: ' + str(e)}), 500
    

@bp.route('/agendamentos', methods=['GET'])
@token_obrigatorio
def relatorio_agendamentos():
    try:
        # Suporta filtros de data: ?inicio=YYYY-MM-DD&fim=YYYY-MM-DD
        inicio = request.args.get('inicio')
        fim = request.args.get('fim')
        relatorio = service.gerar_relatorio_agendamentos(inicio=inicio, fim=fim)
        return jsonify(relatorio), 200
    except ValueError as e:
        return jsonify({'error': str(e)}), 400

@bp.route('/servicos', methods=['GET'])
@token_obrigatorio
def relatorio_servicos():
    try:
        relatorio = service.gerar_relatorio_servicos()
        return jsonify(relatorio), 200
    except ValueError as e:
        return jsonify({'error': str(e)}), 400

@bp.route('/financeiro', methods=['GET'])
@token_obrigatorio
def relatorio_financeiro():
    try:
        relatorio = service.gerar_relatorio_financeiro()
        return jsonify(relatorio), 200
    except ValueError as e:
        return jsonify({'error': str(e)}), 400

@bp.route('/custom', methods=['POST'])
@token_obrigatorio
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
@token_obrigatorio
def get_relatorio_especifico(relatorio_id):  
    relatorio = service.get_by_id(relatorio_id)
    if not relatorio:
        return jsonify({'error': 'Relatório não encontrado'}), 404
    return jsonify(relatorio.to_json())
@bp.route('/<int:relatorio_id>', methods=['DELETE'])
@token_obrigatorio
def deletar_relatorio(relatorio_id):
    try:
        service.deletar_relatorio(relatorio_id)
        return jsonify({'message': 'Relatório deletado com sucesso'}), 200
    except ValueError as e:
        return jsonify({'error': str(e)}), 400
@bp.route('/', methods=['GET'])
@token_obrigatorio
def get_relatorios():
    relatorios = service.get_all()
    return jsonify([relatorio.to_json() for relatorio in relatorios])   
@bp.route('/', methods=['POST'])
@token_obrigatorio
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
@token_obrigatorio
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
@token_obrigatorio
def exportar_relatorio():
    data = request.get_json()
    if not data:
        return jsonify({'error': 'Dados não fornecidos'}), 400
    
    try:
        formato = data.get('formato', 'pdf')
        conteudo = service.exportar_relatorio(**data)
        
        if formato == 'pdf':
            response = Response(conteudo, status=200, mimetype='application/pdf')
            response.headers['Content-Disposition'] = 'attachment; filename=relatorio.pdf'
            return response
        elif formato == 'xlsx':
            response = Response(conteudo, status=200, mimetype='application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')
            response.headers['Content-Disposition'] = 'attachment; filename=relatorio.xlsx'
            return response
        else:
            return jsonify({'error': 'Formato não suportado'}), 400
    except ValueError as e:
        return jsonify({'error': str(e)}), 400
    except Exception as e:
        return jsonify({'error': 'Erro inesperado: ' + str(e)}), 500