import json
import logging
from typing import Any
from models.audit_log import AuditLog
from repositories.audit_log_repository import AuditLogRepository

logger = logging.getLogger(__name__)


class AuditLogService:
    def __init__(self):
        self.repo = AuditLogRepository()

    def create_log(self, proposta_id: int, acao: str, detalhes: Any = None, usuario_id: int | None = None, usuario_nome: str | None = None):
        """Cria um registro de log. `detalhes` será convertido para string JSON quando possível. Guarda também o nome do usuário quando fornecido."""
        detalhes_serializado = None
        try:
            if detalhes is None:
                detalhes_serializado = None
            elif isinstance(detalhes, str):
                detalhes_serializado = detalhes
            else:
                detalhes_serializado = json.dumps(detalhes, default=str, ensure_ascii=False)
        except Exception:
            detalhes_serializado = str(detalhes)

        log = AuditLog(
            proposta_id=proposta_id,
            usuario_id=usuario_id,
            usuario_nome=usuario_nome,
            acao=acao,
            detalhes=detalhes_serializado,
        )

        try:
            return self.repo.create(log)
        except Exception:
            # Não propagar erro de auditoria para a aplicação principal (a
            # operação de negócio não deve falhar por causa da trilha de
            # auditoria), mas registrar em nível ERROR para que a falha seja
            # visível em monitoramento/log agregation, em vez de sumir.
            logger.exception(
                "Erro ao gravar AuditLog (proposta_id=%s, acao=%s)",
                proposta_id, acao,
            )
            try:
                from config import db as _db
                _db.session.rollback()
            except Exception:
                logger.exception("Erro ao reverter sessão após falha de AuditLog")
            return None

    def get_logs(self, proposta_id: int):
        return self.repo.get_by_proposta(proposta_id)
