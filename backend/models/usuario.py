from config import db
from models.base import TimestampMixin, ActiveMixin

class Usuario(db.Model, TimestampMixin, ActiveMixin):
    """ Modelo para representar um usuário """
    __tablename__ = 'usuarios'

    id = db.Column(db.Integer, primary_key=True)
    username = db.Column(db.String(100), nullable=False, unique=True, index=True)
    email = db.Column(db.String(100), nullable=False, unique=True, index=True)
    senha_hash = db.Column(db.String(100), nullable=False)
    tipo_usuario = db.Column(db.String(100), nullable=False)
    
    # Relacionamentos
    funcionario_id = db.Column(db.Integer, db.ForeignKey('funcionarios.id', ondelete='CASCADE'), nullable=True, index=True)
    nome_completo = db.Column(db.String(100), nullable=True) 
    funcionario = db.relationship('Funcionario', back_populates='usuario', uselist=False)

    def verificar_senha(self, senha):
        pass
    def alterar_senha(self, nova_senha):
        pass