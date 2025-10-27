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
    regime_tributario_id = db.Column(db.Integer, db.ForeignKey('regimes_tributarios.id', ondelete='SET NULL'), nullable=True)
    
    # Relacionamentos
    cliente = db.relationship('Cliente', back_populates='entidades_juridicas')
    tipo = db.relationship('TipoEmpresa', back_populates='entidades_juridicas')
    regime_tributario = db.relationship('RegimeTributario', back_populates='entidades_juridicas')
    ordens_servico = db.relationship('OrdemServico', back_populates='empresa', lazy='dynamic')
    propostas = db.relationship('Proposta', back_populates='entidade_juridica', lazy='dynamic')

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
        if inscricao_estadual and not inscricao_estadual.strip():
            raise ValueError("Inscrição estadual não pode ser vazia")
        return inscricao_estadual
    
    def to_json(self):
        return{
            'id': self.id,
            'nome_fantasia': self.nome_fantasia,
            'razao_social': self.razao_social,
            'cnpj': self.cnpj,
            'contato': self.contato,
            'status': self.status,
            'inscricao_estadual': self.inscricao_estadual,
            'cliente_id': self.cliente_id,
            'endereco_id': self.endereco_id,
            'tipo_id': self.tipo_id,
            'regime_tributario_id': self.regime_tributario_id,
            'tipo': self.tipo.to_json() if self.tipo else None,
            'regime_tributario': self.regime_tributario.to_json() if self.regime_tributario else None,
            'created_at': self.created_at.isoformat(),
            'updated_at': self.updated_at.isoformat(),
            'deleted_at': self.deleted_at.isoformat() if self.deleted_at else None,
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

    # Relacionamentos
    entidades_juridicas = db.relationship('EntidadeJuridica', back_populates='tipo', lazy='dynamic')
    
    # Validadores
    @validates('nome')
    def validando_nome(self, key, nome):
        if not nome:
            raise ValueError("Nome não pode ser vazio")
        if len(nome) < 2 or len(nome) > 100:
            raise ValueError("Nome deve ter entre 2 e 100 caracteres")
        return nome

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

    # Relacionamentos
    entidades_juridicas = db.relationship('EntidadeJuridica', back_populates='regime_tributario', lazy='dynamic')
    faixas_faturamento = db.relationship('FaixaFaturamento', back_populates='regime_tributario', lazy='dynamic')
    
    # Validadores
    @validates('nome')
    def validando_nome(self, key, nome):
        if not nome:
            raise ValueError("Nome não pode ser vazio")
        if len(nome) < 3 or len(nome) > 100:
            raise ValueError("Nome deve ter entre 3 e 100 caracteres")
        return nome

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
    
    # Chave estrangeira para o regime tributário
    regime_tributario_id = db.Column(db.Integer, db.ForeignKey('regimes_tributarios.id', ondelete='SET NULL'), nullable=True)

    # Relacionamentos
    regime_tributario = db.relationship('RegimeTributario', back_populates='faixas_faturamento')
    
    # Validadores
    @validates('descricao')
    def validando_descricao(self, key, descricao):
        if not descricao:
            raise ValueError("Descrição não pode ser vazia")
        if len(descricao) < 3 or len(descricao) > 100:
            raise ValueError("Descrição deve ter entre 3 e 100 caracteres")
        return descricao

    def to_json(self):
        return{
            'id': self.id,
            'descricao': self.descricao,
            'valor_minimo': self.valor_minimo,
            'valor_maximo': self.valor_maximo,
            'regime_tributario_id': self.regime_tributario_id,
            'created_at': self.created_at.isoformat(),
            'updated_at': self.updated_at.isoformat(),
            'ativo': self.ativo
        }
    
    def __repr__(self):
        return f"<FaixaFaturamento {self.descricao}>"