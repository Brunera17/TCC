from repositories.usuario_repository import UsuarioRepository
from models.organizacional import Usuario
from datetime import datetime, timedelta
from config import db

class UsuarioService:

    def __init__(self):
        self.repo = UsuarioRepository()
    
    def get_all(self):
        """Listar todos os usuários ativos"""
        return Usuario.query.filter_by(ativo=True).all()
    
    def get_by_id(self, usuario_id: int):
        """Buscar usuário por ID"""
        return Usuario.query.filter_by(id=usuario_id, ativo=True).first()
    
    def get_by_username(self, username: str):
        return self.repo.get_by_username(username)
    
    def get_usuario_por_ultimo_login(self, dias: int):
        return self.repo.get_usuario_por_ultimo_login(dias)
    
    def criar_usuario(self, **data):
        """Criar novo usuário"""
        if not data.get('username'):
            raise ValueError("Username é obrigatório")
        if not data.get('senha'):
            raise ValueError("Senha é obrigatória")
        if not data.get('tipo_usuario'):
            raise ValueError("Tipo de usuário é obrigatório")
        
        if self.repo.verificar_usuario_existe(data['username']):
            raise ValueError("Username já existe")
        
        usuario = Usuario(**data)
        self.repo.criar_usuario(usuario)
        return usuario
    
    def atualizar_usuario(self, usuario_id: int, **data):
        """Atualizar usuário"""
        usuario = self.repo.get_by_id(usuario_id)
        if not usuario:
            raise ValueError("Usuário não encontrado")
        
        if 'username' in data and self.repo.verificar_usuario_existe(data['username'], usuario_id):
            raise ValueError("Username já existe")
        
        # Atualizar campos permitidos
        usuario.nome = data.get('nome', usuario.nome)
        usuario.username = data.get('username', usuario.username)
        usuario.email = data.get('email', usuario.email)
        usuario.cpf = data.get('cpf', usuario.cpf)
        usuario.tipo_usuario = data.get('tipo_usuario', usuario.tipo_usuario)
        usuario.eh_gerente = data.get('eh_gerente', usuario.eh_gerente)
        usuario.cargo_id = data.get('cargo_id', usuario.cargo_id)
        
        if 'senha' in data:
            usuario.set_senha(data['senha'])
        self.repo.atualizar_usuario(usuario)
        return usuario
    
    def deletar_usuario(self, usuario_id: int):
        """Deletar usuário (soft delete)"""
        usuario = self.get_by_id(usuario_id)
        if usuario:
            usuario.ativo = False
            db.session.commit()
    
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
    
    def validar_credenciais(self, identificador, senha):
        """Validar credenciais usando email, username ou CPF"""
        try:
            print(f"Tentando login com identificador: {identificador}")
            
            # Tentar buscar por username primeiro
            usuario = Usuario.query.filter_by(username=identificador, ativo=True).first()
            
            # Se não encontrou por username, tentar por email
            if not usuario:
                usuario = Usuario.query.filter_by(email=identificador, ativo=True).first()
            
            # Se não encontrou por email, tentar por CPF
            if not usuario:
                usuario = Usuario.query.filter_by(cpf=identificador, ativo=True).first()
            
            if not usuario:
                print("Usuário não encontrado")
                return None
            
            # Verificar se a senha está correta
            if not usuario.verificar_senha(senha):
                print("Senha incorreta")
                return None
            
            print(f"Login realizado com sucesso para: {usuario.email}")
            
            # Verificar se não está bloqueado
            if usuario.bloqueado_ate and usuario.bloqueado_ate > datetime.utcnow():
                raise ValueError("Usuário bloqueado")
            
            # Atualizar último login
            usuario.ultimo_login = datetime.utcnow()
            usuario.tentativas_login = 0
            db.session.commit()
            
            return usuario
            
        except Exception as e:
            print(f"Erro na validação de credenciais: {str(e)}")
            return None

    def validar_credenciais_por_email(self, identificador, senha):
        """Validar credenciais usando email OU username"""
        try:
            print(f"Tentando login com identificador: {identificador}")
            
            # Tentar buscar por email primeiro
            usuario = Usuario.query.filter_by(email=identificador, ativo=True).first()
            
            # Se não encontrou por email, tentar por username
            if not usuario:
                usuario = Usuario.query.filter_by(username=identificador, ativo=True).first()
            
            if not usuario:
                print("Usuário não encontrado")
                return None
            
            print(f"Usuário encontrado: {usuario.nome}")
            
            # Verificar senha
            if not usuario.verificar_senha(senha):
                print("Senha incorreta")
                return None
            
            print("Login bem-sucedido")
            # Atualizar último login
            usuario.ultimo_login = datetime.utcnow()
            usuario.tentativas_login = 0
            db.session.commit()
            
            return usuario
            
        except Exception as e:
            print(f"Erro na validação: {e}")
            return None
    
    def usuario_eh_admin(self, usuario_id):
        """Verificar se usuário é admin"""
        try:
            usuario = Usuario.query.get(usuario_id)
            return usuario and (usuario.eh_gerente or usuario.tipo_usuario == 'admin')
        except:
            return False

