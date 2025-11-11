import json
from flask import Blueprint, request, jsonify
from services.proposta_services import PropostaService
from models.organizacional import Usuario
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
# Rota para histórico de alterações da proposta
@bp.route('/<int:proposta_id>/logs/', methods=['GET'], strict_slashes=False)
def get_proposta_logs(proposta_id):
    # Tentar obter logs reais via serviço, se disponível.
    try:
        if hasattr(service, 'get_logs'):
            raw_logs = service.get_logs(proposta_id)
        elif hasattr(service, 'get_proposta_logs'):
            raw_logs = service.get_proposta_logs(proposta_id)
        else:
            raw_logs = None

        if raw_logs is None:
            # Nenhum histórico armazenado: retornar lista vazia (sem dados mock)
            return jsonify({'logs': []}), 200

        # Normalizar retorno para uma lista de dicionários serializáveis
        normalized = []
        for item in raw_logs:
            if isinstance(item, dict):
                obj = item
            else:
                # modelo ORM com to_json ou __dict__
                if hasattr(item, 'to_json'):
                    obj = item.to_json()
                else:
                    try:
                        obj = {k: v for k, v in vars(item).items() if not k.startswith('_')}
                    except Exception:
                        # fallback: converter para string
                        obj = {'value': str(item)}

            # tentar desserializar o campo 'detalhes' quando for JSON serializado
            try:
                if isinstance(obj.get('detalhes'), str) and obj.get('detalhes'):
                    parsed = json.loads(obj['detalhes'])
                    obj['detalhes'] = parsed
            except Exception:
                # se falhar em parse, manter string original
                pass

            normalized.append(obj)

        # Função utilitária para derivar uma ação semântica a partir do campo/acao brutos
        def map_campo_to_acao(campo: str | None, acao_raw: str | None):
            if not campo:
                campo = acao_raw
            c = (campo or '').lower()
            if 'status' in c:
                return 'STATUS_ALTERADO'
            if 'itens' in c or 'servico' in c or 'serviços' in c:
                return 'SERVICOS_ALTERADOS'
            if 'desconto' in c or 'porcentagem' in c or 'valor' in c:
                return 'DESCONTO_ALTERADO'
            if 'observac' in c or 'observa' in c:
                return 'OBSERVACOES_ALTERADAS'
            return 'PROPOSTA_EDITADA'

        # Converter logs de auditoria para o formato esperado pelo frontend (compatibilidade)
        frontend_logs = []

        for entry in normalized:
            try:
                if 'acao' in entry:
                    acao = entry.get('acao')
                    detalhes = entry.get('detalhes')
                    usuario_id = entry.get('usuario_id')
                    created_at = entry.get('created_at')

                    # Obter nome do usuário, quando possível.
                    usuario_nome = entry.get('usuario_nome') or None
                    if not usuario_nome and usuario_id:
                        try:
                            usuario_obj = Usuario.query.filter_by(id=usuario_id).first()
                            if usuario_obj:
                                usuario_nome = usuario_obj.nome
                        except Exception:
                            usuario_nome = None

                    # Montar entradas para o frontend moderno
                    if acao == 'PROPOSTA_CRIADA' or acao == 'create':
                        campo = 'criação'
                        frontend_logs.append({
                            'id': entry.get('id'),
                            'proposta_id': entry.get('proposta_id'),
                            'acao': map_campo_to_acao(campo, acao),
                            'campo_alterado': campo,
                            'valor_anterior': None,
                            'valor_novo': 'Registro criado',
                            'usuario_id': usuario_id,
                            'usuario_nome': usuario_nome,
                            'created_at': created_at,
                            'observacao': detalhes if isinstance(detalhes, str) else (json.dumps(detalhes, ensure_ascii=False) if detalhes else None)
                        })
                    elif acao == 'PROPOSTA_DELETADA' or acao == 'delete':
                        campo = 'deleção'
                        frontend_logs.append({
                            'id': entry.get('id'),
                            'proposta_id': entry.get('proposta_id'),
                            'acao': map_campo_to_acao(campo, acao),
                            'campo_alterado': campo,
                            'valor_anterior': json.dumps(detalhes, ensure_ascii=False) if detalhes else None,
                            'valor_novo': None,
                            'usuario_id': usuario_id,
                            'usuario_nome': usuario_nome,
                            'created_at': created_at,
                            'observacao': None
                        })
                    elif acao == 'PROPOSTA_EDITADA' or acao == 'update':
                        if isinstance(detalhes, list):
                            for idx, change in enumerate(detalhes):
                                campo = change.get('campo') or change.get('field') or change.get('campo_alterado')
                                before = change.get('before')
                                after = change.get('after')
                                try:
                                    before_safe = json.dumps(before, ensure_ascii=False) if isinstance(before, (dict, list)) else before
                                except Exception:
                                    before_safe = str(before)
                                try:
                                    after_safe = json.dumps(after, ensure_ascii=False) if isinstance(after, (dict, list)) else after
                                except Exception:
                                    after_safe = str(after)

                                frontend_logs.append({
                                    'id': f"{entry.get('id')}-{idx}",
                                    'proposta_id': entry.get('proposta_id'),
                                    'acao': map_campo_to_acao(campo, acao),
                                    'campo_alterado': campo or 'campo',
                                    'valor_anterior': before_safe,
                                    'valor_novo': after_safe,
                                    'usuario_id': usuario_id,
                                    'usuario_nome': usuario_nome,
                                    'created_at': created_at,
                                    'observacao': None
                                })
                        else:
                            campo = 'atualização'
                            frontend_logs.append({
                                'id': entry.get('id'),
                                'proposta_id': entry.get('proposta_id'),
                                'acao': map_campo_to_acao(campo, acao),
                                'campo_alterado': campo,
                                'valor_anterior': None,
                                'valor_novo': None,
                                'usuario_id': usuario_id,
                                'usuario_nome': usuario_nome,
                                'created_at': created_at,
                                'observacao': json.dumps(detalhes, ensure_ascii=False) if detalhes else None
                            })
                    else:
                        campo = entry.get('acao') or entry.get('campo_alterado') or 'outra_acao'
                        frontend_logs.append({
                            'id': entry.get('id'),
                            'proposta_id': entry.get('proposta_id'),
                            'acao': map_campo_to_acao(campo, entry.get('acao')),
                            'campo_alterado': campo,
                            'valor_anterior': None,
                            'valor_novo': None,
                            'usuario_id': usuario_id,
                            'usuario_nome': entry.get('usuario_nome') or None,
                            'created_at': entry.get('created_at'),
                            'observacao': entry.get('detalhes')
                        })

                    # Não construir formato legado: o frontend consome o formato unificado 'logs'
                else:
                    # Não é um log de auditoria: tentar enriquecer com 'acao' derivada antes de retornar
                    try:
                        entry['acao'] = map_campo_to_acao(entry.get('campo_alterado'), entry.get('acao'))
                    except Exception:
                        entry['acao'] = 'PROPOSTA_EDITADA'
                    frontend_logs.append(entry)
            except Exception:
                # Se algum registro falhar ao mapear, pular e continuar
                continue

        return jsonify({'logs': frontend_logs}), 200
    except Exception as e:
        print(f"Erro ao recuperar logs da proposta {proposta_id}: {e}")
        return jsonify({'logs': []}), 200
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