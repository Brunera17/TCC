from config import db
from datetime import datetime, timezone
from sqlalchemy import CheckConstraint, UniqueConstraint, Index, event, or_ # type: ignore
from sqlalchemy.orm import joinedload # type: ignore
from sqlalchemy.dialects.postgresql import JSONB # type: ignore
from sqlalchemy.dialects.sqlite import JSON # type: ignore
from sqlalchemy.ext.hybrid import hybrid_property # type: ignore
from sqlalchemy.sql import expression # type: ignore
from decimal import Decimal
from typing import Dict, List, Optional, Any
import json
import re
from werkzeug.security import generate_password_hash, check_password_hash # type: ignore

# =====================================================
# MIXINS E CLASSES BASE
# =====================================================

class TimestampMixin:
    """Mixin para campos timestamp"""
    created_at = db.Column(db.DateTime, default=datetime.utcnow, nullable=False)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False )
    
class ActiveMixin:
    """Mixin para controle ativo/inativo"""
    ativo = db.Column(db.Boolean, default=True, nullable=False, index=True)

    @classmethod
    def ativos(cls):
        """Query para registros ativos"""
        return cls.query.filter(cls.ativo == True)
    
    def desativar(self):
        """Desativa o registro"""
        self.ativo = False
        self.updated_at = datetime.utcnow()
        
    def ativar(self):
        """Ativa o registro"""
        self.ativo = True
        self.updated_at = datetime.utcnow()

# =====================================================
# Modelos Principais
# =====================================================
class Empresa(db.Model, TimestampMixin, ActiveMixin):
    """Modelo para empresa"""
    __tablename__ = "empresa"
    
    id = db.Column(db.Integer, primary_key=True)
    nome = db.Column(db.String(100), nullable=False, index=True)
    cnpj = db.Column(db.String(18), nullable=False, unique=True, index=True)
    endereco = db.Column(db.String(255), nullable=False)
    telefone = db.Column(db.String(15), nullable=True)
    email = db.Column(db.String(150), nullable=True)
    
    def __repr__(self):
        return f'<Empresa {self.nome}>'
    
    def to_json(self):
        return {
            "id": self.id,
            "nome": self.nome,
            "cnpj": self.cnpj,
            "endereco": self.endereco,
            "telefone": self.telefone,
            "email": self.email,
            "ativo": self.ativo,
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "updated_at": self.updated_at.isoformat() if self.updated_at else None
        }

class Funcionario(db.Model, TimestampMixin, ActiveMixin):
    """Modelo para funcionário"""
    __tablename__ = "funcionario"

    id = db.Column(db.Integer, primary_key=True)
    nome = db.Column(db.String(100), nullable=False)
    email = db.Column(db.String(150), nullable=False)
    senha_hash = db.Column(db.String(255), nullable=False)
    gerente = db.Column(db.Boolean, default=False, nullable=False)
    cargo_id = db.Column(db.Integer, db.ForeignKey('cargo.id'))
    
    # Relacionamentos
    cargo = db.relationship('Cargo', backref= 'funcionarios', lazy=True)
    
    def __repr__(self):
        return f'<Funcionario {self.nome}>'
    
    def set_senha(self, senha: str):
        self.senha_hash = generate_password_hash(senha)
        
    def to_json(self):
        return{
            "id": self.id,
            "nome": self.nome,
            "email": self.email,
            "cargo": self.cargo,
            "ativo": self.ativo,
            "gerente": self.gerente,
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "updated_at": self.updated_at.isoformat() if self.updated_at else None
        }
    @classmethod
    def buscar(cls, termo: str):
        """Busca funcionários por termo"""
        if not termo:
            return cls.query
        
        termo = f"%{termo.strip()}%"
        return cls.query.join(Cargo).filter(
            or_(
                cls.nome.ilike(termo),
                cls.email.ilike(termo),
                Cargo.nome.ilike(termo)
            )
        )

class Cargo(db.Model):
    __tablename__ = "cargo"

    id = db.Column(db.Integer, primary_key=True)
    nome = db.Column(db.String(100), nullable=False, index=True)
    empresa_id = db.Column(db.Integer, db.ForeingKey('empresa.id'), nullable=False)
    
    # Relacionamentos
    empresa = db.relathionship('Empresa', backref='cargos', lazy=True)

    def __repr__(self):
        return f'<Cargo {self.nome}>'

    def to_json(self):
        return {
            "id": self.id,
            "nome": self.nome
        }

