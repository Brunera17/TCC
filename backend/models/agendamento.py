from datetime import datetime
from config import db
from sqlalchemy.orm import validates
from .base import TimestampMixin, ActiveMixin
import re

class Agendamento(db.Model, TimestampMixin, ActiveMixin):
    """ Modelo para representar um agendamento """
    __tablename__ = 'agendamentos'

    id = db.Column(db.Integer, primary_key=True)
    titulo = db.Column(db.String(200), nullable=False, index=True)
    data_fim = db.Column(db.DateTime, nullable=False, index=True)
    descricao = db.Column(db.String(255), nullable=True)
    tipo = db.Column(db.String(50), nullable=True)
    status = db.Column(db.String(50), default='pendente')
    destinatário = db.Column(db.String(150), nullable=True)
    # Chave estrangeira para o funcionário
    funcionario_id = db.Column(db.Integer, db.ForeignKey('funcionarios.id', ondelete='CASCADE'), nullable=False, index=True)
    # Relacionamentos
    funcionario = db.relationship('Usuario', back_populates='agendamentos', lazy='joined')
    # Métodos
    def to_json(self):
        return{
            'id': self.id,
            'titulo': self.titulo,
            'data_fim': self.data_fim.isoformat(),
            'descricao': self.descricao,
            'tipo': self.tipo,
            'status': self.status,
            'destinatário': self.destinatário,
            'funcionario': self.funcionario.to_json() if self.funcionario and self.funcionario.ativo else None,
            'created_at': self.created_at.isoformat(),
            'deleted_at': self.deleted_at.isoformat() if self.deleted_at else None,
            'updated_at': self.updated_at.isoformat(),
            'ativo': self.ativo
        }
    
    # Validadores
    @validates('data_fim')
    def validando_data_hora(self, key, data_hora):
        if not data_hora:
            raise ValueError("Data e hora não podem ser vazios")
        if data_hora < datetime.utcnow():
            raise ValueError("Data e hora devem ser no futuro")
        return data_hora
    @validates('destinatário')
    def validando_destinatário(self, key, destinatário):
        if destinatário and (len(destinatário) < 3 or len(destinatário) > 150):
            raise ValueError("Destinatário deve ter entre 3 e 150 caracteres")
        return destinatário
    def __repr__(self):
        return f"<Agendamento {self.titulo}>"