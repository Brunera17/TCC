from typing import List, Optional

from config import db
from models.entidadeJuridica import FaixaFaturamento


class FaixaFaturamentoRepository:
    """Repositório para gerenciar faixas de faturamento."""

    def get_all(
        self,
        regime_tributario_id: Optional[int] = None,
        ativo_only: bool = True,
    ) -> List[FaixaFaturamento]:
        query = FaixaFaturamento.query
        if regime_tributario_id is not None:
            query = query.filter_by(regime_tributario_id=regime_tributario_id)
        if ativo_only:
            query = query.filter_by(ativo=True)
        return query.order_by(FaixaFaturamento.valor_minimo.asc(), FaixaFaturamento.id.asc()).all()

    def get_ativos_por_regime(self, regime_tributario_id: int) -> List[FaixaFaturamento]:
        return (
            FaixaFaturamento.query
            .filter_by(regime_tributario_id=regime_tributario_id, ativo=True)
            .order_by(FaixaFaturamento.valor_minimo.asc(), FaixaFaturamento.id.asc())
            .all()
        )

    def get_sem_regime(self, ativo_only: bool = True) -> List[FaixaFaturamento]:
        query = FaixaFaturamento.query.filter(FaixaFaturamento.regime_tributario_id.is_(None))
        if ativo_only:
            query = query.filter(FaixaFaturamento.ativo.is_(True))
        return query.order_by(FaixaFaturamento.valor_minimo.asc(), FaixaFaturamento.id.asc()).all()

    def get_by_id(self, faixa_id: int) -> Optional[FaixaFaturamento]:
        return FaixaFaturamento.query.filter_by(id=faixa_id).first()

    def get_by_descricao(self, descricao: str) -> Optional[FaixaFaturamento]:
        return FaixaFaturamento.query.filter_by(descricao=descricao).first()

    def create(self, faixa: FaixaFaturamento) -> FaixaFaturamento:
        db.session.add(faixa)
        db.session.commit()
        return faixa

    def update(self, faixa: FaixaFaturamento) -> FaixaFaturamento:
        db.session.commit()
        return faixa

    def delete(self, faixa: FaixaFaturamento) -> FaixaFaturamento:
        faixa.desativar()
        db.session.commit()
        return faixa
