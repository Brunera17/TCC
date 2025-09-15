from  datetime import datetime
from config import db
from sqlalchemy.orm import validates
from .base import TimestampMixin, ActiveMixin
import re

class ItemProposta(db.Model, TimestampMixin, ActiveMixin):
    """ Modelo de Item da Proposta """
    __tablename__ = 'itens_propostas'

    id = db.Column(db.Integer, primary_key=True)
    quantidade = db.Column(db.Integer, nullable=False, default=1)
    valor_unitario = db.Column(db.Float, nullable=False)
    valor_total = db.Column(db.Float, nullable=False)
    desconto = db.Column(db.Integer, nullable=True, default=0)

    # Foreign Keys
    proposta_id = db.Column(db.Integer, db.ForeignKey('propostas.id', ondelete='CASCADE'), nullable=False, index=True)
    servico_id = db.Column(db.Integer, db.ForeignKey('servicos.id', ondelete='SET NULL'), nullable=True, index=True)

    # Relationships
    proposta = db.relationship('Proposta', back_populates='itens', lazy='joined')
    servico = db.relationship('Servico', back_populates='item_propostas', lazy='joined')

    # Validadores
    @validates('quantidade')
    def validando_quantidade(self, key, quantidade):
        if quantidade < 1:
            raise ValueError("A quantidade deve ser pelo menos 1")
        return quantidade

    @validates('valor_unitario')
    def validando_valor_unitario(self, key, valor_unitario):
        if valor_unitario < 0:
            raise ValueError("O valor unitário não pode ser negativo")
        return valor_unitario

    @validates('valor_total')
    def validando_valor_total(self, key, valor_total):
        if valor_total < 0:
            raise ValueError("O valor total não pode ser negativo")
        return valor_total
    
    @validates('desconto')
    def validando_desconto(self, key, desconto):
        if desconto < 0:
            raise ValueError("O desconto não pode ser negativo")
        elif desconto > 100:
            raise ValueError("O desconto não pode ser maior que 100%")
        return desconto

    def to_json(self):
        return{
            'id': self.id,
            'proposta_id': self.proposta_id,
            'servico_id': self.servico_id,
            'quantidade': self.quantidade,
            'valor_unitario': self.valor_unitario,
            'valor_total': self.valor_total,
            'desconto': self.desconto,
            'ativo': self.ativo,
            'created_at': self.created_at.isoformat(),
            'updated_at': self.updated_at.isoformat(),
        }
    def __repr__(self):
        return f"<ItemProposta {self.id}>"
    
class Proposta(db.Model, TimestampMixin, ActiveMixin):
    ''' Modelo de Proposta '''
    __tablename__ = 'propostas'
    
    id = db.Column(db.Integer, primary_key=True)
    numero_proposta = db.Column(db.String(20), nullable=False, unique=True, index=True)
    validade = db.Column(db.DateTime, nullable=True)
    observacao = db.Column(db.String(255), nullable=True)
    status = db.Column(db.String(50), default='rascunho')
    
    # Foreign Keys
    cliente_id = db.Column(db.Integer, db.ForeignKey('clientes.id', ondelete='SET NULL'), nullable=True, index=True)
    empresa_id = db.Column(db.Integer, db.ForeignKey('entidades_juridicas.id', ondelete='SET NULL'), nullable=True, index=True)
    usuario_id = db.Column(db.Integer, db.ForeignKey('funcionarios.id', ondelete='SET NULL'), nullable=True, index=True)
    
    # Relationships
    cliente = db.relationship('Cliente', back_populates='propostas', lazy='joined')
    empresa = db.relationship('EntidadeJuridica', back_populates='propostas', lazy='joined')
    usuario = db.relationship('Usuario', back_populates='propostas', lazy='joined')
    itens = db.relationship('ItemProposta', back_populates='proposta', lazy='joined', cascade="all, delete-orphan")
    
    # Validadores
    @validates('numero_proposta')
    def validando_numero_proposta(self, key, numero_proposta):
        if not numero_proposta:
            raise ValueError("O número da proposta não pode ser vazio")
        return numero_proposta
    @validates('status')
    def validando_status(self, key, status):
        status_permitidos = ['rascunho', 'enviada', 'aceita', 'rejeitada', 'expirada']
        if status not in status_permitidos:
            raise ValueError(f"O status deve ser um dos seguintes: {', '.join(status_permitidos)}")
        return status
    def to_json(self):
        return{
            'id': self.id,
            'numero_proposta': self.numero_proposta,
            'validade': self.validade.isoformat() if self.validade else None,
            'observacao': self.observacao,
            'status': self.status,
            'cliente_id': self.cliente_id.to_json() if self.cliente else None,
            'empresa_id': self.empresa_id.to_json() if self.empresa else None,
            'usuario_id': self.usuario_id.to_json() if self.usuario else None,
            'itens': [item.to_json() for item in self.itens],
            'ativo': self.ativo,
            'created_at': self.created_at.isoformat(),
            'deleted_at': self.deleted_at.isoformat() if self.deleted_at else None,
            'updated_at': self.updated_at.isoformat(),
        }
    def __repr__(self):
        return f"<Proposta {self.numero_proposta}>"
    