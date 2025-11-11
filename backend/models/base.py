""" Mixins para modelos de dados """
from datetime import datetime
from config import db
from datetime import timezone, timedelta

class TimestampMixin:
    """ Mixin para adicionar timestamps aos modelos """
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    deleted_at = db.Column(db.DateTime, nullable=True)
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


def format_datetime_to_utc_iso(dt: datetime | None) -> str | None:
    """Retorna ISO string em UTC com sufixo 'Z'.

    Se o datetime for ingênuo (naive), assume-se que representa UTC e então é normalizado.
    Retorna uma string no formato RFC3339 com 'Z' para indicar UTC.
    """
    if not dt:
        return None

    try:
        if dt.tzinfo is None:
            # assume UTC quando datetime for ingênuo
            dt = dt.replace(tzinfo=timezone.utc)

        utc_dt = dt.astimezone(timezone.utc)
        iso = utc_dt.isoformat()
        # Garantir sufixo Z em vez de +00:00 para consistência
        if iso.endswith('+00:00'):
            iso = iso[:-6] + 'Z'
        return iso
    except Exception:
        try:
            iso = dt.isoformat()
            if iso.endswith('+00:00'):
                iso = iso[:-6] + 'Z'
            return iso
        except Exception:
            return None