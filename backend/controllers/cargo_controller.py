from flask import Blueprint, request, jsonify
from services.cargo_service import CargoService
from middleware.autenticacao_middleware import token_obrigatorio
from models.organizacional import Departamento, Usuario

bp = Blueprint('cargo', __name__, url_prefix='/api/cargos')
service = CargoService()


def _usuario_contexto():
    conteudo = getattr(request, 'usuario_atual', {}) or {}
    if not isinstance(conteudo, dict):
        return {}
    if isinstance(conteudo.get('user'), dict):
        return conteudo['user']
    return conteudo


def _empresa_id_usuario():
    usuario_payload = _usuario_contexto()
    empresa = usuario_payload.get('empresa')
    if isinstance(empresa, dict) and empresa.get('id') is not None:
        return empresa.get('id')

    usuario_id = usuario_payload.get('id')
    if not usuario_id:
        return None

    try:
        usuario_model = Usuario.query.get(usuario_id)
        if usuario_model and usuario_model.cargo and usuario_model.cargo.departamento:
            return usuario_model.cargo.departamento.empresa_id
    except Exception:
        pass

    return None


def _usuario_eh_admin():
    return _usuario_contexto().get('tipo_usuario') == 'admin'


def _usuario_eh_gerente():
    usuario = _usuario_contexto()
    return usuario.get('eh_gerente') is True or usuario.get('tipo_usuario') == 'gerente'


def _tem_acesso_departamento(departamento: Departamento):
    if not departamento:
        return False
    if _usuario_eh_admin():
        return True
    empresa_id = _empresa_id_usuario()
    return empresa_id is not None and departamento.empresa_id == empresa_id


@bp.route('/', methods=['GET'])
@token_obrigatorio
def get_cargos():
    """Lista todos os cargos"""
    try:
        cargos = service.get_all()
        empresa_id = _empresa_id_usuario()
        if empresa_id and not _usuario_eh_admin():
            cargos = [cargo for cargo in cargos if cargo.departamento and cargo.departamento.empresa_id == empresa_id]
        return jsonify([cargo.to_json() for cargo in cargos]), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@bp.route('/<int:cargo_id>', methods=['GET'])
@token_obrigatorio
def get_cargo_por_id(cargo_id):
    """Busca cargo por ID"""
    try:
        cargo = service.get_by_id(cargo_id)
        if not cargo:
            raise ValueError('Cargo não encontrado')
        empresa_id = _empresa_id_usuario()
        if empresa_id and not _usuario_eh_admin():
            departamento = cargo.departamento
            if not departamento or departamento.empresa_id != empresa_id:
                return jsonify({'error': 'Acesso negado para este recurso'}), 403
        return jsonify(cargo.to_json()), 200
    except ValueError as e:
        return jsonify({'error': str(e)}), 404
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@bp.route('/departamento/<int:departamento_id>', methods=['GET'])
@token_obrigatorio
def get_cargos_por_departamento(departamento_id):
    """Lista cargos de um departamento específico"""
    try:
        departamento = Departamento.query.get(departamento_id)
        if not _tem_acesso_departamento(departamento):
            return jsonify({'error': 'Acesso negado para este departamento'}), 403
        cargos = service.get_by_departamento(departamento_id)
        return jsonify([cargo.to_json() for cargo in cargos]), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@bp.route('/buscar', methods=['GET'])
@token_obrigatorio
def buscar_cargos():
    """Busca cargos por nome"""
    try:
        nome = request.args.get('nome', '').strip()
        if not nome:
            return jsonify({'error': 'Parâmetro nome é obrigatório'}), 400

        cargos = service.search_by_name(nome)
        empresa_id = _empresa_id_usuario()
        if empresa_id and not _usuario_eh_admin():
            cargos = [cargo for cargo in cargos if cargo.departamento and cargo.departamento.empresa_id == empresa_id]
        return jsonify([cargo.to_json() for cargo in cargos]), 200
    except ValueError as e:
        return jsonify({'error': str(e)}), 400
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@bp.route('/', methods=['POST'])
@token_obrigatorio
def criar_cargo():
    """Cria um novo cargo"""
    try:
        if not (_usuario_eh_admin() or _usuario_eh_gerente()):
            return jsonify({'error': 'Acesso negado. Apenas administradores ou gerentes podem criar cargos.'}), 403

        data = request.get_json() or {}
        departamento = Departamento.query.get(data.get('departamento_id')) if data.get('departamento_id') else None
        if not departamento:
            return jsonify({'error': 'Departamento não encontrado'}), 404
        if not _tem_acesso_departamento(departamento):
            return jsonify({'error': 'Departamento não pertence à sua empresa'}), 403
        if departamento.status and departamento.status != 'ativo':
            return jsonify({'error': 'Departamento inativo não aceita novos cargos'}), 400

        cargo = service.criar_cargo(**data)
        return jsonify(cargo.to_json()), 201
    except ValueError as e:
        return jsonify({'error': str(e)}), 400
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@bp.route('/<int:cargo_id>', methods=['PUT'])
@token_obrigatorio
def atualizar_cargo(cargo_id):
    """Atualiza um cargo existente"""
    try:
        if not (_usuario_eh_admin() or _usuario_eh_gerente()):
            return jsonify({'error': 'Acesso negado. Apenas administradores ou gerentes podem atualizar cargos.'}), 403

        data = request.get_json() or {}
        cargo = service.get_by_id(cargo_id)
        if not cargo:
            return jsonify({'error': 'Cargo não encontrado'}), 404

        destino_id = data.get('departamento_id') or cargo.departamento_id
        departamento = Departamento.query.get(destino_id)
        if not _tem_acesso_departamento(departamento):
            return jsonify({'error': 'Departamento não pertence à sua empresa'}), 403
        if departamento and departamento.status and departamento.status != 'ativo':
            return jsonify({'error': 'Departamento inativo não aceita alterações de cargo'}), 400

        cargo = service.atualizar_cargo(cargo_id, **data)
        return jsonify(cargo.to_json()), 200
    except ValueError as e:
        return jsonify({'error': str(e)}), 400
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@bp.route('/<int:cargo_id>', methods=['DELETE'])
@token_obrigatorio
def deletar_cargo(cargo_id):
    """Remove um cargo"""
    try:
        if not (_usuario_eh_admin() or _usuario_eh_gerente()):
            return jsonify({'error': 'Acesso negado. Apenas administradores ou gerentes podem deletar cargos.'}), 403

        cargo = service.get_by_id(cargo_id)
        if not cargo:
            return jsonify({'error': 'Cargo não encontrado'}), 404
        if not _tem_acesso_departamento(cargo.departamento):
            return jsonify({'error': 'Cargo não pertence à sua empresa'}), 403

        service.deletar_cargo(cargo_id)
        return jsonify({'message': 'Cargo removido com sucesso'}), 200
    except ValueError as e:
        return jsonify({'error': str(e)}), 400
    except Exception as e:
        return jsonify({'error': str(e)}), 500