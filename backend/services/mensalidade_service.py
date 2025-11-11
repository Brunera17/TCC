from typing import Any, Dict, List, Optional

from models.entidadeJuridica import RegimeTributario
from repositories.faixa_faturamento_repository import FaixaFaturamentoRepository


class MensalidadeService:
    """Serviço responsável por sugerir valores de mensalidade."""

    def __init__(self):
        self.faixa_repo = FaixaFaturamentoRepository()

    def buscar_mensalidade(self, payload: Dict[str, Any]) -> Dict[str, Any]:
        if not isinstance(payload, dict):
            raise ValueError("Informe os dados da mensalidade em formato JSON")

        regime_id = self._extrair_int(payload, ["regime_tributario_id", "regimeTributarioId"])
        if regime_id is None:
            raise ValueError("regime_tributario_id é obrigatório")

        if not self._regime_existe(regime_id):
            raise ValueError("Regime tributário informado não encontrado")

        faixa_id = self._extrair_int(payload, ["faixa_faturamento_id", "faixaFaturamentoId"])
        faturamento_anual = self._extrair_float(payload, ["faturamento_anual", "faturamentoAnual"])
        numero_funcionarios = self._extrair_int(payload, ["numero_funcionarios", "numeroFuncionarios", "colaboradores"], default=0)

        faixas_disponiveis: List = self.faixa_repo.get_ativos_por_regime(regime_id)
        if not faixas_disponiveis:
            # fallback para faixas genéricas (sem regime associado)
            faixas_disponiveis = self.faixa_repo.get_sem_regime()

        faixa = None
        if faixa_id is not None:
            faixa = self.faixa_repo.get_by_id(faixa_id)
            if not faixa or not faixa.ativo:
                raise ValueError("Faixa de faturamento informada não encontrada")
            if faixa.regime_tributario_id and faixa.regime_tributario_id != regime_id:
                raise ValueError("Faixa de faturamento informada não pertence ao regime tributário solicitado")
        else:
            faixa = self._selecionar_faixa(faixas_disponiveis, faturamento_anual)

        if faixa is None:
            raise ValueError("Nenhuma faixa de faturamento cadastrada para o regime informado")

        faturamento_referencia = self._determinar_faturamento(faturamento_anual, faixa)
        valor_sugerido = self._calcular_mensalidade(faturamento_referencia, numero_funcionarios)
        if valor_sugerido is None:
            raise ValueError("Não foi possível calcular a mensalidade sugerida. Informe o faturamento anual ou selecione uma faixa válida.")

        resposta = {
            "mensalidade_sugerida": valor_sugerido,
            "mensalidadeSugerida": valor_sugerido,
            "faturamento_referencia": faturamento_referencia,
            "regime_tributario_id": regime_id,
            "faixa_faturamento_id": faixa.id if faixa else None,
            "numero_funcionarios": numero_funcionarios,
            "observacoes": "Cálculo automático baseado na faixa de faturamento e quantidade de colaboradores.",
        }

        if faixa is not None:
            resposta["faixa"] = faixa.to_json()

        return resposta

    @staticmethod
    def _selecionar_faixa(faixas: List, faturamento_anual: Optional[float]):
        if not faixas:
            return None

        if faturamento_anual and faturamento_anual > 0:
            for faixa in faixas:
                minimo = faixa.valor_minimo or 0.0
                maximo = faixa.valor_maximo
                if faturamento_anual >= minimo and (maximo is None or faturamento_anual <= maximo):
                    return faixa

        return faixas[0]

    @staticmethod
    def _extrair_int(payload: Dict[str, Any], chaves, default: Optional[int] = None) -> Optional[int]:
        for chave in chaves:
            if chave in payload and payload[chave] is not None:
                try:
                    return int(payload[chave])
                except (TypeError, ValueError):
                    raise ValueError(f"Valor inválido para '{chave}'")
        return default

    @staticmethod
    def _extrair_float(payload: Dict[str, Any], chaves, default: Optional[float] = None) -> Optional[float]:
        for chave in chaves:
            if chave in payload and payload[chave] is not None:
                try:
                    return float(payload[chave])
                except (TypeError, ValueError):
                    raise ValueError(f"Valor inválido para '{chave}'")
        return default

    @staticmethod
    def _regime_existe(regime_id: int) -> bool:
        return RegimeTributario.query.filter_by(id=regime_id, ativo=True).first() is not None

    @staticmethod
    def _determinar_faturamento(faturamento_anual: Optional[float], faixa) -> Optional[float]:
        if faturamento_anual is not None and faturamento_anual > 0:
            return faturamento_anual
        if faixa is None:
            return None

        minimo = faixa.valor_minimo or 0.0
        maximo = faixa.valor_maximo
        if maximo is not None:
            return (minimo + maximo) / 2.0 if minimo else maximo
        # Faixa aberta: assume crescimento de 25%% sobre o mínimo informado
        return minimo * 1.25 if minimo else None

    @staticmethod
    def _calcular_mensalidade(faturamento_anual: Optional[float], numero_funcionarios: Optional[int]) -> Optional[float]:
        if not faturamento_anual:
            return None

        percentual_base = 0.015  # 1,5% do faturamento anual
        base_anual = faturamento_anual * percentual_base
        mensalidade = base_anual / 12.0

        if numero_funcionarios and numero_funcionarios > 0:
            excedente = max(0, numero_funcionarios - 10)
            mensalidade += excedente * 35.0

        return round(max(mensalidade, 350.0), 2)
