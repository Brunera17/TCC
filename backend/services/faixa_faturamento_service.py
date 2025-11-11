from typing import Optional

from models.entidadeJuridica import FaixaFaturamento, RegimeTributario
from repositories.faixa_faturamento_repository import FaixaFaturamentoRepository


class FaixaFaturamentoService:
    """Serviço para regras de faixas de faturamento."""

    def __init__(self):
        self.repo = FaixaFaturamentoRepository()

    def listar(self, regime_tributario_id: Optional[int] = None, ativo_only: bool = True):
        faixas = self.repo.get_all(regime_tributario_id=regime_tributario_id, ativo_only=ativo_only)
        if regime_tributario_id is not None and not faixas:
            faixas = self.repo.get_sem_regime(ativo_only=ativo_only)
        return faixas

    def obter(self, faixa_id: int) -> FaixaFaturamento:
        faixa = self.repo.get_by_id(faixa_id)
        if not faixa or (not faixa.ativo):
            raise ValueError("Faixa de faturamento não encontrada")
        return faixa

    def criar(self, **dados) -> FaixaFaturamento:
        descricao = (dados.get("descricao") or "").strip()
        if len(descricao) < 3:
            raise ValueError("Descrição deve possuir ao menos 3 caracteres")

        existente = self.repo.get_by_descricao(descricao)
        if existente and existente.ativo:
            raise ValueError("Já existe uma faixa de faturamento com esta descrição")

        regime_id = dados.get("regime_tributario_id")
        if regime_id is not None and not self._regime_existe(regime_id):
            raise ValueError("Regime tributário informado não encontrado")

        valor_minimo = dados.get("valor_minimo")
        valor_maximo = dados.get("valor_maximo")
        if valor_minimo is not None and valor_maximo is not None and valor_maximo < valor_minimo:
            raise ValueError("Valor máximo não pode ser menor que o valor mínimo")

        if existente and not existente.ativo:
            # reativar registro existente
            existente.descricao = descricao
            existente.valor_minimo = valor_minimo
            existente.valor_maximo = valor_maximo
            existente.regime_tributario_id = regime_id
            existente.ativar()
            return existente

        faixa = FaixaFaturamento(
            descricao=descricao,
            valor_minimo=valor_minimo,
            valor_maximo=valor_maximo,
            regime_tributario_id=regime_id,
        )
        return self.repo.create(faixa)

    def atualizar(self, faixa_id: int, **dados) -> FaixaFaturamento:
        faixa = self.repo.get_by_id(faixa_id)
        if not faixa or (not faixa.ativo):
            raise ValueError("Faixa de faturamento não encontrada")

        if "descricao" in dados:
            nova_descricao = (dados["descricao"] or "").strip()
            if len(nova_descricao) < 3:
                raise ValueError("Descrição deve possuir ao menos 3 caracteres")
            duplicado = self.repo.get_by_descricao(nova_descricao)
            if duplicado and duplicado.id != faixa_id and duplicado.ativo:
                raise ValueError("Já existe outra faixa com esta descrição")
            faixa.descricao = nova_descricao

        if "valor_minimo" in dados:
            faixa.valor_minimo = dados["valor_minimo"]
        if "valor_maximo" in dados:
            faixa.valor_maximo = dados["valor_maximo"]
        if (
            faixa.valor_minimo is not None
            and faixa.valor_maximo is not None
            and faixa.valor_maximo < faixa.valor_minimo
        ):
            raise ValueError("Valor máximo não pode ser menor que o valor mínimo")

        if "regime_tributario_id" in dados:
            regime_id = dados["regime_tributario_id"]
            if regime_id is not None and not self._regime_existe(regime_id):
                raise ValueError("Regime tributário informado não encontrado")
            faixa.regime_tributario_id = regime_id

        return self.repo.update(faixa)

    def deletar(self, faixa_id: int) -> FaixaFaturamento:
        faixa = self.repo.get_by_id(faixa_id)
        if not faixa or (not faixa.ativo):
            raise ValueError("Faixa de faturamento não encontrada")
        return self.repo.delete(faixa)

    @staticmethod
    def _regime_existe(regime_id: int) -> bool:
        return RegimeTributario.query.filter_by(id=regime_id, ativo=True).first() is not None
