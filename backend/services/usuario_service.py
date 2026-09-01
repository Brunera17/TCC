from datetime import datetime, timedelta
from pathlib import Path
from typing import Optional

from flask import current_app
from werkzeug.utils import secure_filename

from config import db
from models.organizacional import Usuario
from repositories.usuario_repository import UsuarioRepository


class UsuarioService:

    FOTO_PERFIL_DIR = Path("foto de perfil")

    def __init__(self):
        self.repo = UsuarioRepository()

    @staticmethod
    def _clean_str(value: Optional[str], lower: bool = False) -> Optional[str]:
        if value is None:
            return None
        cleaned = value.strip()
        if not cleaned:
            return None
        return cleaned.lower() if lower else cleaned

    @staticmethod
    def _to_bool(value, default: bool = False) -> bool:
        if value is None:
            return default
        if isinstance(value, bool):
            return value
        if isinstance(value, str):
            return value.strip().lower() in {'1', 'true', 't', 'yes', 'sim'}
        return bool(value)

    def _build_usuario_payload(self, usuario: Usuario, data: dict) -> None:
        usuario.nome = self._clean_str(data.get('nome')) or usuario.nome
        usuario.email = self._clean_str(data.get('email'), lower=True) or usuario.email
        usuario.username = self._clean_str(data.get('username')) or usuario.username
        usuario.cpf = self._clean_str(data.get('cpf')) or usuario.cpf
        usuario.tipo_usuario = self._clean_str(data.get('tipo_usuario')) or usuario.tipo_usuario
        usuario.eh_gerente = self._to_bool(data.get('eh_gerente'), usuario.eh_gerente)
        usuario.cargo_id = data.get('cargo_id', usuario.cargo_id)
        usuario.status = self._clean_str(data.get('status')) or usuario.status
        if 'foto' in data:
            usuario.foto = data.get('foto')

    def _get_upload_root(self) -> Path:
        upload_root = current_app.config.get('UPLOAD_FOLDER')
        if not upload_root:
            raise ValueError("Diretório de upload não configurado")
        root_path = Path(upload_root)
        root_path.mkdir(parents=True, exist_ok=True)
        return root_path
    
    def get_all(self):
        """Listar todos os usuários ativos"""
        return self.repo.get_all()
    
    def get_by_id(self, usuario_id: int):
        """Buscar usuário por ID"""
        return self.repo.get_by_id(usuario_id)
    
    def get_by_username(self, username: str):
        return self.repo.get_by_username(username)
    
    def get_usuario_por_ultimo_login(self, dias: int):
        return self.repo.get_usuario_por_ultimo_login(dias)
    
    def criar_usuario(self, **data):
        """Criar novo usuário"""
        nome = self._clean_str(data.get('nome'))
        email = self._clean_str(data.get('email'), lower=True)
        username = self._clean_str(data.get('username'))
        senha = data.get('senha')
        tipo_usuario = self._clean_str(data.get('tipo_usuario')) or 'funcionario'
        cpf = self._clean_str(data.get('cpf'))

        if not nome:
            raise ValueError("Nome é obrigatório")
        if not email:
            raise ValueError("Email é obrigatório")
        if not username:
            raise ValueError("Username é obrigatório")
        if not senha:
            raise ValueError("Senha é obrigatória")

        existing_username = self.repo.get_by_username(username, include_inactive=True)
        existing_email = self.repo.get_by_email(email, include_inactive=True)
        existing_cpf = self.repo.get_by_cpf(cpf, include_inactive=True) if cpf else None

        candidates = [c for c in (existing_username, existing_email, existing_cpf) if c]
        target = None
        for candidate in candidates:
            if candidate.ativo:
                raise ValueError("Usuário já existe com os dados informados")
            if target and target.id != candidate.id:
                raise ValueError("Dados pertencem a registros diferentes; ajuste o cadastro")
            target = target or candidate

        if target:
            # Reativar usuário inativo reutilizando os dados
            update_data = {
                'nome': nome,
                'email': email,
                'username': username,
                'cpf': cpf,
                'tipo_usuario': tipo_usuario,
                'eh_gerente': self._to_bool(data.get('eh_gerente'), target.eh_gerente),
                'cargo_id': data.get('cargo_id', target.cargo_id),
                'foto': data.get('foto', target.foto),
                'status': data.get('status') or 'ativo'
            }
            self._build_usuario_payload(target, update_data)
            target.set_senha(senha)
            target.ativo = True
            target.deleted_at = None
            target.tentativas_login = 0
            target.bloqueado_ate = None
            target.updated_at = datetime.utcnow()
            db.session.commit()
            return target

        # Criar novo usuário
        usuario = Usuario(
            nome=nome,
            email=email,
            username=username,
            cpf=cpf,
            tipo_usuario=tipo_usuario,
            eh_gerente=self._to_bool(data.get('eh_gerente'), False),
            cargo_id=data.get('cargo_id'),
            foto=data.get('foto'),
            status=data.get('status') or 'ativo'
        )
        usuario.set_senha(senha)
        return self.repo.criar_usuario(usuario)
    
    def atualizar_usuario(self, usuario_id: int, **data):
        """Atualizar usuário"""
        usuario = self.repo.get_by_id(usuario_id, include_inactive=True)
        if not usuario or not usuario.ativo:
            raise ValueError("Usuário não encontrado")

        if 'username' in data and data['username']:
            novo_username = self._clean_str(data['username'])
            if novo_username:
                existente_username = self.repo.get_by_username(novo_username, include_inactive=True)
                if existente_username and existente_username.id != usuario.id:
                    raise ValueError("Username já está em uso")
                usuario.username = novo_username

        if 'email' in data and data['email'] is not None:
            novo_email = self._clean_str(data['email'], lower=True)
            if novo_email:
                existente_email = self.repo.get_by_email(novo_email, include_inactive=True)
                if existente_email and existente_email.id != usuario.id:
                    raise ValueError("Email já está em uso")
                usuario.email = novo_email

        if 'cpf' in data:
            novo_cpf = self._clean_str(data.get('cpf'))
            if novo_cpf:
                existente_cpf = self.repo.get_by_cpf(novo_cpf, include_inactive=True)
                if existente_cpf and existente_cpf.id != usuario.id:
                    raise ValueError("CPF já está em uso")
            usuario.cpf = novo_cpf

        usuario.nome = self._clean_str(data.get('nome')) or usuario.nome
        usuario.tipo_usuario = self._clean_str(data.get('tipo_usuario')) or usuario.tipo_usuario
        usuario.eh_gerente = self._to_bool(data.get('eh_gerente'), usuario.eh_gerente)
        usuario.cargo_id = data.get('cargo_id', usuario.cargo_id)
        usuario.status = self._clean_str(data.get('status')) or usuario.status
        if 'foto' in data:
            usuario.foto = data.get('foto')

        if data.get('senha'):
            usuario.set_senha(data['senha'])

        usuario.updated_at = datetime.utcnow()
        return self.repo.atualizar_usuario(usuario)

    def salvar_foto(self, usuario_id: int, arquivo) -> Usuario:
        usuario = self.repo.get_by_id(usuario_id, include_inactive=True)
        if not usuario or not usuario.ativo:
            raise ValueError("Usuário não encontrado")
        if not arquivo:
            raise ValueError("Arquivo de foto é obrigatório")

        upload_root = self._get_upload_root()
        foto_root = upload_root / self.FOTO_PERFIL_DIR
        usuario_dir = foto_root / str(usuario.id)
        usuario_dir.mkdir(parents=True, exist_ok=True)

        nome_arquivo = secure_filename(arquivo.filename or f"foto_{usuario.id}")
        if not nome_arquivo:
            nome_arquivo = f"foto_{usuario.id}"

        destino = usuario_dir / nome_arquivo

        if usuario.foto:
            antigo = upload_root / usuario.foto
            if antigo.exists() and antigo.resolve() != destino.resolve():
                try:
                    antigo.unlink()
                except OSError:
                    pass
                pasta_antiga = antigo.parent
                try:
                    if pasta_antiga.exists() and not any(pasta_antiga.iterdir()):
                        pasta_antiga.rmdir()
                except OSError:
                    pass
        arquivo.save(str(destino))

        relativo = self.FOTO_PERFIL_DIR / str(usuario.id) / nome_arquivo
        usuario.foto = relativo.as_posix()
        usuario.updated_at = datetime.utcnow()
        return self.repo.atualizar_usuario(usuario)

    def remover_foto(self, usuario_id: int) -> Usuario:
        usuario = self.repo.get_by_id(usuario_id, include_inactive=True)
        if not usuario or not usuario.ativo:
            raise ValueError("Usuário não encontrado")

        if usuario.foto:
            upload_root = self._get_upload_root()
            arquivo_atual = upload_root / usuario.foto
            if arquivo_atual.exists():
                arquivo_atual.unlink()
            pasta_usuario = arquivo_atual.parent
            try:
                if pasta_usuario.exists() and not any(pasta_usuario.iterdir()):
                    pasta_usuario.rmdir()
            except OSError:
                pass

        usuario.foto = None
        usuario.updated_at = datetime.utcnow()
        return self.repo.atualizar_usuario(usuario)
    
    def deletar_usuario(self, usuario_id: int):
        """Deletar usuário (soft delete)"""
        usuario = self.repo.get_by_id(usuario_id)
        if not usuario:
            raise ValueError("Usuário não encontrado")
        self.repo.deletar_usuario(usuario)
    
    def alterar_senha(self, usuario_id: int, senha_atual: str, nova_senha: str):
        usuario = self.repo.get_by_id(usuario_id)
        if not usuario:
            raise ValueError("Usuário não encontrado")
        if not usuario.verificar_senha(senha_atual):
            raise ValueError("Senha atual incorreta")
        usuario.set_senha(nova_senha)
        self.repo.atualizar_usuario(usuario)
        return usuario
    
    def autenticar_usuario(self, identificador: str, senha: str):
        """Autentica um usuário por username, email ou CPF.

        Implementação única de login: consolida o que antes eram três
        funções quase duplicadas (autenticar_usuario, validar_credenciais
        e validar_credenciais_por_email). Levanta ValueError em qualquer
        falha — usuário não encontrado ou senha incorreta usam a mesma
        mensagem genérica para não revelar qual identificador existe;
        conta bloqueada usa uma mensagem específica.
        """
        identificador_limpo = self._clean_str(identificador)
        if not identificador_limpo or not senha:
            raise ValueError("Identificador e senha são obrigatórios")

        usuario = (
            self.repo.get_by_username(identificador_limpo)
            or self.repo.get_by_email(identificador_limpo)
            or self.repo.get_by_cpf(identificador_limpo)
        )
        if not usuario:
            raise ValueError("Credenciais inválidas")

        if usuario.bloqueado_ate and usuario.bloqueado_ate > datetime.utcnow():
            raise ValueError("Usuário bloqueado")

        if not usuario.verificar_senha(senha):
            usuario.tentativas_login += 1
            if usuario.tentativas_login >= 3:
                self.repo.bloquear_usuario(usuario, 1)
                raise ValueError("Usuário bloqueado")
            self.repo.atualizar_usuario(usuario)
            raise ValueError("Credenciais inválidas")

        usuario.tentativas_login = 0
        usuario.ultimo_login = datetime.utcnow()
        self.repo.atualizar_usuario(usuario)
        return usuario

    def search_by_name_or_email(self, termo: str):
        termo_limpo = self._clean_str(termo)
        if not termo_limpo or len(termo_limpo) < 2:
            raise ValueError("Termo deve ter pelo menos 2 caracteres")
        return self.repo.search_by_name_or_email(termo_limpo)

    def usuario_eh_admin(self, usuario_id):
        """Verificar se usuário é admin"""
        try:
            usuario = Usuario.query.get(usuario_id)
            return usuario and (usuario.eh_gerente or usuario.tipo_usuario == 'admin')
        except:
            return False

    # Métodos auxiliares

