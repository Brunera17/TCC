""" Modelo para tipos de atividade empresarial """

from config import db
from sqlalchemy.orm import validates
from models.base import TimestampMixin, ActiveMixin


class TipoAtividade(db.Model, TimestampMixin, ActiveMixin):
    """ Modelo para representar tipos de atividade empresarial """
    __tablename__ = 'tipos_atividade'

    id = db.Column(db.Integer, primary_key=True)
    nome = db.Column(db.String(100), nullable=False, unique=True, index=True)
    descricao = db.Column(db.String(255), nullable=True)
    codigo = db.Column(db.String(20), nullable=True, unique=True)  # CNAE ou código interno
    
    # Validadores
    @validates('nome')
    def validar_nome(self, key, nome):
        if not nome:
            raise ValueError("Nome não pode ser vazio")
        if len(nome) < 3 or len(nome) > 100:
            raise ValueError("Nome deve ter entre 3 e 100 caracteres")
        return nome

    @validates('codigo')
    def validar_codigo(self, key, codigo):
        if codigo is not None and len(codigo.strip()) == 0:
            raise ValueError("Código não pode ser uma string vazia")
        return codigo
    
    def to_json(self):
        return {
            'id': self.id,
            'nome': self.nome,
            'descricao': self.descricao,
            'codigo': self.codigo,
            'created_at': self.created_at.isoformat(),
            'updated_at': self.updated_at.isoformat(),
            'ativo': self.ativo
        }

    def __repr__(self):
        return f"<TipoAtividade {self.nome}>"