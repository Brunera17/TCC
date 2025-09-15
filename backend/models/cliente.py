""" Modelo de Cliente """

from datetime import datetime
from config import db
from sqlalchemy.orm import validates
from .base import TimestampMixin, ActiveMixin
import re

class Cliente(db.Model, TimestampMixin, ActiveMixin):
    """ Modelo de Cliente """
    __tablename__ = 'clientes'

    id = db.Column(db.Integer, primary_key=True)
    nome = db.Column(db.String(100), nullable=False, index=True)
    cpf = db.Column(db.String(14), nullable=False, unique=True, index=True)
    email = db.Column(db.String(100), unique=True, index=True)
    abertura_empresa = db.Column(db.Boolean, default=False, nullable=False)

    # Relacionamentos
    enderecos = db.relationship('Endereco', back_populates='cliente', lazy='joined', cascade='all, delete-orphan')
    entidades_juridicas = db.relationship('EntidadeJuridica', back_populates='cliente', lazy='joined', cascade='all, delete-orphan')
    ordens_servico = db.relationship('OrdemServico', back_populates='cliente', lazy='dynamic')
    propostas = db.relationship('Proposta', back_populates='cliente', lazy='dynamic')
    solicitacoes = db.relationship('Solicitacao', back_populates='cliente', lazy='dynamic')

    # Métodos
    def to_json(self):
        return {
            'id': self.id,
            'nome': self.nome,
            'cpf': self.cpf,
            'email': self.email,
            'abertura_empresa': self.abertura_empresa,
            'created_at': self.created_at.isoformat(),
            'updated_at': self.updated_at.isoformat(),
            'entidades_juridicas': [entidade_juridica.to_json() for entidade_juridica in self.entidades_juridicas],
            'ordens_servico': [ordem_servico.to_json() for ordem_servico in self.ordens_servico],
            'propostas': [proposta.to_json() for proposta in self.propostas],
            'solicitacoes': [solicitacao.to_json() for solicitacao in self.solicitacoes]
        }
    
    # Validadores
    @validates('nome')
    def validando_nome(self, key, nome):
        if not nome:
            raise ValueError("Nome não pode ser vazio")
        return nome
    
    @validates('cpf')
    def validando_cpf(self, key, cpf):
        if not cpf:
            raise ValueError("CPF não pode ser vazio")
        if not re.match(r'^\d{11}$', cpf):
            raise ValueError("CPF deve conter 11 dígitos")
        return cpf
    
    @validates('email')
    def validando_email(self, key, email):
        if not email:
            raise ValueError("Email não pode ser vazio")
        if not re.match(r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$', email):
            raise ValueError("Email inválido")
        return email

    def __repr__(self):
        return f"<Cliente {self.nome}>"

class Endereco(db.Model, TimestampMixin, ActiveMixin):
    """ Modelo de Endereço """
    __tablename__ = 'enderecos'

    id = db.Column(db.Integer, primary_key=True)
    logradouro = db.Column(db.String(100), nullable=False)
    numero = db.Column(db.String(10), nullable=False)
    complemento = db.Column(db.String(100), nullable=True)
    bairro = db.Column(db.String(100), nullable=False)
    cidade = db.Column(db.String(100), nullable=False)
    estado = db.Column(db.String(100), nullable=False)
    cep = db.Column(db.String(10), nullable=False)

    # Chave estrangeira para o cliente
    cliente_id = db.Column(db.Integer, db.ForeignKey('clientes.id', ondelete='CASCADE'), nullable=False, index=True)

    # Relacionamentos
    cliente = db.relationship('Cliente', back_populates='enderecos')

    # Métodos
    def to_json(self):
        return {
            'id': self.id,
            'logradouro': self.logradouro,
            'numero': self.numero,
            'complemento': self.complemento,
            'bairro': self.bairro,
            'cidade': self.cidade,
            'estado': self.estado,
            'cep': self.cep,
            'cliente_id': self.cliente_id,
            'created_at': self.created_at.isoformat(),
            'updated_at': self.updated_at.isoformat(),
            'ativo': self.ativo
        }

    def __repr__(self):
        return f"<Endereco {self.logradouro}, {self.numero}, {self.bairro}, {self.cidade}/{self.estado}>"