""" Mixins para modelos de dados """
from datetime import datetime
from config import db

class TimestampMixin:
    """ Mixin para adicionar timestamps aos modelos """
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
class ActiveMixin:
    """ Mixin para adicionar campo de ativo aos modelos """
    ativo = db.Column(db.Boolean, default=True, nullable=False, index=True)

    @classmethod
    def ativos(cls):
        return cls.query.filter_by(ativo=True)
    def desativar(self):
        if not self.ativo:
            raise Exception("Registro já está desativado")
        try:    
            self.ativo = False
            self.updated_at = datetime.utcnow()
            db.session.commit()
        except Exception as e:
            db.session.rollback()
            raise Exception(f"Erro ao desativar: {str(e)}")
    def ativar(self):
        if self.ativo:
            raise Exception("Registro já está ativo")
        try:
            self.ativo = True
            self.updated_at = datetime.utcnow()
            db.session.commit()
        except Exception as e:
            db.session.rollback()
            raise Exception(f"Erro ao ativar: {str(e)}")