from  datetime import datetime
from config import db
from sqlalchemy.orm import validates
from .base import TimestampMixin, ActiveMixin
import re

class Relatorio(db.Model, TimestampMixin, ActiveMixin):
    """ Modelo para representar um relatório """
    __tablename__ = 'relatorios'

    id = db.Column(db.Integer, primary_key=True)
    titulo = db.Column(db.String(200), nullable=False, index=True)
    conteudo = db.Column(db.Text, nullable=False)
    tipo = db.Column(db.String(50), nullable=True)
    arquivo = db.Column(db.String(255), nullable=False)

    # Chave estrangeira para o funcionário que criou o relatório
    funcionario_id = db.Column(db.Integer, db.ForeignKey('funcionarios.id', ondelete='CASCADE'), nullable=False, index=True)
    # Relacionamentos
    funcionario = db.relationship('Funcionario', back_populates='relatorios', lazy='joined')

    # Métodos
    def to_json(self):
        return{
            'id': self.id,
            'titulo': self.titulo,
            'conteudo': self.conteudo,
            'tipo': self.tipo,
            'arquivo': self.arquivo,
            'funcionario': self.funcionario.to_json() if self.funcionario and self.funcionario.ativo else None,
            'created_at': self.created_at.isoformat(),
            'deleted_at': self.deleted_at.isoformat() if self.deleted_at else None,
            'updated_at': self.updated_at.isoformat(),
            'ativo': self.ativo
        }
    
    # Validadores
    @validates('titulo')
    def validando_titulo(self, key, titulo):
        if not titulo or len(titulo) < 3:
            raise ValueError("Título deve ter pelo menos 3 caracteres")
        return titulo

    @validates('conteudo')
    def validando_conteudo(self, key, conteudo):
        if not conteudo or len(conteudo) < 10:
            raise ValueError("Conteúdo deve ter pelo menos 10 caracteres")
        return conteudo

    def __repr__(self):
        return f"<Relatorio {self.titulo}>"