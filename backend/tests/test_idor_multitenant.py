"""
Testes de regressão para o escopo multi-tenant por empresa (issue #13).

Antes desta correção, `Cliente`, `Proposta`, `Servico`, `Agendamento` e
`EntidadeJuridica` não tinham nenhum vínculo com `Empresa`: qualquer usuário
autenticado conseguia ler/alterar dados de clientes de qualquer empresa
cadastrada. Estes testes recriam esse cenário (duas empresas com seus
próprios usuários) e verificam que um usuário de uma empresa não consegue
acessar dados da outra, enquanto administradores continuam com acesso total.
"""
import uuid

import pytest

from config import db
from models.organizacional import Empresa, Departamento, Cargo, Usuario
from middleware.autenticacao_middleware import gerar_tokens


def _criar_usuario_empresa(sufixo: str, tipo_usuario: str = 'funcionario', eh_gerente: bool = False):
    empresa = Empresa(nome=f'Empresa {sufixo}', cnpj=str(uuid.uuid4().int)[:14], email=f'empresa{sufixo}@example.com')
    db.session.add(empresa)
    db.session.flush()

    departamento = Departamento(nome=f'Depto {sufixo}', empresa_id=empresa.id)
    db.session.add(departamento)
    db.session.flush()

    cargo = Cargo(nome=f'Cargo {sufixo}', departamento_id=departamento.id)
    db.session.add(cargo)
    db.session.flush()

    usuario = Usuario(
        nome=f'Usuario {sufixo}',
        email=f'user{sufixo}@example.com',
        username=f'user{sufixo}',
        cpf=str(uuid.uuid4().int)[:11],
        tipo_usuario=tipo_usuario,
        eh_gerente=eh_gerente,
        cargo_id=cargo.id,
    )
    usuario.set_senha('senha123456')
    db.session.add(usuario)
    db.session.commit()

    return empresa, usuario


def _auth_headers(usuario) -> dict:
    access_token, _ = gerar_tokens(usuario)
    return {'Authorization': f'Bearer {access_token}'}


@pytest.fixture()
def cenario(app_context):
    sufixo = uuid.uuid4().hex[:8]
    empresa_a, usuario_a = _criar_usuario_empresa(f'A{sufixo}')
    empresa_b, usuario_b = _criar_usuario_empresa(f'B{sufixo}')
    _empresa_admin, usuario_admin = _criar_usuario_empresa(f'ADM{sufixo}', tipo_usuario='admin')

    return {
        'empresa_a': empresa_a,
        'headers_a': _auth_headers(usuario_a),
        'empresa_b': empresa_b,
        'headers_b': _auth_headers(usuario_b),
        'headers_admin': _auth_headers(usuario_admin),
    }


def _criar_cliente(client, headers, sufixo):
    resp = client.post('/api/clientes/', json={
        'nome': f'Cliente {sufixo}',
        'cpf': str(uuid.uuid4().int)[:11],
        'email': f'cliente{sufixo}@example.com',
    }, headers=headers)
    assert resp.status_code == 201, resp.get_json()
    return resp.get_json()


def test_cliente_criado_herda_empresa_do_usuario(client, cenario):
    dados = _criar_cliente(client, cenario['headers_a'], uuid.uuid4().hex[:6])
    assert dados['empresa_id'] == cenario['empresa_a'].id


def test_cliente_de_outra_empresa_nao_e_visivel(client, cenario):
    cliente_a = _criar_cliente(client, cenario['headers_a'], uuid.uuid4().hex[:6])

    # Empresa B não pode ler o cliente de A.
    resp_b = client.get(f"/api/clientes/{cliente_a['id']}", headers=cenario['headers_b'])
    assert resp_b.status_code == 403

    # A própria empresa A continua enxergando.
    resp_a = client.get(f"/api/clientes/{cliente_a['id']}", headers=cenario['headers_a'])
    assert resp_a.status_code == 200

    # Administrador enxerga qualquer empresa.
    resp_admin = client.get(f"/api/clientes/{cliente_a['id']}", headers=cenario['headers_admin'])
    assert resp_admin.status_code == 200


