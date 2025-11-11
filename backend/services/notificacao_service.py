"""Serviços relacionados a notificações."""

from __future__ import annotations

from datetime import datetime, timedelta
from typing import Iterable, List, Optional
from sqlalchemy.orm import joinedload
from config import db
from models.ordemServico import OrdemServico


class NotificacaoService:
    """Service responsável por montar notificações calculadas em tempo real."""

    STATUS_PADRAO_ABERTAS = {'aberta', 'em_andamento', 'pausada'}

    def get_notificacoes_vencimento(
        self,
        dias_limite: int = 7,
        status: Optional[Iterable[str]] = None,
        incluir_atrasadas: bool = True,
    ) -> List[dict]:
        """Retorna notificações de ordens de serviço com vencimento próximo."""

        agora = datetime.utcnow()
        limite_superior = agora + timedelta(days=max(dias_limite, 0))

        status_filtrados = self._normalizar_status(status)

        query = OrdemServico.query.filter(OrdemServico.ativo.is_(True))

        if status_filtrados:
            query = query.filter(OrdemServico.status.in_(status_filtrados))

        if incluir_atrasadas:
            query = query.filter(OrdemServico.vencimento.isnot(None), OrdemServico.vencimento <= limite_superior)
        else:
            query = query.filter(
                OrdemServico.vencimento.isnot(None),
                OrdemServico.vencimento >= agora,
                OrdemServico.vencimento <= limite_superior,
            )

        # Otimização: Carrega o cliente junto para evitar N+1 queries no .to_json()
        ordens = (
            query.options(joinedload(OrdemServico.cliente))
            .order_by(OrdemServico.vencimento.asc())
            .all()
        )

        notificacoes = []
        for ordem in ordens:
            notificacoes.append(self._montar_notificacao_vencimento(ordem, agora))

        return notificacoes

    @staticmethod
    def _normalizar_status(status: Optional[Iterable[str]]) -> List[str]:
        if not status:
            return list(NotificacaoService.STATUS_PADRAO_ABERTAS)

        normalizados = []
        for item in status:
            if not item:
                continue
            valor = item.strip()
            if valor:
                normalizados.append(valor)
        return normalizados

    @staticmethod
    def _montar_notificacao_vencimento(ordem: OrdemServico, referencia: datetime) -> dict:
        vencimento = ordem.vencimento
        dias_restantes = 0
        
        # O frontend espera: 'vencida', 'critica', 'vencendo'
        # O frontend define 'critica' como <= 2 dias (NotificacoesVencimento.tsx)
        tipo_frontend = 'vencendo' # Padrão

        if vencimento:
            delta = vencimento.date() - referencia.date()
            dias_restantes = delta.days

            if dias_restantes < 0:
                tipo_frontend = 'vencida'
            elif dias_restantes <= 2: # Vence hoje (0), amanhã (1) ou depois (2)
                tipo_frontend = 'critica'
            else:
                # 'vencendo' cobre os dias 3 até o limite (ex: 7)
                tipo_frontend = 'vencendo'
        
        # Gera a mensagem usando a lógica que já existia
        mensagem = NotificacaoService._mensagem_vencimento(ordem, dias_restantes)
        
        # Usa o método .to_json() do modelo OrdemServico
        # (definido em ordemServico.py)
        ordem_json = ordem.to_json()

        # Retorna a estrutura exata que o frontend espera
        return {
            'id': ordem.id,
            'ordem_servico': ordem_json, # <-- Objeto aninhado
            'tipo': tipo_frontend, # <-- Tipos corretos
            'dias_restantes': dias_restantes,
            'lida': False, # O backend não gerencia o estado 'lida'
            'created_at': datetime.utcnow().isoformat(),
            'mensagem': mensagem # Mensagem personalizada
        }

    @staticmethod
    def _titulo_vencimento(protocolo: str, dias_restantes: Optional[int]) -> str:
        # Esta função não é mais usada diretamente na resposta JSON,
        # mas a _mensagem_vencimento ainda é.
        if dias_restantes is None:
            return f"OS {protocolo} sem data de vencimento"
        if dias_restantes < 0:
            return f"OS {protocolo} vencida"
        if dias_restantes == 0:
            return f"OS {protocolo} vence hoje"
        if dias_restantes == 1:
            return f"OS {protocolo} vence em 1 dia"
        return f"OS {protocolo} vence em {dias_restantes} dias"

    @staticmethod
    def _mensagem_vencimento(ordem: OrdemServico, dias_restantes: Optional[int]) -> str:
        protocolo = ordem.protocolo # Pega o protocolo da ordem
        
        if dias_restantes is None:
            return f"OS {protocolo} está sem data de vencimento."
        if dias_restantes < 0:
            return f"OS {protocolo} venceu há {abs(dias_restantes)} dia(s)."
        if dias_restantes == 0:
            return f"OS {protocolo} vence hoje."
        if dias_restantes == 1:
            return f"OS {protocolo} vence em 1 dia."
        return f"OS {protocolo} vence em {dias_restantes} dia(s)."