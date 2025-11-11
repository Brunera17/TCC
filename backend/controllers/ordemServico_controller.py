import json
from io import BytesIO
from flask import Blueprint, request, jsonify, send_file
from services.ordemServico_services import OrdemServicoService
from services.ordem_servico_pdf_service import OrdemServicoPDFService
from middleware.autenticacao_middleware import token_obrigatorio

bp = Blueprint('ordem_servico', __name__, url_prefix='/api/ordens-servico')
service = OrdemServicoService()
pdf_service = OrdemServicoPDFService()

@bp.route('/', methods=['GET'])
def get_ordens_servico():
    try:
        page = request.args.get('page', 1, type=int)
        per_page = request.args.get('per_page', 10, type=int)

        status = request.args.get('status', type=str)
        if status:
            status = status.strip()
            if status.lower() in {'', 'null', 'undefined'}:
                status = None
        else:
            status = None

        search = request.args.get('search', type=str)
        if search:
            search = search.strip()
            if search.lower() in {'', 'null', 'undefined'}:
                search = None
        else:
            search = None

        # Passar os filtros para o service
        paginated_response = service.get_all_paginated(
            page=page,
            per_page=per_page,
            status=status,
            search=search
        )
        
        # Retornar a resposta no formato que o frontend espera
        return jsonify(paginated_response), 200

    except ValueError as e:
        return jsonify({'error': str(e)}), 400
    except Exception as e:
        return jsonify({'error': f'Erro interno: {str(e)}'}), 500

@bp.route('/<int:ordem_id>', methods=['GET'])
def get_ordem_especifica(ordem_id):
    ordem = service.get_by_id(ordem_id)
    if not ordem:
        return jsonify({'error': 'Ordem de Serviço não encontrada'}), 404
    return jsonify(ordem.to_json())

@bp.route('/cliente/<int:cliente_id>', methods=['GET'])
def get_ordens_por_cliente(cliente_id):
    ordens_servico = service.get_by_cliente(cliente_id)
    return jsonify([ordem.to_json() for ordem in ordens_servico])

@bp.route('/', methods=['POST'])
def criar_ordem_servico():
    data = request.get_json()
    if not data:
        return jsonify({'error': 'Dados não fornecidos'}), 400
    
    try:
        ordem = service.criar_ordem_servico(**data)
        return jsonify(ordem.to_json()), 201
    except ValueError as e:
        return jsonify({'error': str(e)}), 400
    
@bp.route('/<int:ordem_id>', methods=['PUT'])
def altera_ordem_servico(ordem_id):
    data = request.get_json()
    if not data:
        return jsonify({'error': 'Dados para atualização não encontrados'}), 400
    
    try:
        ordem = service.atualizar_ordem_servico(ordem_id, **data)
        return jsonify(ordem.to_json()), 200
    except ValueError as e:
        return jsonify({'error': str(e)}), 400
    
@bp.route('/<int:ordem_id>', methods=['DELETE'])
def deletar_ordem_servico(ordem_id):
    try:
        service.deletar_ordem_servico(ordem_id)
        return jsonify({'message': 'Ordem de Serviço deletada com sucesso'}), 200
    except ValueError as e:
        return jsonify({'error': str(e)}), 400


@bp.route('/<int:ordem_id>/pdf', methods=['GET'])
@token_obrigatorio
def gerar_pdf_ordem_servico(ordem_id: int):
    try:
        download = request.args.get('download', 'false').lower() == 'true'
        pdf_bytes, filename = pdf_service.gerar_pdf(ordem_id)
        return send_file(
            BytesIO(pdf_bytes),
            mimetype='application/pdf',
            as_attachment=download,
            download_name=filename
        )
    except ValueError as exc:
        return jsonify({'error': str(exc)}), 404
    except RuntimeError as exc:
        return jsonify({'error': str(exc)}), 500
    except Exception as exc:
        return jsonify({'error': f'Erro ao gerar PDF da ordem de serviço: {str(exc)}'}), 500