def test_listagem_de_clientes_e_filtrada_por_empresa(client, cenario):
    cliente_a = _criar_cliente(client, cenario['headers_a'], uuid.uuid4().hex[:6])

    lista_b = client.get('/api/clientes/', headers=cenario['headers_b']).get_json()
    assert all(c['id'] != cliente_a['id'] for c in lista_b)

    lista_a = client.get('/api/clientes/', headers=cenario['headers_a']).get_json()
    assert any(c['id'] == cliente_a['id'] for c in lista_a)

    lista_admin = client.get('/api/clientes/', headers=cenario['headers_admin']).get_json()
    assert any(c['id'] == cliente_a['id'] for c in lista_admin)


def test_cliente_de_outra_empresa_nao_pode_ser_alterado_ou_removido(client, cenario):
    cliente_a = _criar_cliente(client, cenario['headers_a'], uuid.uuid4().hex[:6])

    resp_put = client.put(f"/api/clientes/{cliente_a['id']}", json={'nome': 'Nome Alterado'}, headers=cenario['headers_b'])
    assert resp_put.status_code == 403

    resp_delete = client.delete(f"/api/clientes/{cliente_a['id']}", headers=cenario['headers_b'])
    assert resp_delete.status_code == 403


def test_nao_admin_nao_consegue_criar_cliente_para_outra_empresa(client, cenario):
    resp = client.post('/api/clientes/', json={
        'nome': 'Cliente Forjado',
        'cpf': str(uuid.uuid4().int)[:11],
        'email': f'forjado{uuid.uuid4().hex[:6]}@example.com',
        'empresa_id': cenario['empresa_b'].id,
    }, headers=cenario['headers_a'])
    assert resp.status_code == 403


def test_servico_e_escopado_por_empresa(client, cenario):
    resp = client.post('/api/servicos/', json={
        'nome': f'Servico {uuid.uuid4().hex[:6]}',
        'valor_unitario': 100.0,
    }, headers=cenario['headers_a'])
    assert resp.status_code == 201, resp.get_json()
    servico = resp.get_json()
    assert servico['empresa_id'] == cenario['empresa_a'].id

    resp_b = client.get(f"/api/servicos/{servico['id']}", headers=cenario['headers_b'])
    assert resp_b.status_code == 403

    lista_b = client.get('/api/servicos/', headers=cenario['headers_b']).get_json()
    assert all(s['id'] != servico['id'] for s in lista_b)


def test_proposta_herda_empresa_do_cliente_e_bloqueia_cliente_de_outra_empresa(client, cenario):
    cliente_a = _criar_cliente(client, cenario['headers_a'], uuid.uuid4().hex[:6])

    # Usuário B tenta criar proposta para um cliente que pertence à empresa A.
    resp_forjado = client.post('/api/propostas/', json={
        'cliente_id': cliente_a['id'],
        'itens': [],
    }, headers=cenario['headers_b'])
    assert resp_forjado.status_code == 403

    # Usuário A (dono do cliente) cria normalmente e a proposta herda a empresa do cliente.
    resp_ok = client.post('/api/propostas/', json={
        'cliente_id': cliente_a['id'],
        'itens': [],
    }, headers=cenario['headers_a'])
    assert resp_ok.status_code == 201, resp_ok.get_json()
    proposta = resp_ok.get_json()
    assert proposta['empresa_id'] == cenario['empresa_a'].id

    # Empresa B não consegue ler a proposta de A.
    resp_leitura_b = client.get(f"/api/propostas/{proposta['id']}", headers=cenario['headers_b'])
    assert resp_leitura_b.status_code == 403


def test_empresa_nao_admin_so_ve_a_propria_empresa(client, cenario):
    resp = client.get('/api/empresas/', headers=cenario['headers_a'])
    assert resp.status_code == 200
    ids = [e['id'] for e in resp.get_json()]
    assert ids == [cenario['empresa_a'].id]

    resp_outra = client.get(f"/api/empresas/{cenario['empresa_b'].id}", headers=cenario['headers_a'])
    assert resp_outra.status_code == 403
