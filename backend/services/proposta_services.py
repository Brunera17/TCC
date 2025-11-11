from datetime import datetime
from typing import Any

from sqlalchemy.inspection import inspect

from models.proposta import ItemProposta, Proposta
from repositories.proposta_repository import PropostaRepository

class PropostaService:
    """ Serviço para gerenciar propostas """

    def __init__(self):
        self.repo = PropostaRepository()

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
        return self.repo.create(proposta)
    
    def atualizar_proposta(self, proposta_id: int, **data):
        proposta = self.repo.get_by_id(proposta_id)

        if not proposta:
            raise ValueError("Proposta não encontrada")
        
        dados_normalizados = self._normalizar_dados(data)
        print(f"🔄 Dados normalizados: {dados_normalizados}")
        
        for key, value in dados_normalizados.items():
            old_value = getattr(proposta, key, None)
            setattr(proposta, key, value)
            print(f"📝 {key}: {old_value} -> {value}")
            
        return self.repo.update(proposta)
    
    def deletar_proposta(self, proposta_id: int):
        proposta = self.repo.get_by_id(proposta_id)
        
        if not proposta:
            raise ValueError("Proposta não encontrada")
        return self.repo.delete(proposta)

    def _gerar_numero_proposta(self) -> str:
        """Gera identificador no formato PROP<ano><mes><dia><hora><minuto><segundo> no fuso de Brasília."""
        from zoneinfo import ZoneInfo
        base = datetime.now(ZoneInfo('America/Sao_Paulo')).strftime("PROP%Y%m%d%H%M%S")

        if not Proposta.query.filter_by(numero_proposta=base).first():
            return base

        sequencial = 1
        while True:
            candidato = f"{base}{sequencial:02d}"
            if not Proposta.query.filter_by(numero_proposta=candidato).first():
                return candidato
            sequencial += 1
