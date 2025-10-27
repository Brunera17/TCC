""" Modelo de Cliente """

from datetime import datetime
from config import db
from sqlalchemy.orm import validates
from .base import TimestampMixin, ActiveMixin
import re

class Cliente(db.Model, TimestampMixin, ActiveMixin):
    """ Modelo de Cliente - Simplificado """
    __tablename__ = 'clientes'

    id = db.Column(db.Integer, primary_key=True)
    nome = db.Column(db.String(150), nullable=False, index=True)
    cpf = db.Column(db.String(11), nullable=False, unique=True, index=True)
    email = db.Column(db.String(150), nullable=True, unique=True, index=True)
    telefone = db.Column(db.String(15), nullable=True)
    endereco = db.Column(db.String(255), nullable=True)
    observacoes = db.Column(db.Text, nullable=True)

    # Relacionamentos
    enderecos = db.relationship('Endereco', back_populates='cliente', lazy='dynamic', cascade="all, delete-orphan")
    entidades_juridicas = db.relationship('EntidadeJuridica', back_populates='cliente', lazy='dynamic', cascade="all, delete-orphan")
    solicitacoes = db.relationship('Solicitacao', back_populates='cliente', lazy='dynamic')
    ordens_servico = db.relationship('OrdemServico', back_populates='cliente', lazy='dynamic')
    propostas = db.relationship('Proposta', back_populates='cliente', lazy='dynamic')

    # Métodos
    def to_json(self):
        return {
            'id': self.id,
            'nome': self.nome,
            'cpf': self.cpf,
            'cpf_formatado': self.formatar_cpf(),
            'email': self.email,
            'telefone': self.telefone,
            'endereco': self.endereco,
            'observacoes': self.observacoes,
            'created_at': self.created_at.isoformat(),
            'updated_at': self.updated_at.isoformat(),
            'deleted_at': self.deleted_at.isoformat() if self.deleted_at else None,
            'ativo': self.ativo
        }
    
    def formatar_cpf(self):
        """Formata CPF para exibição: 000.000.000-00"""
        if self.cpf and len(self.cpf) == 11:
            return f"{self.cpf[:3]}.{self.cpf[3:6]}.{self.cpf[6:9]}-{self.cpf[9:]}"

        return self.cpf
    
    # Validadores
    @validates('nome')
    def validar_nome(self, key, nome):
        if not nome or len(nome.strip()) == 0:
            raise ValueError("Nome não pode ser vazio")
        if len(nome) > 150:
            raise ValueError("Nome deve ter no máximo 150 caracteres")
        return nome.strip()
    
    @validates('cpf')
    def validar_cpf(self, key, cpf):
        if not cpf:
            raise ValueError("CPF não pode ser vazio")
        
        # Remover caracteres especiais
        cpf_limpo = re.sub(r'[^\d]', '', cpf)
        
        if len(cpf_limpo) != 11:
            raise ValueError("CPF deve conter exatamente 11 dígitos")
        
        return cpf_limpo
    
    @validates('email')
    def validar_email(self, key, email):
        if email and not re.match(r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$', email):
            raise ValueError("Email inválido")
        return email

    @validates('telefone')
    def validar_telefone(self, key, telefone):
        if telefone:
            # Remover caracteres especiais
            telefone_limpo = re.sub(r'[^\d]', '', telefone)
            if len(telefone_limpo) < 10 or len(telefone_limpo) > 15:
                raise ValueError("Telefone deve ter entre 10 e 15 dígitos")
            return telefone_limpo
        return telefone

    def __repr__(self):
        return f"<Cliente {self.nome}>"


class Endereco(db.Model, TimestampMixin, ActiveMixin):
    """ Modelo de Endereço """
    __tablename__ = 'enderecos'

    id = db.Column(db.Integer, primary_key=True)
    logradouro = db.Column(db.String(200), nullable=False)
    numero = db.Column(db.String(10), nullable=False)
    complemento = db.Column(db.String(100), nullable=True)
    bairro = db.Column(db.String(100), nullable=False)
    cidade = db.Column(db.String(100), nullable=False)
    estado = db.Column(db.String(2), nullable=False)
    cep = db.Column(db.String(8), nullable=False)

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
    
    @validates('cep')
    def validar_cep(self, key, cep):
        if cep:
            cep_limpo = re.sub(r'[^\d]', '', cep)
            if len(cep_limpo) != 8:
                raise ValueError("CEP deve conter 8 dígitos")
            return cep_limpo
        return cep

    def __repr__(self):
        return f"<Endereco {self.logradouro}, {self.numero} - {self.cidade}/{self.estado}>"