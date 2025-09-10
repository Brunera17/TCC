""" Modelos de dados para organização da empresa """

from datetime import datetime
from config import db
from sqlalchemy.orm import validates
from werkzeug.security import generate_password_hash, check_password_hash
from .base import TimestampMixin, ActiveMixin
import re

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
    cargos = db.relationship('Cargo', back_populates='empresa', lazy='dynamic', cascade='all, delete-orphan',)
        
    # Validadores
    @validates('cnpj')
    def validando_cnpj(self, key, cnpj):
        if not cnpj:
            raise ValueError("CNPJ não pode ser vazio")
        if not re.match(r'^\d{14}$', cnpj):
            raise ValueError("CNPJ deve conter 14 dígitos")
        return cnpj
    @validates('email')
    def validando_email(self, key, email):
        if not email:
            raise ValueError("Email não pode ser vazio")
        if not re.match(r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$', email):
            raise ValueError("Email inválido")
        return email
    @validates('telefone')
    def validando_telefone(self, key, telefone):
        if not telefone:
            raise ValueError("Telefone não pode ser vazio")
        if not re.match(r'^\d{10,15}$', telefone):
            raise ValueError("Telefone deve conter entre 10 e 15 dígitos")
        return telefone

    # transformação para JSON
    def to_json(self):
        return{
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
    

class Departamento(db.Model, TimestampMixin, ActiveMixin):
    """ Modelo para representar um departamento """
    __tablename__ = 'departamentos'

    id = db.Column(db.Integer, primary_key=True)
    nome = db.Column(db.String(100), nullable=False, index=True)
    descricao = db.Column(db.String(255))
    status = db.Column(db.String(50), default='ativo')
    
    # Chave estrangeira para a empresa
    empresa_id = db.Column(db.Integer, db.ForeignKey('empresas.id', ondelete='CASCADE'), nullable=False, index=True)
    
    # Relacionamentos
    empresa = db.relationship('Empresa', back_populates='departamentos')
    
    # Validadores
    @validates('nome')
    def validando_nome(self, key, nome):
        if not nome:
            raise ValueError("Nome não pode ser vazio")
        return nome
    
    # transformação para JSON
    def to_json(self):
        return{
            'id': self.id,
            'nome': self.nome,
            'descricao': self.descricao,
            'empresa_id': self.empresa_id,
            'created_at': self.created_at.isoformat(),
            'deleted_at': self.deleted_at.isoformat() if self.deleted_at else None,
            'updated_at': self.updated_at.isoformat(),
            'ativo': self.ativo
        }
    def __repr__(self):
        return f"<Departamento {self.nome}>"
class Cargo(db.Model, TimestampMixin, ActiveMixin):
    """ Modelo para representar um cargo """
    __tablename__ = 'cargos'

    id = db.Column(db.Integer, primary_key=True)
    nome = db.Column(db.String(100), nullable=False, index=True)
    descricao = db.Column(db.String(255), nullable=True)
    tipo = db.Column(db.String(50), nullable=True)
        
    # Chave estrangeira para a empresa
    departamento_id = db.Column(db.Integer, db.ForeignKey('departamento.id', ondelete='CASCADE'), nullable=False, index=True)
    
    # Relacionamentos
    departamento = db.relationship('Empresa', back_populates='cargos')
    funcionarios = db.relationship('Funcionario', back_populates='cargo', lazy='dynamic', cascade='all, delete-orphan')

    # Validadores
    @validates('nome')
    def validando_nome(self, key, nome):
        if not nome:
            raise ValueError("Nome não pode ser vazio")
        return nome
    @validates('tipo')
    def validando_nivel(self, key, tipo):
        if not tipo:
            raise ValueError("tipo não pode ser vazio")
        return tipo
    
    # transformação para JSON
    def to_json(self):
        return{
            'id': self.id,
            'nome': self.nome,
            'descricao': self.descricao,
            'tipo': self.tipo,
            'departamento_id': self.departamento_id,
            'created_at': self.created_at.isoformat(),
            'deleted_at': self.deleted_at.isoformat() if self.deleted_at else None,
            'updated_at': self.updated_at.isoformat(),
            'ativo': self.ativo
        }
    def __repr__(self):
        return f"<Cargo {self.nome}>"
    
class Usuario(db.Model, TimestampMixin, ActiveMixin):
    """ Modelo para representar um funcionário """
    __tablename__ = 'funcionarios'

    id = db.Column(db.Integer, primary_key=True)
    nome = db.Column(db.String(150), nullable=False, index=True)
    cpf = db.Column(db.String(11), nullable=False, unique=True, index=True)
    email = db.Column(db.String(150), nullable=False, unique=True, index=True)
    senha_hash = db.Column(db.String(255), nullable=False)
    foto = db.Column(db.String(255), nullable=True)
    eh_gerente = db.Column(db.Boolean, default=False)
    status = db.Column(db.String(20), default='ativo')
    ultimo_login = db.Column(db.DateTime, nullable=True)
    tentativas_login = db.Column(db.Integer, default=0)
    bloqueado_ate = db.Column(db.DateTime, nullable=True)
    # Chave estrangeira para o cargo
    cargo_id = db.Column(db.Integer, db.ForeignKey('cargos.id', ondelete='CASCADE'), nullable=False, index=True)
    # Relacionamentos
    cargo = db.relationship('Cargo', back_populates='funcionarios')

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
    @validates('senha_hash')
    def validando_senha(self, key, senha):
        if not senha or len(senha) < 6:
            raise ValueError("Senha deve ter pelo menos 6 caracteres")
        return generate_password_hash(senha)
    
    def to_json(self):
        return{
            'id': self.id,
            'nome': self.nome,
            'cpf': self.cpf,
            'email': self.email,
            'senha_hash': self.senha_hash,
            'foto': self.foto,
            'eh_gerente': self.eh_gerente,
            'status': self.status,
            'cargo_id': self.cargo_id,
            'ultimo_login': self.ultimo_login,
            'tentativas_login': self.tentativas_login,
            'bloqueado_ate': self.bloqueado_ate,
            'created_at': self.created_at.isoformat(),
            'deleted_at': self.deleted_at.isoformat() if self.deleted_at else None,
            'updated_at': self.updated_at.isoformat(),
            'ativo': self.ativo
        }
    def __repr__(self):
        return f"<Usuario {self.nome}>"
    






