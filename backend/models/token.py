# Em models/base.py ou models/token.py
from config import db
from datetime import datetime

class ActiveRefreshToken(db.Model):
    __tablename__ = 'active_refresh_tokens'

    id = db.Column(db.Integer, primary_key=True)
    jti = db.Column(db.String(36), unique=True, nullable=False, index=True) # JTI do token
    user_id = db.Column(db.Integer, db.ForeignKey('funcionarios.id', ondelete='CASCADE'), nullable=False, index=True) # Assumindo que a tabela de usuários é 'funcionarios'
    expires_at = db.Column(db.DateTime, nullable=False) # Data de expiração do token
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    # Relacionamento opcional, se precisar buscar tokens por usuário
    # user = db.relationship('Usuario', backref=db.backref('active_refresh_tokens', lazy=True))

    def __repr__(self):
        return f"<ActiveRefreshToken jti={self.jti} user_id={self.user_id}>"

# Não esqueça de importar este modelo no seu models/__init__.py se criou um novo arquivo
# e de gerar a migração no banco de dados (ex: com Flask-Migrate: flask db migrate -m "Add active refresh token table", flask db upgrade)