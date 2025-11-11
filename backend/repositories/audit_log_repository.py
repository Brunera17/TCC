from config import db
from models.audit_log import AuditLog


class AuditLogRepository:
    """Repositório para gerenciar logs de proposta"""
    def create(self, log: AuditLog):
        try:
            db.session.add(log)
            db.session.commit()
            return log
        except Exception as e:
            # Fazer rollback para liberar a sessão para novas transações
            try:
                db.session.rollback()
            except Exception:
                pass
            # Propagar o erro para o chamador (serviço pode optar por tratar)
            raise

    def get_by_proposta(self, proposta_id: int):
        return AuditLog.query.filter_by(proposta_id=proposta_id).order_by(AuditLog.created_at.desc()).all()
