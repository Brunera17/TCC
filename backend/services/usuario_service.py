from repositories.usuario_repository import UsuarioRepository
from models.usuario import Usuario
from models.funcionario import Funcionario
from repositories.funcionario_repository import FuncionarioRepository
import re

class UsuarioService:

    def __init__(self):
        self.repo = UsuarioRepository()
        self.repo_funcionario = FuncionarioRepository()
    
    def get_all(self):
        return self.repo.get_all()
    
    def get_by_id(self, usuario_id: int):
        return self.repo.get_by_id(usuario_id)
    
    def get_by_username(self, username: str):
        return self.repo.get_by_username(username)
    
    def get_usuario_por_ultimo_login(self, dias: int):
        return self.repo.get_usuario_por_ultimo_login(dias)
    
    def criar_usuario(self, **data):
        if not data.get('username'):
            raise ValueError("Username é obrigatório")
        if not data.get('senha'):
            raise ValueError("Senha é obrigatória")
        if not data.get('tipo_usuario'):
            raise ValueError("Tipo de usuário é obrigatório")
        
        if self.repo.verificar_username_existe(data['username']):
            raise ValueError("Username já existe")
        
        usuario = Usuario(**data)
        self.repo.criar_usuario(usuario)
        return usuario
    
    def atualizar_usuario(self, usuario_id: int, **data):
        usuario = self.repo.get_by_id(usuario_id)
        if not usuario:
            raise ValueError("Usuário não encontrado")
        
        if self.repo.verificar_username_existe(data['username'], usuario_id):
            raise ValueError("Username já existe")
        
        usuario.username = data.get('username', usuario.username)
        usuario.senha = data.get('senha', usuario.senha)
        usuario.tipo_usuario = data.get('tipo_usuario', usuario.tipo_usuario)
        self.repo.atualizar_usuario(usuario)
        return usuario
    
    def deletar_usuario(self, usuario_id: int):
        usuario = self.repo.get_by_id(usuario_id)
        if not usuario:
            raise ValueError("Usuário não encontrado")
        self.repo.deletar_usuario(usuario)
        return usuario
    
    def alterar_senha(self, usuario_id: int, senha_atual: str, nova_senha: str):
        usuario = self.repo.get_by_id(usuario_id)
        if not usuario:
            raise ValueError("Usuário não encontrado")
        if not usuario.check_password(senha_atual):
            raise ValueError("Senha atual incorreta")
        usuario.set_password(nova_senha)
        self.repo.atualizar_usuario(usuario)
        return usuario
    def autenticar_usuario(self, username: str, senha: str):
        usuario = self.repo.get_by_username(username)
        if not usuario:
            raise ValueError("Usuário não encontrado")
        if not usuario.check_password(senha):
            usuario.tentativas_login += 1
            if usuario.tentativas_login >= 3:
                self.repo.bloquear_usuario(usuario, 1)
                raise ValueError("Usuário bloqueado")
        usuario.ultimo_login = datetime.utcnow()
        self.repo.atualizar_usuario(usuario)
        return usuario
        
    