"""
Testes para UsuarioService.autenticar_usuario, a implementação única de
login que substitui as três funções quase duplicadas que existiam antes
(autenticar_usuario, validar_credenciais e validar_credenciais_por_email).
"""
import uuid

import pytest

from services.usuario_service import UsuarioService


@pytest.fixture()
def service():
    return UsuarioService()


@pytest.fixture()
def usuario(app_context, service):
    """Cria um usuário de teste com dados únicos e senha conhecida."""
    sufixo = uuid.uuid4().hex[:8]
    dados = {
        'nome': f'Usuario Teste {sufixo}',
        'email': f'teste.{sufixo}@example.com',
        'username': f'user_{sufixo}',
        'cpf': str(uuid.uuid4().int)[:11],
        'senha': 'senha_correta_123',
    }
    return service.criar_usuario(**dados), dados


def test_login_com_username_e_senha_correta(app_context, service, usuario):
    criado, dados = usuario
    autenticado = service.autenticar_usuario(dados['username'], dados['senha'])
    assert autenticado.id == criado.id
    assert autenticado.tentativas_login == 0
    assert autenticado.ultimo_login is not None


def test_login_com_email(app_context, service, usuario):
    criado, dados = usuario
    autenticado = service.autenticar_usuario(dados['email'], dados['senha'])
    assert autenticado.id == criado.id


def test_login_com_cpf(app_context, service, usuario):
    criado, dados = usuario
    autenticado = service.autenticar_usuario(dados['cpf'], dados['senha'])
    assert autenticado.id == criado.id


def test_login_com_senha_errada_nao_autentica(app_context, service, usuario):
    _, dados = usuario
    with pytest.raises(ValueError):
        service.autenticar_usuario(dados['username'], 'senha_errada')


def test_login_com_usuario_inexistente_nao_autentica(app_context, service):
    with pytest.raises(ValueError):
        service.autenticar_usuario('usuario_que_nao_existe', 'qualquer_senha')


def test_senha_errada_repetida_bloqueia_apos_3_tentativas(app_context, service, usuario):
    criado, dados = usuario

    for _ in range(2):
        with pytest.raises(ValueError, match='Credenciais inválidas'):
            service.autenticar_usuario(dados['username'], 'senha_errada')

    with pytest.raises(ValueError, match='Usuário bloqueado'):
        service.autenticar_usuario(dados['username'], 'senha_errada')

    # Mesmo com a senha correta, a conta permanece bloqueada.
    with pytest.raises(ValueError, match='Usuário bloqueado'):
        service.autenticar_usuario(dados['username'], dados['senha'])
