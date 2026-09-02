import json
from io import BytesIO
from flask import Blueprint, request, jsonify, send_file
from services.ordemServico_services import OrdemServicoService
from services.ordem_servico_pdf_service import OrdemServicoPDFService
from services.cliente_service import ClienteService
from middleware.autenticacao_middleware import token_obrigatorio
from middleware.acesso_empresa import empresa_id_usuario, usuario_eh_admin, usuario_tem_acesso_empresa

bp = Blueprint('ordem_servico', __name__, url_prefix='/api/ordens-servico')
service = OrdemServicoService()
pdf_service = OrdemServicoPDFService()
service_cliente = ClienteService()


def _empresa_id_ordem(ordem):
    """OrdemServico não tem empresa_id próprio: deriva do cliente (ou, na
    ausência dele, da entidade jurídica) a que a ordem está vinculada."""
    if ordem.cliente:
        return ordem.cliente.empresa_id
    if ordem.empresa:  # relacionamento mal-nomeado -> na verdade EntidadeJuridica
        return ordem.empresa.empresa_id
    return None


def _tem_acesso_ordem(ordem) -> bool:
    return usuario_tem_acesso_empresa(_empresa_id_ordem(ordem))


@bp.route('/', methods=['GET'])
@token_obrigatorio
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
        empresa_id = None if usuario_eh_admin() else empresa_id_usuario()
        if not usuario_eh_admin() and not empresa_id:
            return jsonify({'error': 'Usuário não está vinculado a uma empresa.'}), 403

        paginated_response = service.get_all_paginated(
            page=page,
            per_page=per_page,
            status=status,
            search=search,
            empresa_id=empresa_id
        )

        # Retornar a resposta no formato que o frontend espera
        return jsonify(paginated_response), 200

    except ValueError as e:
        return jsonify({'error': str(e)}), 400
    except Exception as e:
        return jsonify({'error': f'Erro interno: {str(e)}'}), 500

@bp.route('/<int:ordem_id>', methods=['GET'])
@token_obrigatorio
def get_ordem_especifica(ordem_id):
    ordem = service.get_by_id(ordem_id)
    if not ordem:
        return jsonify({'error': 'Ordem de Serviço não encontrada'}), 404
    if not _tem_acesso_ordem(ordem):
        return jsonify({'error': 'Acesso negado para esta ordem de serviço'}), 403
    return jsonify(ordem.to_json())

@bp.route('/cliente/<int:cliente_id>', methods=['GET'])
@token_obrigatorio
def get_ordens_por_cliente(cliente_id):
    cliente = service_cliente.get_by_id(cliente_id)
    if not cliente:
        return jsonify({'error': 'Cliente não encontrado'}), 404
    if not usuario_tem_acesso_empresa(cliente.empresa_id):
        return jsonify({'error': 'Acesso negado para este cliente'}), 403
    ordens_servico = service.get_by_cliente(cliente_id)
    return jsonify([ordem.to_json() for ordem in ordens_servico])

@bp.route('/', methods=['POST'])
@token_obrigatorio
def criar_ordem_servico():
    data = request.get_json()
    if not data:
        return jsonify({'error': 'Dados não fornecidos'}), 400

    cliente = service_cliente.get_by_id(data.get('cliente_id')) if data.get('cliente_id') else None
    if data.get('cliente_id') and not cliente:
        return jsonify({'error': 'Cliente não encontrado'}), 404
    if cliente and not usuario_tem_acesso_empresa(cliente.empresa_id):
        return jsonify({'error': 'Cliente não pertence à sua empresa'}), 403

    try:
        ordem = service.criar_ordem_servico(**data)
        return jsonify(ordem.to_json()), 201
    except ValueError as e:
        return jsonify({'error': str(e)}), 400

@bp.route('/<int:ordem_id>', methods=['PUT'])
@token_obrigatorio
def altera_ordem_servico(ordem_id):
    data = request.get_json()
    if not data:
        return jsonify({'error': 'Dados para atualização não encontrados'}), 400

    ordem_existente = service.get_by_id(ordem_id)
    if not ordem_existente:
        return jsonify({'error': 'Ordem de Serviço não encontrada'}), 404
    if not _tem_acesso_ordem(ordem_existente):
        return jsonify({'error': 'Acesso negado para esta ordem de serviço'}), 403
    if data.get('cliente_id'):
        novo_cliente = service_cliente.get_by_id(data['cliente_id'])
        if not novo_cliente:
            return jsonify({'error': 'Cliente não encontrado'}), 404
        if not usuario_tem_acesso_empresa(novo_cliente.empresa_id):
            return jsonify({'error': 'Cliente não pertence à sua empresa'}), 403

    try:
        ordem = service.atualizar_ordem_servico(ordem_id, **data)
        return jsonify(ordem.to_json()), 200
    except ValueError as e:
        return jsonify({'error': str(e)}), 400
    
@bp.route('/<int:ordem_id>', methods=['DELETE'])
@token_obrigatorio
def deletar_ordem_servico(ordem_id):
    ordem_existente = service.get_by_id(ordem_id)
    if not ordem_existente:
        return jsonify({'error': 'Ordem de Serviço não encontrada'}), 404
    if not _tem_acesso_ordem(ordem_existente):
        return jsonify({'error': 'Acesso negado para esta ordem de serviço'}), 403

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

        # Obter a ordem, o cliente e os itens
        ordem = service.get_by_id(ordem_id)
        if not ordem:
            return jsonify({'error': 'Ordem de Serviço não encontrada'}), 404
        if not _tem_acesso_ordem(ordem):
            return jsonify({'error': 'Acesso negado para esta ordem de serviço'}), 403

        cliente = getattr(ordem, 'cliente', None)
        itens = getattr(ordem, 'itens', [])
        valor_total = getattr(ordem, 'valor_total', 0)

        # Gerar o PDF
        pdf_bytes = pdf_service.gerar_pdf(ordem, cliente, itens, valor_total)
        filename = f'ordem_servico_{ordem_id}.pdf'

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
