from config import db
from .base import TimestampMixin, ActiveMixin

class Notificacao(db.Model, TimestampMixin, ActiveMixin):
    __tablename__ = 'notificacoes'

    id = db.Column(db.Integer, primary_key=True)
    usuario_id = db.Column(db.Integer, db.ForeignKey('funcionarios.id', ondelete='SET NULL'), nullable=True, index=True)
    ordem_servico_id = db.Column(db.Integer, db.ForeignKey('ordens_servicos.id', ondelete='SET NULL'), nullable=True, index=True)
    tipo = db.Column(db.String(50), nullable=False)
    titulo = db.Column(db.String(255), nullable=False)
    mensagem = db.Column(db.Text, nullable=False)
    lida = db.Column(db.Boolean, default=False)

    def to_json(self):
        return {
            'id': self.id,
            'usuario_id': self.usuario_id,
            'ordem_servico_id': self.ordem_servico_id,
            'tipo': self.tipo,
            'titulo': self.titulo,
            'mensagem': self.mensagem,
            'lida': self.lida,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'updated_at': self.updated_at.isoformat() if self.updated_at else None,
        }

    def marcar_lida(self):
        self.lida = True
