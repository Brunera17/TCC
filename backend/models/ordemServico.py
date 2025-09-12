from  datetime import datetime
from config import db
from sqlalchemy.orm import validates
from .base import TimestampMixin, ActiveMixin
import re

class ItemOrdemServico(db.Model, TimestampMixin, ActiveMixin):
    """ Modelo de Item da Ordem de Serviço """
    __tablename__ = 'itens_ordem_servicos'

    id = db.Column(db.Integer, primary_key=True)
    quantidade = db.Column(db.Integer, nullable=False, default=1)
    valor_unitario = db.Column(db.Float, nullable=False)
    valor_total = db.Column(db.Float, nullable=False)
    desconto = db.Column(db.integer, nullable=True, default=0)

    # Foreign Keys
    ordem_servico_id = db.Column(db.Integer, db.ForeignKey('ordens_servicos.id', ondelete='CASCADE'), nullable=False, index=True)
    servico_id = db.Column(db.Integer, db.ForeignKey('servicos.id', ondelete='SET NULL'), nullable=True, index=True)

    # Relationships
    ordem_servico = db.relationship('OrdemServico', back_populates='itens', lazy='joined')
    servico = db.relationship('Servico', back_populates='item_ordem_servicos', lazy='joined')

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
            'ordem_servico_id': self.ordem_servico_id,
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
        return f"<ItemOrdemServico {self.id}>"
    
class OrdemServico(db.Model, TimestampMixin, ActiveMixin):
    """ Modelo de Ordem de Serviço """
    __tablename__ = 'ordens_servicos'

    id = db.Column(db.Integer, primary_key=True)
    protocolo = db.Column(db.String(20), nullable=False, unique=True, index=True)
    vencimento = db.Column(db.DateTime, nullable=True)
    observacao = db.Column(db.String(255), nullable=True)
    status = db.Column(db.String(50), default='aberta')
    data_abertura = db.Column(db.DateTime, default=datetime.utcnow)
    data_fechamento = db.Column(db.DateTime, nullable=True)

    # Foreign Keys
    cliente_id = db.Column(db.Integer, db.ForeignKey('clientes.id', ondelete='SET NULL'), nullable=True, index=True)
    empresa_id = db.Column(db.Integer, db.ForeignKey('entidades_juridicas.id', ondelete='SET NULL'), nullable=True, index=True)
    usuario_id = db.Column(db.Integer, db.ForeignKey('usuarios.id', ondelete='SET NULL'), nullable=True, index=True)
    departamento_id = db.Column(db.Integer, db.ForeignKey('departamentos.id', ondelete='SET NULL'), nullable=True, index=True)
    
    # Relationships
    cliente = db.relationship('Cliente', back_populates='ordens_servico', lazy='joined')
    empresa = db.relationship('EntidadeJuridica', back_populates='ordens_servico', lazy='joined')
    usuario = db.relationship('Usuario', back_populates='ordens_servico', lazy='joined')
    departamento = db.relationship('Departamento', back_populates='ordens_servico', lazy='joined')
    itens = db.relationship('ItemOrdemServico', back_populates='ordem_servico', lazy='joined', cascade="all, delete-orphan")

    # Validadores
    @validates('protocolo')
    def validando_protocolo(self, key, protocolo):
        if not protocolo:
            raise ValueError("O protocolo da ordem não pode ser vazio")
        return protocolo

    def to_json(self):
        return{
            'id': self.id,
            'protocolo': self.protocolo,
            'vencimento': self.vencimento.isoformat() if self.vencimento else None,
            'observacao': self.observacao,
            'status': self.status,
            'data_abertura': self.data_abertura.isoformat(),
            'data_fechamento': self.data_fechamento.isoformat() if self.data_fechamento else None,
            'cliente_id': self.cliente_id.to_json() if self.cliente else None,
            'empresa_id': self.empresa_id.to_json() if self.empresa else None,
            'usuario_id': self.usuario_id.to_json() if self.usuario else None,
            'departamento_id': self.departamento_id.to_json() if self.departamento else None,
            'itens': [item.to_json() for item in self.itens],
            'ativo': self.ativo,
            'created_at': self.created_at.isoformat(),
            'updated_at': self.updated_at.isoformat(),
        }

    def __repr__(self):
        return f"<OrdemServico {self.numero_ordem}>"