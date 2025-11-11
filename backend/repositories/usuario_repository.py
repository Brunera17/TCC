from datetime import datetime, timedelta

from sqlalchemy import or_

from config import db
from models.organizacional import Usuario

class UsuarioRepository:

    def get_all(self):
        return Usuario.query.filter_by(ativo=True).all()
    
    def get_by_id(self, usuario_id, include_inactive: bool = False):
        query = Usuario.query.filter_by(id=usuario_id)
        if not include_inactive:
            query = query.filter_by(ativo=True)
        return query.first()

    def get_by_username(self, username: str, include_inactive: bool = False):
        query = Usuario.query.filter_by(username=username)
        if not include_inactive:
            query = query.filter_by(ativo=True)
        return query.first()

    def get_by_email(self, email: str, include_inactive: bool = False):
        query = Usuario.query.filter_by(email=email)
        if not include_inactive:
            query = query.filter_by(ativo=True)
        return query.first()

    def get_by_cpf(self, cpf: str, include_inactive: bool = False):
        query = Usuario.query.filter_by(cpf=cpf)
        if not include_inactive:
            query = query.filter_by(ativo=True)
        return query.first()
    
    def get_usuario_por_ultimo_login(self, dias: int):
        data_limite = datetime.utcnow() - timedelta(days=dias)
        return Usuario.query.filter(
            Usuario.ultimo_login >= data_limite,
            Usuario.ativo == True
        ).all()
    
    def criar_usuario(self, usuario: Usuario):
        db.session.add(usuario)
        db.session.commit()
        return usuario

    def atualizar_usuario(self, usuario: Usuario):
        db.session.commit()
        return usuario
    
    def deletar_usuario(self, usuario: Usuario):
        usuario.ativo = False
        usuario.deleted_at = datetime.utcnow()
        db.session.commit()
        return usuario
    
    def bloquear_usuario(self, usuario: Usuario, dias: int):
        usuario.bloqueado_ate = datetime.utcnow() + timedelta(days=dias)
        usuario.tentativas_login = 0
        db.session.commit()
        return usuario
    
    def desbloquear_usuario(self, usuario: Usuario):
        usuario.bloqueado_ate = None
        db.session.commit()
    
    def verificar_usuario_existe(self, username: str, exclude_id: int = None):
        query = Usuario.query.filter_by(username=username, ativo=True)
        if exclude_id:
            query = query.filter(Usuario.id != exclude_id)
        return query.first() is not None

    def search_by_name_or_email(self, termo: str):
        like = f"%{termo}%"
        return Usuario.query.filter(
            Usuario.ativo == True,
            or_(
                Usuario.nome.ilike(like),
                Usuario.email.ilike(like),
                Usuario.username.ilike(like)
            )
        ).all()