class Cliente(db.Model, TimestampMixin, ActiveMixin):
    """Modelo para cliente"""
    ___tablename__ = "clientes"
    
    id = db.Column(db.Integer, primary_key=True)
    nome = db.Column(db.String(100), nullable=False, index=True)
    cpf = db.Column(db.String(14), index=True, nullable=False)
    email = db.Column(db.String(150), nullable=True)
    
    abertura_empresa = db.Column(db.Boolean, nullable=False, server_default=expression.false())
    
    # Relacionamentos
    propostas = db.relationship('Proposta', backref='cliente', lazy=True)
    
    def __repr__(self):
        return f'<Cliente {self.nome}>'
    
    def to_json(self):
        return {
            "id": self.id,
            "nome": self.nome,
            "cpf": self.cpf,
            "email": self.email,
            "abertura_empresa": self.abertura_empresa,
            "ativo": self.ativo,
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "updated_at": self.updated_at.isoformat() if self.updated_at else None
        }
        
    def pode_ser_removido(self) -> bool:
        """Verifica se o cliente pode ser removido"""
        return not bool(self.propostas)
    
    @classmethod
    def buscar(cls, termo: str):
        """Busca clientes por termo"""
        if not termo:
            return cls.query
        
        termo = f"%{termo.strip()}%"
        return cls.query.filter(
            db.or_(
                cls.nome.ilike(termo),
                cls.cpf.ilike(termo),
                cls.email.ilike(termo),
                db.func.lower(cls.nome).ilike(db.func.lower(termo))                
            )
        )
    def validar_dados(self) -> List[str]:
        """Valida os dados do cliente"""
        erros = []
        if not self.nome or not self.nome.strip():
            erros.append("Nome é obrigatório")
        if not self.cpf or not re.match(r^'\d{3}\.\d{3}\.\d{3}-\d{2}$', self.cpf):
            erros.append("CPF inválido. Formato esperado: XXX.XXX.XXX-XX")
        if not self.email or not re.match(r'^[\w\.-]+@[\w\.-]+\.\w+$', self.email):
            erros.append("Email inválido")
        if not isinstance(self.abertura_empresa, bool):
            self.abertura_empresa = False
        return erros

class EmpresaCliente(db.Model, TimestampMixin, ActiveMixin):
    """Modelo para empresa cliente"""
    __tablename__ = "empresa_cliente"
    
    id = db.Column(db.Integer, primary_key=True)
    nome = db.Column(db.String(100), nullable=False, index=True)
    cnpj = db.Column(db.String(18), nullable=False, unique=True, index=True)
    cliente_id = db.Column(db.Integer, db.ForeignKey('clientes'), nullable=False, index=True)
    # Relacionamentos
    cliente = db.relationship('Cliente', backref='empresa_cliente', lazy=True)
    
    def __repr__(self):
        return f'<EmpresaCliente {self.nome}>'

    def to_json(self):
        return {
            "id": self.id,
            "nome": self.nome,
            "cnpj": self.cnpj,
            "ativo": self.ativo,
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "updated_at": self.updated_at.isoformat() if self.updated_at else None
        }
    
    def pode_ser_removido(self) -> bool:
        """Verifica se a empresa dos clientes pode ser removida"""
        return not bool(self.clientes)
    def validar_dados(self) -> List[str]:
        """Valida os dados da empresa"""
        erros = []
        if not self.nome or not self.nome.strip():
            erros.append("Nome é obrigatório")
        if not self.cnpj or not re.match(r'^\d{2}\.\d{3}\.\d{3}/\d{4}-\d{2}$', self.cnpj):
            erros.append("CNPJ inválido. Formato esperado: XX.XXX.XXX/XXXX-XX")
        if not isinstance(self.cliente_id, int):
            erros.append("ID do cliente deve ser um número inteiro")
        return erros
    @classmethod
    def buscar(cls, temro: str):
        """Buscar empresas por termo"""
        if not termo:
            return cls.query
        
        termo = f'%{termo.strip()}%'
        return cls.query.filter(
            db.or_(
                cls.nome.ilike(termo),
                cls.cnpj.ilike(termo),
                db.func.lower(cls.nome).ilike(db.func.lower(termo))
            )
        )
    def set_cnpj(self, cnpj: str):
        """Define o CNPJ com formatação correta"""
        if not re.match(r'^\d{2}\.\d{3}\.\d{3}/\d{4}-\d{2}$', cnpj):
            raise ValueError("CNPJ inválido. Formato esperado: XX.XXX.XXX/XXXX-XX")
        self.cnpj = cnpj
    def get_cnpj(self) -> str:
        """Retorna o CNPJ formatado"""
        return self.cnpj if self.cnpj else ""
    cnpj = property(get_cnpj, set_cnpj)

