import json
from flask import Blueprint, request, jsonify
from services.proposta_services import PropostaService
from services.cliente_service import ClienteService
from services.servico_services import ServicoService

bp = Blueprint('proposta', __name__, url_prefix='/api/propostas')
service = PropostaService()

@bp.route('/', methods=['GET'])
def get_propostas():
    propostas = service.get_all()
    return jsonify([proposta.to_json() for proposta in propostas])

@bp.route('/<int:proposta_id>', methods=['GET'], strict_slashes=False)
def get_proposta_especifica(proposta_id):
    proposta = service.get_by_id(proposta_id)
    if not proposta:
        return jsonify({'error': 'Proposta não encontrada'}), 404
    return jsonify(proposta.to_json())

@bp.route('/cliente/<int:cliente_id>', methods=['GET'])
def get_propostas_por_cliente(cliente_id):
    propostas = service.get_by_cliente(cliente_id)
    return jsonify([proposta.to_json() for proposta in propostas])

@bp.route('/', methods=['POST'])
def criar_proposta():
    data = request.get_json()
    if not data:
        return jsonify({'error': 'Dados não fornecidos'}), 400
    
    try:
        proposta = service.criar_proposta(**data)
        return jsonify(proposta.to_json()), 201
    except ValueError as e:
        return jsonify({'error': str(e)}), 400
    
@bp.route('/<int:proposta_id>', methods=['PUT'], strict_slashes=False)
def altera_proposta(proposta_id):   
    data = request.get_json()
    if not data:
        return jsonify({'error': 'Dados para atualização não encontrados'}), 400
    
    print(f"🔄 Atualizando proposta {proposta_id}")
    print(f"📝 Dados recebidos: {data}")
    print(f"💰 percentual_desconto: {data.get('percentual_desconto')}")
    print(f"📅 data_validade: {data.get('data_validade')}")

    # Corrigir campo validade para None ou datetime
    from datetime import datetime
    validade = data.get('validade') or data.get('data_validade')
    if validade == '' or validade is None:
        data['validade'] = None
    elif isinstance(validade, str):
        try:
            # Aceita formatos comuns
            data['validade'] = datetime.strptime(validade, "%Y-%m-%d")
        except Exception:
            try:
                data['validade'] = datetime.strptime(validade, "%d/%m/%Y")
            except Exception:
                data['validade'] = None

    try:
        proposta = service.atualizar_proposta(proposta_id, **data)
        return jsonify(proposta.to_json()), 200
    except ValueError as e:
        return jsonify({'error': str(e)}), 400

# ROTA PARA GERAR PDF DA PROPOSTA
@bp.route('/<int:proposta_id>/gerar-pdf/', methods=['POST'])
def gerar_pdf_proposta(proposta_id):
    from services.proposta_pdf_generator import pdf_generator
    try:
        caminho_pdf = pdf_generator.gerar_pdf_proposta(proposta_id)
        # Atualiza o campo pdf_gerado na proposta
        from models.proposta import Proposta
        from models.base import db
        proposta = Proposta.query.filter_by(id=proposta_id).first()
        if proposta:
            proposta.pdf_gerado = True
            proposta.pdf_caminho = caminho_pdf
            db.session.commit()
        return jsonify({"pdf_path": caminho_pdf}), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500

# ROTA PARA VISUALIZAR/DOWNLOAD DO PDF GERADO
@bp.route('/<int:proposta_id>/pdf', methods=['GET'], strict_slashes=False)
def visualizar_pdf_proposta(proposta_id):
    import os
    from flask import send_file
    from services.proposta_pdf_generator import pdf_generator
    try:
        caminho_pdf = pdf_generator.gerar_pdf_proposta(proposta_id)
        if not os.path.exists(caminho_pdf):
            return jsonify({"error": "PDF não encontrado"}), 404
        return send_file(caminho_pdf, mimetype='application/pdf', as_attachment=False)
    except Exception as e:
        return jsonify({"error": str(e)}), 500
    
@bp.route('/<int:proposta_id>', methods=['DELETE'], strict_slashes=False)
def deletar_proposta(proposta_id):
    try:
        service.deletar_proposta(proposta_id)
        return jsonify({'message': 'Proposta deletada com sucesso'}), 200
    except ValueError as e:
        return jsonify({'error': str(e)}), 400