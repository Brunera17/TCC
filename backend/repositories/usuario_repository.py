from config import db
from models.usuario import Usuario
from datetime import datetime, timedelta

class UsuarioRepository:

    def get_all(self):
        return Usuario.query.filter_by(ativo=True).all()
    
    def get_by_id(self, usuario_id):
        return Usuario.query.filter_by(id=usuario_id, ativo=True).first()
    
    def get_usuario_por_ultimo_login(self, dias: int):
        data_limite = datetime.utcnow() - timedelta(days=dias)
        return Usuario.query.filter(
            Usuario.ultimo_login >= data_limite,
            Usuario.ativo == True
        ).all()
    
    def criar_usuario(self, usuario: Usuario):
        usuario = Usuario(usuario)
        db.session.add(usuario)
        db.session.commit()
    def atualizar_usuario(self, usuario: Usuario):
        db.session.commit()
        return usuario
    
    def deletar_usuario(self, usuario: Usuario):
        usuario.ativo = False
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
    
    def verificar_usuario_existe(self, cpf: str, exclude_id: int = None):
        query = Usuario.query.filter_by(cpf=cpf, ativo=True)
        if exclude_id:
            query = query.filter(Usuario.id != exclude_id)
        return query.first() is not None