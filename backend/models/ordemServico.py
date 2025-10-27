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
    desconto = db.Column(db.Float, nullable=True, default=0.0)  # Mudado para Float para permitir decimais

    # Foreign Keys
    ordem_servico_id = db.Column(db.Integer, db.ForeignKey('ordens_servicos.id', ondelete='CASCADE'), nullable=False, index=True)
    servico_id = db.Column(db.Integer, db.ForeignKey('servicos.id', ondelete='SET NULL'), nullable=True, index=True)

    # Relationships
    ordem_servico = db.relationship('OrdemServico', back_populates='itens')
    servico = db.relationship('Servico', back_populates='item_ordem_servicos')

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

    # Método para calcular valor total automaticamente
    def calcular_valor_total(self):
        """Calcula o valor total considerando quantidade, valor unitário e desconto"""
        subtotal = self.quantidade * self.valor_unitario
        desconto_valor = subtotal * (self.desconto / 100)
        self.valor_total = subtotal - desconto_valor
        return self.valor_total

    def to_json(self):
        return{
            'id': self.id,
            'ordem_servico_id': self.ordem_servico_id,
            'servico_id': self.servico_id,
            'servico': self.servico.to_json() if self.servico else None,  # Adicionado dados do serviço
            'quantidade': self.quantidade,
            'valor_unitario': self.valor_unitario,
            'valor_total': self.valor_total,
            'desconto': self.desconto,
            'ativo': self.ativo,
            'created_at': self.created_at.isoformat(),
            'updated_at': self.updated_at.isoformat(),
        }

    def __repr__(self):
        return f"<ItemOrdemServico {self.id} - Qtd: {self.quantidade}>"
    
class OrdemServico(db.Model, TimestampMixin, ActiveMixin):
    """ Modelo de Ordem de Serviço """
    __tablename__ = 'ordens_servicos'

    id = db.Column(db.Integer, primary_key=True)
    protocolo = db.Column(db.String(20), nullable=False, unique=True, index=True)
    vencimento = db.Column(db.DateTime, nullable=True)
    observacao = db.Column(db.Text, nullable=True)  # Mudado para Text para textos maiores
    status = db.Column(db.String(50), default='aberta')
    data_abertura = db.Column(db.DateTime, default=datetime.utcnow)
    data_fechamento = db.Column(db.DateTime, nullable=True)
    valor_total_os = db.Column(db.Float, nullable=True, default=0.0)  # Valor total da OS

    # Foreign Keys
    cliente_id = db.Column(db.Integer, db.ForeignKey('clientes.id', ondelete='SET NULL'), nullable=True, index=True)
    empresa_id = db.Column(db.Integer, db.ForeignKey('entidades_juridicas.id', ondelete='SET NULL'), nullable=True, index=True)
    usuario_id = db.Column(db.Integer, db.ForeignKey('funcionarios.id', ondelete='SET NULL'), nullable=True, index=True)
    departamento_id = db.Column(db.Integer, db.ForeignKey('departamentos.id', ondelete='SET NULL'), nullable=True, index=True)
    
    # Relationships
    cliente = db.relationship('Cliente', back_populates='ordens_servico')
    empresa = db.relationship('EntidadeJuridica', back_populates='ordens_servico')
    usuario = db.relationship('Usuario', back_populates='ordens_servico')
    departamento = db.relationship('Departamento', back_populates='ordens_servico')
    itens = db.relationship('ItemOrdemServico', back_populates='ordem_servico', cascade="all, delete-orphan")

    # Validadores
    @validates('protocolo')
    def validando_protocolo(self, key, protocolo):
        if not protocolo:
            raise ValueError("O protocolo da ordem não pode ser vazio")
        if len(protocolo) < 5:
            raise ValueError("O protocolo deve ter pelo menos 5 caracteres")
        return protocolo.upper()  # Padronizar em maiúsculas

    @validates('status')
    def validando_status(self, key, status):
        status_validos = ['aberta', 'em_andamento', 'pausada', 'concluida', 'cancelada']
        if status not in status_validos:
            raise ValueError(f"Status deve ser um dos seguintes: {', '.join(status_validos)}")
        return status

    # Método para calcular valor total da OS
    def calcular_valor_total(self):
        """Calcula o valor total da OS baseado nos itens"""
        total = sum(item.valor_total for item in self.itens if item.ativo)
        self.valor_total_os = total
        return total

    # Método para fechar a OS
    def fechar_ordem(self):
        """Fecha a ordem de serviço"""
        self.status = 'concluida'
        self.data_fechamento = datetime.utcnow()

    def to_json(self):
        return{
            'id': self.id,
            'protocolo': self.protocolo,
            'vencimento': self.vencimento.isoformat() if self.vencimento else None,
            'observacao': self.observacao,
            'status': self.status,
            'data_abertura': self.data_abertura.isoformat(),
            'data_fechamento': self.data_fechamento.isoformat() if self.data_fechamento else None,
            'valor_total_os': self.valor_total_os,
            'cliente': self.cliente.to_json() if self.cliente else None,
            'empresa': self.empresa.to_json() if self.empresa else None,
            'usuario': self.usuario.to_json() if self.usuario else None,
            'departamento': self.departamento.to_json() if self.departamento else None,
            'itens': [item.to_json() for item in self.itens if item.ativo],
            'ativo': self.ativo,
            'created_at': self.created_at.isoformat(),
            'updated_at': self.updated_at.isoformat(),
        }

    def __repr__(self):
        return f"<OrdemServico {self.protocolo} - Status: {self.status}>"