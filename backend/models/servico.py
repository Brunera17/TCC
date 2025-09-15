from  datetime import datetime
from config import db
from sqlalchemy.orm import validates
from .base import TimestampMixin, ActiveMixin
import re


class Servico(db.Model, TimestampMixin, ActiveMixin):
    """ Modelo de Serviço """
    __tablename__ = 'servicos'

    id = db.Column(db.Integer, primary_key=True)
    codigo = db.Column(db.String(20), nullable=False, unique=True, index=True)
    nome = db.Column(db.String(100), nullable=False, unique=True, index=True)
    descricao = db.Column(db.String(255), nullable=True)
    valor_unitario = db.Column(db.Float, nullable=False)
    regras_cobranca = db.Column(db.String(255), nullable=True)
    status = db.Column(db.String(50), default='ativo')
    
    # Foreign Keys
    categoria_id = db.Column(db.Integer, db.ForeignKey('categorias_servicos.id', ondelete='SET NULL'), nullable=True)
    #Relationships
    item_ordem_servicos = db.relationship('ItemOrdemServico', back_populates='servico', lazy='joined')
    item_propostas = db.relationship('ItemProposta', back_populates='servico', lazy='joined')
    categoria = db.relationship('CategoriaServico', back_populates='servicos', lazy='joined')

    # Validadores
    @validates('codigo')
    def validando_nome(self, key, codigo):
        if not codigo:
            raise ValueError("O código não pode ser vazio")
        return codigo

    def to_json(self):
        return{
            'id': self.id,
            'codigo': self.codigo,
            'nome': self.nome,
            'descricao': self.descricao,
            'valor_unitario': self.valor_unitario,
            'regras_cobranca': self.regras_cobranca,
            'categoria_id': self.categoria_id,
            'ativo': self.ativo,
            'created_at': self.created_at.isoformat(),
            'updated_at': self.updated_at.isoformat(),
        }
    def __repr__(self):
        return f"<Servico {self.nome}>"
        
class CategoriaServico(db.Model, TimestampMixin, ActiveMixin):
    """ Modelo para representar categorias de serviços """
    __tablename__ = 'categorias_servicos'

    id = db.Column(db.Integer, primary_key=True)
    nome = db.Column(db.String(100), nullable=False, unique=True, index=True)
    descricao = db.Column(db.String(255), nullable=True)
    
    #Relationships
    servicos = db.relationship('Servico', back_populates='categoria', lazy='joined')
    
    # Validadores
    @validates('nome')
    def validando_nome(self, key, nome):
        if not nome:
            raise ValueError("Nome não pode ser vazio")
        if len(nome) < 3 or len(nome) > 100:
            raise ValueError("Nome deve ter entre 3 e 100 caracteres")
        return nome

    # transformação para JSON
    def to_json(self):
        return{
            'id': self.id,
            'nome': self.nome,
            'descricao': self.descricao,
            'created_at': self.created_at.isoformat(),
            'updated_at': self.updated_at.isoformat(),
            'ativo': self.ativo
        }
    def __repr__(self):
        return f"<CategoriaServico {self.nome}>"
