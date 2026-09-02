import logging
from datetime import datetime, timezone, timedelta
from typing import Any

from sqlalchemy.inspection import inspect

from models.proposta import ItemProposta, Proposta
from repositories.proposta_repository import PropostaRepository
from services.audit_log_service import AuditLogService
from models.organizacional import Usuario

logger = logging.getLogger(__name__)

class PropostaService:
    """ Serviço para gerenciar propostas """

    def __init__(self):
        self.repo = PropostaRepository()
        # Serviço para auditoria/histórico
        self.audit = AuditLogService()

        # Cache das colunas mapeadas para evitar passar atributos inválidos ao modelo
        self._proposta_columns = {
            attr.key for attr in inspect(Proposta).mapper.column_attrs
        }

    def _normalizar_dados(self, data: dict[str, Any], preencher_numero: bool = False) -> dict[str, Any]:
        """Normaliza chaves recebidas do frontend para o modelo SQLAlchemy."""
        aliases = {
            "percentual_desconto": "porcentagem_desconto",
            "data_validade": "validade",
            "observacoes": "observacao",
            "numero": "numero_proposta",
            "numeroProposta": "numero_proposta",
            "cliente": "cliente_id",
            "clienteId": "cliente_id",
            "entidade_juridica": "entidade_juridica_id",
            "entidadeJuridicaId": "entidade_juridica_id",
            "usuario": "usuario_id",
            "usuarioId": "usuario_id",
            "funcionario_responsavel_id": "usuario_id",
            "responsavel": "usuario_id",
            "responsavel_id": "usuario_id",
            "responsavelId": "usuario_id",
            "tipo_atividade": "tipo_atividade_id",
            "tipoAtividadeId": "tipo_atividade_id",
            "regime_tributario": "regime_tributario_id",
            "regimeTributarioId": "regime_tributario_id",
            "faixa_faturamento": "faixa_faturamento_id",
            "faixaFaturamentoId": "faixa_faturamento_id",
        }

        normalizado: dict[str, Any] = {}
        for chave, valor in data.items():
            chave_modelo = aliases.get(chave, chave)

            if chave_modelo == "itens":
                normalizado[chave_modelo] = self._converter_itens(valor)
                continue

            if chave_modelo not in self._proposta_columns:
                # Ignora atributos não mapeados diretamente na tabela de propostas
                continue

            normalizado[chave_modelo] = self._tratar_valor(chave_modelo, valor)

        if preencher_numero and not normalizado.get("numero_proposta"):
            normalizado["numero_proposta"] = self._gerar_numero_proposta()
        return normalizado

    @staticmethod
    def _tratar_valor(chave: str, valor: Any) -> Any:
        """Ajusta valores conforme o tipo esperado pelo modelo."""
        if chave.endswith("_id"):
            return PropostaService._extrair_id(valor)
        
        # Tratar campos de data
        if chave in ["validade", "data_aprovacao", "pdf_gerado_em"] and valor:
            if isinstance(valor, str):
                try:
                    # Tentar converter string ISO para datetime
                    from datetime import datetime
                    return datetime.fromisoformat(valor.replace('Z', '+00:00'))
                except ValueError:
                    # Se falhar, tentar outros formatos comuns
                    try:
                        return datetime.strptime(valor, '%Y-%m-%d')
                    except ValueError:
                        try:
                            return datetime.strptime(valor, '%d/%m/%Y')
                        except ValueError:
                            return None
        
        # Tratar campo porcentagem_desconto (deve ser inteiro)
        if chave == "porcentagem_desconto" and valor is not None:
            try:
                return int(float(valor))  # Converte float para int
            except (ValueError, TypeError):
                return 0
        
        return valor

    @staticmethod
    def _extrair_id(valor: Any) -> Any:
        """Obtém o ID de objetos enviados como dicionário."""
        if isinstance(valor, dict):
            return valor.get("id")
        return valor

    def _converter_itens(self, itens_payload: Any) -> list[ItemProposta]:
        """Transforma itens enviados pelo frontend em instâncias de ItemProposta."""
        itens: list[ItemProposta] = []

        if not itens_payload:
            return itens

        if isinstance(itens_payload, list):
            for item in itens_payload:
                if isinstance(item, ItemProposta):
                    itens.append(item)
                    continue

                if not isinstance(item, dict):
                    continue

                item_dados: dict[str, Any] = {}

                servico_id = item.get("servico_id")
                if not servico_id and isinstance(item.get("servico"), dict):
                    servico_id = item["servico"].get("id")

                item_dados["servico_id"] = servico_id
                item_dados["quantidade"] = item.get("quantidade", 1)
                item_dados["valor_unitario"] = item.get("valor_unitario", 0.0)

                if "valor_total" in item and item["valor_total"] is not None:
                    item_dados["valor_total"] = item["valor_total"]
                else:
                    quantidade = item_dados["quantidade"] or 0
                    valor_unitario = item_dados["valor_unitario"] or 0.0
                    item_dados["valor_total"] = quantidade * valor_unitario

                if item.get("id"):
                    item_dados["id"] = item["id"]

                itens.append(ItemProposta(**item_dados))

        return itens
    
    def get_all(self):
        return self.repo.get_all()
    
    def get_by_id(self, proposta_id: int):
        return self.repo.get_by_id(proposta_id)
    
    def get_by_cliente(self, cliente_id: int):
        return self.repo.get_by_cliente(cliente_id)

    def criar_proposta(self, **data):
        proposta = Proposta(**self._normalizar_dados(data, preencher_numero=True))
        criada = self.repo.create(proposta)
        try:
            usuario_id = data.get('usuario_id') or getattr(criada, 'usuario_id', None)
            usuario_nome = data.get('usuario_nome')
            # se não vier nome no payload, tentar buscar via usuario_id
            if not usuario_nome and usuario_id:
                try:
                    u = Usuario.query.filter_by(id=usuario_id).first()
                    if u:
                        usuario_nome = u.nome
                except Exception:
                    usuario_nome = None

            # Grava log de criação com snapshot inicial (inclui nome do usuário quando possível)
            # Usar acao semântica já padronizada
            self.audit.create_log(criada.id, 'PROPOSTA_CRIADA', detalhes=criada.to_json(), usuario_id=usuario_id, usuario_nome=usuario_nome)
        except Exception:
            # Não falhar a criação por problemas na auditoria, mas registrar
            # para que a falha não passe despercebida.
            logger.exception("Erro ao preparar/gravar log de auditoria para criação da proposta %s", criada.id)
        return criada
    
    def atualizar_proposta(self, proposta_id: int, **data):
        proposta = self.repo.get_by_id(proposta_id)

        if not proposta:
            raise ValueError("Proposta não encontrada")
        
        dados_normalizados = self._normalizar_dados(data)
        # Preparar rastreamento de alterações
        changes = []
        # snapshot de itens antes da alteração
        try:
            before_items = [it.to_json() for it in proposta.itens]
        except Exception:
            before_items = None

        for key, value in dados_normalizados.items():
            old_value = getattr(proposta, key, None)

            # tratamento especial para itens (lista de ItemProposta)
            if key == 'itens':
                new_items = []
                try:
                    # valor vindo do payload já é convertido para instâncias ItemProposta
                    if isinstance(value, list):
                        for it in value:
                            if hasattr(it, 'to_json'):
                                new_items.append(it.to_json())
                            else:
                                new_items.append(str(it))
                except Exception:
                    new_items = str(value)

                changes.append({'campo': 'itens', 'before': before_items, 'after': new_items})
                setattr(proposta, key, value)
                continue

            setattr(proposta, key, value)
            if old_value != value:
                # registrar alteração simples
                changes.append({'campo': key, 'before': old_value, 'after': value})

        atualizado = self.repo.update(proposta)

        try:
            if changes:
                usuario_id = data.get('usuario_id') or getattr(atualizado, 'usuario_id', None)
                usuario_nome = data.get('usuario_nome')
                if not usuario_nome and usuario_id:
                    try:
                        u = Usuario.query.filter_by(id=usuario_id).first()
                        if u:
                            usuario_nome = u.nome
                    except Exception:
                        usuario_nome = None

                # Gravar log de atualização com acao semântica
                self.audit.create_log(atualizado.id, 'PROPOSTA_EDITADA', detalhes=changes, usuario_id=usuario_id, usuario_nome=usuario_nome)
        except Exception:
            logger.exception("Erro ao preparar/gravar log de auditoria para atualização da proposta %s", atualizado.id)

        return atualizado
    
    def deletar_proposta(self, proposta_id: int):
        proposta = self.repo.get_by_id(proposta_id)
        
        if not proposta:
            raise ValueError("Proposta não encontrada")
        # Gravar snapshot antes de deletar
        try:
            usuario_id = getattr(proposta, 'usuario_id', None)
            usuario_nome = None
            try:
                if usuario_id:
                    u = Usuario.query.filter_by(id=usuario_id).first()
                    if u:
                        usuario_nome = u.nome
            except Exception:
                usuario_nome = None

            # Gravar log de deleção com acao semântica
            self.audit.create_log(proposta.id, 'PROPOSTA_DELETADA', detalhes=proposta.to_json(), usuario_id=usuario_id, usuario_nome=usuario_nome)
        except Exception:
            logger.exception("Erro ao preparar/gravar log de auditoria para deleção da proposta %s", proposta.id)

        return self.repo.delete(proposta)

    def get_logs(self, proposta_id: int):
        """Retorna logs de auditoria para uma proposta"""
        return self.audit.get_logs(proposta_id)

    def _gerar_numero_proposta(self) -> str:
        """Gera identificador no formato PROP<ano><mes><dia><hora><minuto><segundo> no fuso de Brasília."""
        # usar timezone fixa de Brasília (UTC-3)
        base = datetime.now(timezone(timedelta(hours=-3))).strftime("PROP%Y%m%d%H%M%S")

        if not Proposta.query.filter_by(numero_proposta=base).first():
            return base

        sequencial = 1
        while True:
            candidato = f"{base}{sequencial:02d}"
            if not Proposta.query.filter_by(numero_proposta=candidato).first():
                return candidato
            sequencial += 1
