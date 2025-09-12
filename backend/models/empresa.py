from  datetime import datetime
from config import db
from sqlalchemy.orm import validates
from .base import TimestampMixin, ActiveMixin
import re

class EntidadeJuridica(db.Model, TimestampMixin, ActiveMixin):
    """ Modelo de Entidade Jurídica """
    __tablename__ = 'entidades_juridicas'

    id = db.Column(db.Integer, primary_key=True)
    razao_social = db.Column(db.String(100), nullable=False)
    cnpj = db.Column(db.String(14), nullable=False, unique=True, index=True)
    contato = db.Column(db.String(100), nullable=True)
    nome_fantasia = db.Column(db.String(100), nullable=False, index=True)
    status = db.Column(db.String(50), default='ativa')
    inscricao_estadual = db.Column(db.String(20), nullable=True)

    # Chave estrangeira para o cliente
    cliente_id = db.Column(db.Integer, db.ForeignKey('clientes.id', ondelete='CASCADE'), nullable=False, index=True)
    endereco_id = db.Column(db.Integer, db.ForeignKey('enderecos.id', ondelete='SET NULL'), nullable=True)
    tipo_id = db.Column(db.Integer, db.ForeignKey('tipos_empresas.id', ondelete='SET NULL'), nullable=True)
    # Relacionamentos
    cliente = db.relationship('Cliente', back_populates='entidades_juridicas')

    # Validadores
    @validates('nome_fantasia')
    def validando_nome_fantasia(self, key, nome_fantasia):
        if not nome_fantasia:
            raise ValueError("Nome fantasia não pode ser vazio")
        return nome_fantasia
    @validates('cnpj')
    def validando_cnpj(self, key, cnpj):
        if not cnpj:
            raise ValueError("CNPJ não pode ser vazio")
        if not re.match(r'^\d{14}$', cnpj):
            raise ValueError("CNPJ deve conter 14 dígitos")
        return cnpj
    @validates('inscricao_estadual')
    def validando_inscricao_estadual(self, key, inscricao_estadual):
        if not inscricao_estadual:
            raise ValueError("Inscrição estadual não pode ser vazia")
        return inscricao_estadual
    @validates('inscricao_municipal')
    def validando_inscricao_municipal(self, key, inscricao_municipal):
        if not inscricao_municipal:
            raise ValueError("Inscrição municipal não pode ser vazia")
        return inscricao_municipal
    @validates('inscricao_federal')
    def validando_inscricao_federal(self, key, inscricao_federal):
        if not inscricao_federal:
            raise ValueError("Inscrição federal não pode ser vazia")
        return inscricao_federal
    
    def to_json(self):
        return{
            'id': self.id,
            'nome_fantasia': self.nome_fantasia,
            'cnpj': self.cnpj,
            'inscricao_estadual': self.inscricao_estadual,
            'inscricao_municipal': self.inscricao_municipal,
            'inscricao_federal': self.inscricao_federal,
            'cliente_id': self.cliente_id,
            'created_at': self.created_at.isoformat(),
            'updated_at': self.updated_at.isoformat(),
            'ativo': self.ativo
        }
    def __repr__(self):
        return f"<EntidadeJuridica {self.nome_fantasia}>"
    
    
class TipoEmpresa(db.Model, TimestampMixin, ActiveMixin):
    """ Modelo para representar tipos de empresa """
    __tablename__ = 'tipos_empresas'

    id = db.Column(db.Integer, primary_key=True)
    nome = db.Column(db.String(100), nullable=False, unique=True, index=True)
    descricao = db.Column(db.String(255), nullable=True)
    
    #Relationships
    entidades_juridicas = db.relationship('EntidadeJuridica', back_populates='tipo', lazy='joined')
    
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
        return f"<TipoEmpresa {self.nome}>"
    
class RegimeTributario(db.Model, TimestampMixin, ActiveMixin):
    """ Modelo para representar regimes tributários """
    __tablename__ = 'regimes_tributarios'

    id = db.Column(db.Integer, primary_key=True)
    nome = db.Column(db.String(100), nullable=False, unique=True, index=True)
    descricao = db.Column(db.String(255), nullable=True)

    #Relationships
    entidades_juridicas = db.relationship('EntidadeJuridica', back_populates='regime_tributario', lazy='joined')
    
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
        return f"<RegimeTributario {self.nome}>"
    
class FaixaFaturamento(db.Model, TimestampMixin, ActiveMixin):
    """ Modelo para representar faixas de faturamento """
    __tablename__ = 'faixas_faturamento'

    id = db.Column(db.Integer, primary_key=True)
    descricao = db.Column(db.String(100), nullable=False, unique=True, index=True)
    valor_minimo = db.Column(db.Float, nullable=True)
    valor_maximo = db.Column(db.Float, nullable=True)
    
    #Chave estrangeira para o regime tributário
    RegimeTributario_id = db.Column(db.Integer, db.ForeignKey('regimes_tributarios.id', ondelete='SET NULL'), nullable=True)

    #Relationships
    RegimeTributario = db.relationship('RegimeTributario', back_populates='faixas_faturamento', lazy='joined')
    
    # Validadores
    @validates('descricao')
    def validando_descricao(self, key, descricao):
        if not descricao:
            raise ValueError("Nome não pode ser vazio")
        if len(descricao) < 3 or len(descricao) > 100:
            raise ValueError("Nome deve ter entre 3 e 100 caracteres")
        return descricao

    # transformação para JSON
    def to_json(self):
        return{
            'id': self.id,
            'descricao': self.descricao,
            'valor_minimo': self.valor_minimo,
            'valor_maximo': self.valor_maximo,
            'RegimeTributario_id': self.RegimeTributario_id,
            'created_at': self.created_at.isoformat(),
            'updated_at': self.updated_at.isoformat(),
            'ativo': self.ativo
        }
    def __repr__(self):
        return f"<FaixaFaturamento {self.nome}>"