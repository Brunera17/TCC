"""
Testes de regressão para garantir que toda rota da API exige autenticação.

Este teste percorre o url_map do Flask em vez de listar rotas manualmente,
para que uma rota nova adicionada sem @token_obrigatorio (ou equivalente)
seja pega automaticamente, sem precisar lembrar de atualizar este arquivo.
"""
import re

import pytest

# Endpoints intencionalmente públicos ou de autenticação opcional.
# Qualquer endpoint fora desta lista deve responder 401 sem token.
ENDPOINTS_PUBLICOS = {
    'home',
    'health',
    'static',
    'usuario.login',
    'usuario.criar_usuario',
    'usuario.refresh_token',
}

# Autenticação opcional: aceita requisições sem token (retorna dados
# limitados), não deve ser tratado como "esquecido".
ENDPOINTS_AUTENTICACAO_OPCIONAL = {
    'usuario.get_usuario_por_username',
}

IGNORAR_METODOS = {'HEAD', 'OPTIONS'}


def _preencher_placeholders(regra: str) -> str:
    """Substitui <int:x>, <string:x>, <path:x>, <x> por valores fictícios."""
    def repl(match):
        return '1' if match.group(1) == 'int' else 'x'

    return re.sub(r'<(?:(\w+):)?\w+>', repl, regra)


def _rotas_protegidas(flask_app):
    rotas = []
    for rule in flask_app.url_map.iter_rules():
        if rule.endpoint in ENDPOINTS_PUBLICOS or rule.endpoint in ENDPOINTS_AUTENTICACAO_OPCIONAL:
            continue
        caminho = _preencher_placeholders(rule.rule)
        for metodo in sorted(rule.methods - IGNORAR_METODOS):
            rotas.append(pytest.param(metodo, caminho, rule.endpoint, id=f'{rule.endpoint}:{metodo}'))
    return rotas


@pytest.fixture(scope='session')
def rotas_para_testar(flask_app):
    return _rotas_protegidas(flask_app)


def test_todas_as_rotas_exigem_token(flask_app):
    """
    Falha se alguma rota (fora da lista de públicas/opcionais) responder
    algo diferente de 401 quando chamada sem header Authorization.
    """
    client = flask_app.test_client()
    sem_protecao = []

    for rule in flask_app.url_map.iter_rules():
        if rule.endpoint in ENDPOINTS_PUBLICOS or rule.endpoint in ENDPOINTS_AUTENTICACAO_OPCIONAL:
            continue

        caminho = _preencher_placeholders(rule.rule)
        for metodo in sorted(rule.methods - IGNORAR_METODOS):
            resposta = client.open(caminho, method=metodo)
            if resposta.status_code != 401:
                sem_protecao.append(f'{rule.endpoint} [{metodo} {caminho}] -> {resposta.status_code}')

    assert not sem_protecao, (
        'As seguintes rotas aceitaram requisição sem token de autenticação '
        '(esperado 401). Adicione @token_obrigatorio (ou @gerente_requerido) '
        'a elas, ou inclua-as explicitamente em ENDPOINTS_PUBLICOS / '
        'ENDPOINTS_AUTENTICACAO_OPCIONAL neste arquivo se forem '
        f'intencionalmente públicas:\n' + '\n'.join(sem_protecao)
    )


def test_login_nao_exige_token(client):
    """Sanity check: rotas públicas continuam acessíveis sem token."""
    resposta = client.post('/api/usuarios/login', json={})
    assert resposta.status_code != 401


def test_username_lookup_aceita_requisicao_sem_token(client):
    """Sanity check: autenticação opcional não bloqueia acesso anônimo."""
    resposta = client.get('/api/usuarios/username/inexistente')
    assert resposta.status_code != 401
