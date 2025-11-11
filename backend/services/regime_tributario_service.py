from models.entidadeJuridica import RegimeTributario
from repositories.regime_tributario_repository import RegimeTributarioRepository
from config import db 
import traceback

class RegimeTributarioService:

    def __init__(self):
        self.repo = RegimeTributarioRepository()

    def get_all(self, ativo_only: bool = True):
        try:
            return self.repo.get_all(ativo_only=ativo_only)
        except TypeError as e:
            print(f"AVISO: RegimeTributarioRepository.get_all pode não aceitar 'ativo_only'. Erro: {e}")
            todos_regimes = self.repo.get_all() 
            if ativo_only:
                return [r for r in todos_regimes if hasattr(r, 'ativo') and r.ativo]
            else:
                return todos_regimes

    def get_by_id(self, regime_id: int):
        regime = RegimeTributario.query.filter_by(id=regime_id).first()
        if not regime:
            raise ValueError("Regime tributário não encontrado")
        return regime

    def search_by_name(self, nome: str):
        if not nome or len(nome.strip()) < 2:
            raise ValueError("Nome deve ter pelo menos 2 caracteres")
        return self.repo.search_by_name(nome.strip())

    def get_by_nome_inativo_check(self, nome: str):
        return RegimeTributario.query.filter_by(nome=nome).first()

    def get_by_codigo_inativo_check(self, codigo: str):
        return RegimeTributario.query.filter_by(codigo=codigo).first()

    def criar_regime(self, **data):
        nome = data.get('nome')
        if not nome or not isinstance(nome, str) or len(nome.strip()) < 3:
            raise ValueError("Campo nome é obrigatório e deve ter pelo menos 3 caracteres")

        data.pop('codigo', None)
        if 'ativo' not in data: data['ativo'] = True

        if 'aplicavel_pf' in data:
            data['aplicavel_pj'] = not bool(data['aplicavel_pf'])
            data.pop('aplicavel_pf')

        existente_nome = self.get_by_nome_inativo_check(nome)

        if existente_nome:
            if existente_nome.ativo:
                raise ValueError(f"Já existe um regime tributário ativo com este nome")
            else:
                print(f"INFO: Reativando e atualizando regime inativo ID {existente_nome.id} com nome '{existente_nome.nome}'")
                servico_atualizado = self.atualizar_regime(existente_nome.id, **data)
                return servico_atualizado
        else:
            print(f"INFO: Criando novo regime com nome '{nome}'")
            regime = RegimeTributario(**data)
            regime_criado_com_codigo = self.repo.create(regime)
            return regime_criado_com_codigo

    def atualizar_regime(self, regime_id: int, **data):
        regime = self.get_by_id(regime_id)
        if not regime:
            raise ValueError("Regime tributário não encontrado")
            
        if 'aplicavel_pf' in data:
            data['aplicavel_pj'] = not bool(data['aplicavel_pf'])
            data.pop('aplicavel_pf')

        nome_alterado = 'nome' in data and data['nome'] != regime.nome
        novo_nome = data.get('nome', regime.nome)

        if nome_alterado:
            if not novo_nome or not isinstance(novo_nome, str) or len(novo_nome.strip()) < 3:
                 raise ValueError("Campo nome é obrigatório e deve ter pelo menos 3 caracteres")

            outro_ativo = RegimeTributario.query.filter(
                RegimeTributario.nome == novo_nome,
                RegimeTributario.id != regime_id,
                RegimeTributario.ativo == True
            ).first()
            if outro_ativo:
                raise ValueError("Já existe outro regime tributário ativo com este nome")

        for key, value in data.items():
            if key == 'codigo':
                continue
            if hasattr(regime, key):
                setattr(regime, key, value)
            else:
                 print(f"AVISO: Atributo '{key}' inexistente no RegimeTributario")

        if nome_alterado:
            try:
                prefixo = ''.join(filter(str.isalnum, regime.nome))[:3].upper()
                if len(prefixo) < 3: prefixo = prefixo.ljust(3, 'X')
                novo_codigo = f"{prefixo}{regime.id:03d}"

                if regime.codigo != novo_codigo:
                    print(f"INFO: Atualizando código do regime ID {regime.id} para '{novo_codigo}'")
                    regime.codigo = novo_codigo
            except Exception as e_code_update:
                 print(f"ERRO: Falha ao gerar novo código para regime ID {regime.id}: {e_code_update}")
                 traceback.print_exc()

        return self.repo.update(regime)

    def deletar_regime(self, regime_id: int):
        regime = self.get_by_id(regime_id)
        if not regime:
            raise ValueError("Regime tributário não encontrado")

        try:
            if hasattr(regime, 'entidades_juridicas') and regime.entidades_juridicas.first() is not None:
                 raise ValueError("Não é possível desativar regime com entidades jurídicas vinculadas")
        except AttributeError:
             print("AVISO: Modelo RegimeTributario sem relacionamento 'entidades_juridicas'.")
        except Exception as e_rel:
             print(f"AVISO: Erro ao checar relacionamento 'entidades_juridicas': {e_rel}")

        if not regime.ativo:
             print(f"AVISO: Regime ID {regime_id} já está inativo.")
             return regime

        return self.repo.delete(regime)

