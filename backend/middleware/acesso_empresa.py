"""Helpers de controle de acesso por empresa (multi-tenant), compartilhados
pelos controllers que expõem dados de clientes de um escritório de
contabilidade (issue #13).

Réplica dos helpers já usados em `departamento_controller.py` e
`cargo_controller.py` para o próprio quadro interno da empresa (Usuario ->
Cargo -> Departamento -> Empresa); aqui centralizados para reuso nos
controllers de cliente/proposta/servico/agendamento/entidade jurídica, que
até então não faziam nenhuma checagem de propriedade por empresa.
"""
from flask import request
from models.organizacional import Usuario


def usuario_contexto() -> dict:
    conteudo = getattr(request, 'usuario_atual', {}) or {}
    if not isinstance(conteudo, dict):
        return {}
    if isinstance(conteudo.get('user'), dict):
        return conteudo['user']
    return conteudo


def empresa_id_de_usuario(usuario_id):
    """Empresa (escritório) a que um usuário qualquer pertence, via seu
    cargo/departamento - mesma cadeia de empresa_id_usuario(), mas para um
    usuario_id arbitrário (ex.: um funcionario_id recebido em um payload),
    não necessariamente o usuário autenticado na requisição atual."""
    if not usuario_id:
        return None

    try:
        usuario_model = Usuario.query.get(usuario_id)
        if usuario_model and usuario_model.cargo and usuario_model.cargo.departamento:
            return usuario_model.cargo.departamento.empresa_id
    except Exception:
        pass

    return None


def empresa_id_usuario():
    """Empresa (escritório) a que o usuário autenticado pertence, via seu
    cargo/departamento - mesma cadeia usada por cargo_/departamento_controller."""
    usuario_payload = usuario_contexto()
    empresa = usuario_payload.get('empresa')
    if isinstance(empresa, dict) and empresa.get('id') is not None:
        return empresa.get('id')

    return empresa_id_de_usuario(usuario_payload.get('id'))


def usuario_eh_admin() -> bool:
    return usuario_contexto().get('tipo_usuario') == 'admin'


def usuario_tem_acesso_empresa(empresa_id) -> bool:
    if empresa_id is None:
        return False
    if usuario_eh_admin():
        return True
    return empresa_id == empresa_id_usuario()
