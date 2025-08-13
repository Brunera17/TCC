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

# Modelos Principais
    
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

    def __repr__(self):
        return f'<Cargo {self.nome}>'

    def to_json(self):
        return {
            "id": self.id,
            "nome": self.nome
        }