class endereco(db.Model, TimestampMixin, ActiveMixin):
    """Modelo para endereço"""
    __tablename__= "enderecos"
    
    id = db.Column(db.Integer, primary_key=True)
    rua = db.Column(db.String(255), nullable=False)
    numero = db.Column(db.String(10), nullable=False)
    bairro = db.Column(db.String(100), nullable=False)
    cidade = db.Column(db.String(100), nullable=False)
    estado = db.Column(db.String(2), nullable=False)
    cep = db.Column(db.String(10), nullable=False, index=True)
    cliente_id = db.Column(db.Integer, db.ForeignKey('clientes.id'), nullable=False, index=True)
    
    # Constraints
    __table_args__ = (
        CheckConstraint("estado IN ('AC', 'AL', 'AP', 'AM', 'BA', 'CE', 'DF', 'ES', 'GO', 'MA', 'MT', 'MS', 'MG', 'PA', 'PB', 'PR', 'PE', 'PI', 'RJ', 'RN', 'RS', 'RO', 'RR', 'SC', 'SE', 'SP', 'TO')", name='check_estado'),
        UniqueConstraint('rua', 'numero', 'bairro', 'cidade', name='unique_endereco')
    )
    # Construtor
    # Comentado para evitar conflito com o ORM
#    def __init__(self, rua: str, numero: str, bairro: str, cidade: str, estado: str, cep: str):
#        self.rua = rua.strip()
#        self.numero = numero.strip()
#        self.bairro = bairro.strip()
#        self.cidade = cidade.strip()
#        self.estado = estado.strip().upper()
#        self.cep = cep.strip()
#        if not re.match(r'^\d{5}-\d{3}$', self.cep):
#            raise ValueError("CEP inválido. Formato esperado: XXXXX-XXX")
#        if not re.match(r'^[A-Z]{2}$', self.estado):
#            raise ValueError("Estado inválido. Deve ser uma sigla de 2 letras maiúsculas")
#        if not self.rua or not self.numero or not self.bairro or not self.cidade:
#            raise ValueError("Rua, número, bairro e cidade são obrigatórios")
#        self.ativo = True
#        self.created_at = datetime.utcnow()
#        self.updated_at = datetime.utcnow()
    
    # Relacionamentos
    clientes = db.relationship('Cliente', backref='endereco', lazy=True)

    def __repr__(self):
        return f'<Endereco {self.rua}, {self.numero}, {self.bairro}, {self.cidade}, {self.estado}>'
    
    def to_json(self):
        return {
            "id": self.id,
            "rua": self.rua,
            "numero": self.numero,
            "bairro": self.bairro,
            "cidade": self.cidade,
            "estado": self.estado,
            "cep": self.cep,
            "ativo": self.ativo,
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "updated_at": self.updated_at.isoformat() if self.updated_at else None
        }
        
    def validar_dados(self) -> List[str]:
        """Valida os dados do endereço"""
        erros = []
        if not self.rua or not self.rua.strip():
            erros.append("Rua é obrigatória")
        if not self.numero or not self.numero.strip():
            erros.append("Número é obrigatório")
        if not self.bairro or not self.bairro.strip():
            erros.append("Bairro é obrigatório")
        if not self.cidade or not self.cidade.strip():
            erros.append("Cidade é obrigatória")
        if not self.estado or not re.match(r'^[A-Z]{2}$', self.estado):
            erros.append("Estado inválido. Deve ser uma sigla de 2 letras maiúsculas")
        if not self.cep or not re.match(r'^\d{5}-\d{3}$', self.cep):
            erros.append("CEP inválido. Formato esperado: XXXXX-XXX")
        return erros
    