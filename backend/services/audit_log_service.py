import json
from typing import Any
from models.audit_log import AuditLog
from repositories.audit_log_repository import AuditLogRepository


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
        except Exception as e:
            # Não propagar erro de auditoria para a aplicação principal.
            # Registrar no stdout para investigação e retornar None.
            print(f"Erro ao gravar AuditLog: {e}")
            try:
                from config import db as _db
                _db.session.rollback()
            except Exception:
                pass
            return None

    def get_logs(self, proposta_id: int):
        return self.repo.get_by_proposta(proposta_id)
