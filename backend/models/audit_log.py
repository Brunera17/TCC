from datetime import datetime, timezone, timedelta
from config import db
from .base import TimestampMixin


class AuditLog(db.Model, TimestampMixin):
    __tablename__ = 'proposta_logs'

    id = db.Column(db.Integer, primary_key=True)
    # Sem ondelete: uma proposta nunca é excluída de verdade (delete() só
    # desativa), e um log de auditoria não deve poder ficar órfão de silêncio
    # — se um dia alguém tentar excluir de fato uma proposta com histórico,
    # a constraint deve barrar em vez de apagar o rastro de auditoria junto.
    proposta_id = db.Column(db.Integer, db.ForeignKey('propostas.id'), nullable=False, index=True)
    usuario_id = db.Column(db.Integer, db.ForeignKey('funcionarios.id', ondelete='SET NULL'), nullable=True, index=True)
    usuario_nome = db.Column(db.String(150), nullable=True)
    acao = db.Column(db.String(100), nullable=False)  # ex: 'create', 'update', 'delete', 'status_change'
    detalhes = db.Column(db.Text, nullable=True)  # JSON/string com detalhes da mudança

    def to_json(self):
        created = self.created_at
        # Usa helper para normalizar datetimes ingênuos assumindo UTC e serializar em UTC (Z)
        from .base import format_datetime_to_utc_iso
        created_iso = format_datetime_to_utc_iso(created)

        return {
            'id': self.id,
            'proposta_id': self.proposta_id,
            'usuario_id': self.usuario_id,
            'usuario_nome': self.usuario_nome,
            'acao': self.acao,
            'detalhes': self.detalhes,
            'created_at': created_iso,
        }

    def __repr__(self):
        return f"<AuditLog {self.id} proposta={self.proposta_id} acao={self.acao}>"
