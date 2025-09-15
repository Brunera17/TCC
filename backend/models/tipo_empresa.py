from config import db
from .base import TimestampMixin, ActiveMixin

class TipoEmpresa(db.Model, TimestampMixin, ActiveMixin):
    """ Modelo de Tipo de Empresa """
    __tablename__ = 'tipos_empresas'

    id = db.Column(db.Integer, primary_key=True)
    nome = db.Column(db.String(50), nullable=False, index=True)
    descricao = db.Column(db.String(255))
    
    # Relacionamentos
    entidades_juridicas = db.relationship('EntidadeJuridica', back_populates='tipo', lazy='dynamic')

    def to_json(self):
        return {
            'id': self.id,
            'nome': self.nome,
            'descricao': self.descricao,
            'created_at': self.created_at.isoformat(),
            'updated_at': self.updated_at.isoformat(),
            'deleted_at': self.deleted_at.isoformat() if self.deleted_at else None,
            'ativo': self.ativo
        }

    def __repr__(self):
        return f"<TipoEmpresa {self.nome}>"