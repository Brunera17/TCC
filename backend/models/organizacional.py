""" Modelos de dados para organização da empresa """

from datetime import datetime
from config import db
from sqlalchemy.orm import validates
from werkzeug.security import generate_password_hash, check_password_hash
from .base import TimestampMixin, ActiveMixin
import re


# ======================================================
# 🏢 Modelo: Empresa
# ======================================================
class Empresa(db.Model, TimestampMixin, ActiveMixin):
    """ Modelo para representar uma empresa """
    __tablename__ = 'empresas'
    
    id = db.Column(db.Integer, primary_key=True)
    nome = db.Column(db.String(100), nullable=False, index=True)
    cnpj = db.Column(db.String(14), nullable=False, unique=True, index=True)
    endereco = db.Column(db.String(255), nullable=True)
    telefone = db.Column(db.String(15), nullable=True)
    email = db.Column(db.String(100), nullable=True, unique=True)

    # Relacionamentos
    departamentos = db.relationship(
        'Departamento',
        back_populates='empresa',
        lazy='dynamic',
        cascade='all, delete-orphan'
    )
        
    # Validadores
    @validates('cnpj')
    def validar_cnpj(self, key, cnpj):
        if not cnpj:
            raise ValueError("CNPJ não pode ser vazio")
        if not re.match(r'^\d{14}$', cnpj):
            raise ValueError("CNPJ deve conter 14 dígitos numéricos")
        return cnpj

    @validates('email')
    def validar_email(self, key, email):
        if email and not re.match(r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$', email):
            raise ValueError("Email inválido")
        return email

    @validates('telefone')
    def validar_telefone(self, key, telefone):
        if telefone and not re.match(r'^\d{10,15}$', telefone):
            raise ValueError("Telefone deve conter entre 10 e 15 dígitos numéricos")
        return telefone

    # transformação para JSON
    def to_json(self):
        return {
            'id': self.id,
            'nome': self.nome,
            'cnpj': self.cnpj,
            'endereco': self.endereco,
            'telefone': self.telefone,
            'email': self.email,
            'created_at': self.created_at.isoformat(),
            'updated_at': self.updated_at.isoformat(),
            'ativo': self.ativo
        }

    def __repr__(self):
        return f"<Empresa {self.nome}>"


# ======================================================
# 🧩 Modelo: Departamento
# ======================================================
class Departamento(db.Model, TimestampMixin, ActiveMixin):
    """ Modelo para representar um departamento """
    __tablename__ = 'departamentos'

    id = db.Column(db.Integer, primary_key=True)
    nome = db.Column(db.String(100), nullable=False, index=True)
    descricao = db.Column(db.String(255), nullable=True)
    status = db.Column(db.String(50), default='ativo')
    
    # Chave estrangeira para a empresa
    empresa_id = db.Column(db.Integer, db.ForeignKey('empresas.id', ondelete='CASCADE'), nullable=False, index=True)

    # Relacionamentos
    empresa = db.relationship('Empresa', back_populates='departamentos')
    cargos = db.relationship('Cargo', back_populates='departamento', lazy='dynamic', cascade='all, delete-orphan')
    ordens_servico = db.relationship('OrdemServico', back_populates='departamento', lazy='dynamic')
    
    # Validadores
    @validates('nome')
    def validar_nome(self, key, nome):
        if not nome:
            raise ValueError("Nome do departamento não pode ser vazio")
        return nome
    
    # transformação para JSON
    def to_json(self):
        return {
            'id': self.id,
            'nome': self.nome,
            'descricao': self.descricao,
            'status': self.status,
            'empresa_id': self.empresa_id,
            'cargos': [cargo.to_json() for cargo in self.cargos if cargo.ativo],
            'created_at': self.created_at.isoformat(),
            'updated_at': self.updated_at.isoformat(),
            'deleted_at': self.deleted_at.isoformat() if self.deleted_at else None,
            'ativo': self.ativo
        }

    def __repr__(self):
        return f"<Departamento {self.nome}>"


# ======================================================
# 🧱 Modelo: Cargo
# ======================================================
class Cargo(db.Model, TimestampMixin, ActiveMixin):
    """ Modelo para representar um cargo """
    __tablename__ = 'cargos'

    id = db.Column(db.Integer, primary_key=True)
    nome = db.Column(db.String(100), nullable=False, index=True)
    descricao = db.Column(db.String(255), nullable=True)
    tipo = db.Column(db.String(50), nullable=True)
        
    # Chave estrangeira para o departamento
    departamento_id = db.Column(db.Integer, db.ForeignKey('departamentos.id', ondelete='CASCADE'), nullable=False, index=True)
    
    # Relacionamentos
    departamento = db.relationship('Departamento', back_populates='cargos')
    usuarios = db.relationship('Usuario', back_populates='cargo', lazy='dynamic')

    # Validadores
    @validates('nome')
    def validar_nome(self, key, nome):
        if not nome:
            raise ValueError("Nome do cargo não pode ser vazio")
        return nome

    @validates('tipo')
    def validar_tipo(self, key, tipo):
        if tipo is not None and len(tipo.strip()) == 0:
            raise ValueError("Tipo do cargo não pode ser uma string vazia")
        return tipo
    
    # transformação para JSON
    def to_json(self):
        return {
            'id': self.id,
            'nome': self.nome,
            'descricao': self.descricao,
            'tipo': self.tipo,
            'departamento_id': self.departamento_id,
            'created_at': self.created_at.isoformat(),
            'updated_at': self.updated_at.isoformat(),
            'deleted_at': self.deleted_at.isoformat() if self.deleted_at else None,
            'ativo': self.ativo
        }

    def __repr__(self):
        return f"<Cargo {self.nome}>"


# ======================================================
# 👤 Modelo: Usuario (Funcionário) - REMOVIDO RELACIONAMENTO PROBLEMÁTICO
# ======================================================
class Usuario(db.Model, TimestampMixin, ActiveMixin):
    """ Modelo para representar um funcionário """
    __tablename__ = 'funcionarios'

    id = db.Column(db.Integer, primary_key=True)
    nome = db.Column(db.String(150), nullable=False, index=True)
    cpf = db.Column(db.String(11), nullable=True, unique=True, index=True)
    email = db.Column(db.String(150), nullable=False, unique=True, index=True)
    senha_hash = db.Column(db.String(255), nullable=False)
    username = db.Column(db.String(50), nullable=False, unique=True, index=True)
    tipo_usuario = db.Column(db.String(20), default='funcionario')
    foto = db.Column(db.String(255), nullable=True)
    eh_gerente = db.Column(db.Boolean, default=False)
    status = db.Column(db.String(20), default='ativo')
    ultimo_login = db.Column(db.DateTime, nullable=True)
    tentativas_login = db.Column(db.Integer, default=0)
    bloqueado_ate = db.Column(db.DateTime, nullable=True)
    
    # Cargo opcional para permitir usuários admin sem cargo específico
    cargo_id = db.Column(db.Integer, db.ForeignKey('cargos.id', ondelete='SET NULL'), nullable=True, index=True)
    
    # Relacionamentos
    cargo = db.relationship('Cargo', back_populates='usuarios')
    agendamentos = db.relationship('Agendamento', back_populates='funcionario', lazy='dynamic')
    solicitacoes = db.relationship('Solicitacao', back_populates='funcionario', lazy='dynamic')
    relatorios = db.relationship('Relatorio', back_populates='funcionario', lazy='dynamic')
    propostas = db.relationship('Proposta', back_populates='usuario', lazy='dynamic')
    ordens_servico = db.relationship('OrdemServico', back_populates='usuario', lazy='dynamic')

    # Métodos de senha
    def set_senha(self, senha):
        if not senha or len(senha) < 6:
            raise ValueError("Senha deve ter pelo menos 6 caracteres")
        self.senha_hash = generate_password_hash(senha)

    def verificar_senha(self, senha):
        return check_password_hash(self.senha_hash, senha)

    # Validadores
    @validates('nome')
    def validar_nome(self, key, nome):
        if not nome:
            raise ValueError("Nome não pode ser vazio")
        return nome

    @validates('cpf')
    def validar_cpf(self, key, cpf):
        if cpf and not re.match(r'^\d{11}$', cpf):
            raise ValueError("CPF deve conter 11 dígitos numéricos")
        return cpf

    @validates('email')
    def validar_email(self, key, email):
        if not email:
            raise ValueError("Email não pode ser vazio")
        if not re.match(r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$', email):
            raise ValueError("Email inválido")
        return email
    
    @validates('username')
    def validar_username(self, key, username):
        if not username:
            raise ValueError("Username não pode ser vazio")
        if len(username) < 3:
            raise ValueError("Username deve ter pelo menos 3 caracteres")
        return username
    
    # transformação para JSON
    def to_json(self):
        return {
            'id': self.id,
            'nome': self.nome,
            'cpf': self.cpf,
            'email': self.email,
            'username': self.username,
            'tipo_usuario': self.tipo_usuario,
            'foto': self.foto,
            'eh_gerente': self.eh_gerente,
            'status': self.status,
            'cargo_id': self.cargo_id,
            'cargo': self.cargo.to_json() if self.cargo else None,
            'ultimo_login': self.ultimo_login.isoformat() if self.ultimo_login else None,
            'tentativas_login': self.tentativas_login,
            'bloqueado_ate': self.bloqueado_ate.isoformat() if self.bloqueado_ate else None,
            'created_at': self.created_at.isoformat(),
            'updated_at': self.updated_at.isoformat(),
            'deleted_at': self.deleted_at.isoformat() if self.deleted_at else None,
            'ativo': self.ativo
        }

    def __repr__(self):
        return f"<Usuario {self.nome}>"
