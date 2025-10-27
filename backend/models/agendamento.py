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
    data_inicio = db.Column(db.DateTime, nullable=False, index=True)
    data_fim = db.Column(db.DateTime, nullable=False, index=True)
    descricao = db.Column(db.Text, nullable=True)
    tipo = db.Column(db.String(50), nullable=True)
    status = db.Column(db.String(50), default='pendente')
    destinatario = db.Column(db.String(150), nullable=True)
    local = db.Column(db.String(255), nullable=True)
    prioridade = db.Column(db.String(20), default='normal')
    
    # Chave estrangeira para o funcionário
    funcionario_id = db.Column(db.Integer, db.ForeignKey('funcionarios.id', ondelete='CASCADE'), nullable=False, index=True)
    
    # Relacionamentos
    funcionario = db.relationship('Usuario', back_populates='agendamentos', lazy='joined')
    
    # Validadores
    @validates('titulo')
    def validar_titulo(self, key, titulo):
        if not titulo or len(titulo.strip()) == 0:
            raise ValueError("Título não pode ser vazio")
        if len(titulo) > 200:
            raise ValueError("Título deve ter no máximo 200 caracteres")
        return titulo.strip()

    @validates('data_inicio')
    def validar_data_inicio(self, key, data_inicio):
        if not data_inicio:
            raise ValueError("Data de início não pode ser vazia")
        return data_inicio

    @validates('data_fim')
    def validar_data_fim(self, key, data_fim):
        if not data_fim:
            raise ValueError("Data de fim não pode ser vazia")
        return data_fim

    @validates('status')
    def validar_status(self, key, status):
        status_validos = ['pendente', 'confirmado', 'em_andamento', 'concluido', 'cancelado', 'adiado']
        if status not in status_validos:
            raise ValueError(f"Status deve ser um dos seguintes: {', '.join(status_validos)}")
        return status

    @validates('prioridade')
    def validar_prioridade(self, key, prioridade):
        prioridades_validas = ['baixa', 'normal', 'alta', 'urgente']
        if prioridade not in prioridades_validas:
            raise ValueError(f"Prioridade deve ser uma das seguintes: {', '.join(prioridades_validas)}")
        return prioridade

    @validates('destinatario')
    def validar_destinatario(self, key, destinatario):
        if destinatario and (len(destinatario.strip()) < 3 or len(destinatario) > 150):
            raise ValueError("Destinatário deve ter entre 3 e 150 caracteres")
        return destinatario.strip() if destinatario else None

    @validates('tipo')
    def validar_tipo(self, key, tipo):
        if tipo:
            tipos_validos = ['reuniao', 'compromisso', 'tarefa', 'evento', 'ligacao', 'visita', 'outro']
            if tipo not in tipos_validos:
                raise ValueError(f"Tipo deve ser um dos seguintes: {', '.join(tipos_validos)}")
        return tipo

    # Método para validar consistência de datas
    def validar_datas(self):
        """Valida se a data de fim é posterior à data de início"""
        if self.data_inicio and self.data_fim and self.data_fim <= self.data_inicio:
            raise ValueError("Data de fim deve ser posterior à data de início")

    # Método para verificar se o agendamento está no futuro
    def is_futuro(self):
        """Verifica se o agendamento é no futuro"""
        return self.data_inicio > datetime.utcnow() if self.data_inicio else False

    # Método para verificar se o agendamento está ativo
    def is_ativo(self):
        """Verifica se o agendamento está em status ativo"""
        return self.status in ['pendente', 'confirmado', 'em_andamento']

    # Método para calcular duração
    def duracao_minutos(self):
        """Calcula a duração do agendamento em minutos"""
        if self.data_inicio and self.data_fim:
            delta = self.data_fim - self.data_inicio
            return int(delta.total_seconds() / 60)
        return 0

    def to_json(self):
        return {
            'id': self.id,
            'titulo': self.titulo,
            'data_inicio': self.data_inicio.isoformat() if self.data_inicio else None,
            'data_fim': self.data_fim.isoformat() if self.data_fim else None,
            'descricao': self.descricao,
            'tipo': self.tipo,
            'status': self.status,
            'destinatario': self.destinatario,
            'local': self.local,
            'prioridade': self.prioridade,
            'funcionario_id': self.funcionario_id,
            'funcionario': self.funcionario.to_json() if self.funcionario and self.funcionario.ativo else None,
            'created_at': self.created_at.isoformat(),
            'updated_at': self.updated_at.isoformat(),
            'deleted_at': self.deleted_at.isoformat() if self.deleted_at else None,
            'ativo': self.ativo
        }
    
    def __repr__(self):
        return f"<Agendamento {self.titulo} - {self.data_inicio.strftime('%d/%m/%Y %H:%M') if self.data_inicio else 'N/A'}>"