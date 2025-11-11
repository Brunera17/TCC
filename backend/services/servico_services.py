# services/servico_services.py

from models.servico import Servico, CategoriaServico
from repositories.servico_repository import ServicoRepository, CategoriaServicoRepository

class ServicoService:

    def __init__(self):
        self.repo = ServicoRepository()

    def get_all(self, ativo_only: bool = True):
        return self.repo.get_all(ativo_only=ativo_only)

    def get_by_id(self, servico_id: int):
        return Servico.query.filter_by(id=servico_id).first()

    def get_by_categoria(self, categoria_id: int, ativo_only: bool = True):
        return self.repo.get_by_categoria(categoria_id, ativo_only=ativo_only)

    def get_by_codigo(self, codigo: str):
        return Servico.query.filter_by(codigo=codigo).first()

    def get_by_nome(self, nome: str):
        return Servico.query.filter_by(nome=nome).first()

    def criar_servico(self, **data):
        """
        Cria um novo serviço ou reativa e atualiza um serviço inativo
        com o mesmo nome. O código é gerado pelo repositório.
        """
        nome = data.get('nome')
        if not nome or not isinstance(nome, str) or len(nome.strip()) < 3:
            raise ValueError("Campo nome é obrigatório e deve ter pelo menos 3 caracteres")

        data.pop('codigo', None)

        data['ativo'] = True

        existente_nome = self.repo.get_by_nome(nome)

        if existente_nome:
            if existente_nome.ativo:
                raise ValueError(f"Já existe um serviço ativo com este nome")
            else:
                print(f"INFO: Reativando e atualizando serviço inativo ID {existente_nome.id} com nome '{existente_nome.nome}'")
                servico_atualizado = self.atualizar_servico(existente_nome.id, **data)

                prefixo = ''.join(filter(str.isalnum, servico_atualizado.nome))[:4].upper()
                if len(prefixo) < 4: prefixo = prefixo.ljust(4, 'X')
                codigo_esperado = f"{prefixo}{servico_atualizado.id:03d}"
                if servico_atualizado.codigo != codigo_esperado:
                    print(f"INFO: Corrigindo código do serviço reativado ID {servico_atualizado.id} para '{codigo_esperado}'")
                    servico_atualizado.codigo = codigo_esperado
                    self.repo.update(servico_atualizado)

                return servico_atualizado
        else:
            print(f"INFO: Criando novo serviço com nome '{nome}'")
            servico = Servico(**data)
            servico_criado_com_codigo = self.repo.create(servico) 
            return servico_criado_com_codigo

    def atualizar_servico(self, servico_id: int, **data):
        """
        Atualiza um serviço existente.
        Verifica a unicidade do nome se estiver sendo alterado.
        Recalcula e atualiza o código se o nome for alterado.
        """
        servico = self.repo.get_by_id(servico_id)

        if not servico:
            raise ValueError("Serviço não encontrado")

        nome_alterado = 'nome' in data and data['nome'] != servico.nome
        novo_nome = data.get('nome', servico.nome)

        if nome_alterado:
            if not novo_nome or not isinstance(novo_nome, str) or len(novo_nome.strip()) < 3:
                raise ValueError("Campo nome é obrigatório e deve ter pelo menos 3 caracteres")

            outro_servico_com_nome = self.repo.get_by_nome(novo_nome)
            if outro_servico_com_nome and outro_servico_com_nome.id != servico_id:
                if outro_servico_com_nome.ativo:
                    raise ValueError("Já existe outro serviço ativo com este nome")
                else:
                    print(f"AVISO: Novo nome '{novo_nome}' já existe em um serviço inativo (ID: {outro_servico_com_nome.id}).")

        for key, value in data.items():
            if key == 'codigo':
                if value != servico.codigo:
                    print(f"AVISO: Tentativa de alterar código diretamente para '{value}' no serviço ID {servico_id} ignorada.")
                continue

            if hasattr(servico, key):
                setattr(servico, key, value)
            else:
                print(f"AVISO: Tentando definir atributo inexistente '{key}' no serviço ID {servico_id}")

        if nome_alterado:
            try:
                prefixo = ''.join(filter(str.isalnum, servico.nome))[:4].upper() # Usa o nome já atualizado no objeto
                if len(prefixo) < 4: prefixo = prefixo.ljust(4, 'X')
                novo_codigo = f"{prefixo}{servico.id:03d}"

                if servico.codigo != novo_codigo:
                    print(f"INFO: Atualizando código do serviço ID {servico.id} de '{servico.codigo}' para '{novo_codigo}' devido à mudança de nome.")
                    servico.codigo = novo_codigo
                else:
                    print(f"INFO: Nome do serviço ID {servico.id} alterado, mas o prefixo do código ('{prefixo}') permaneceu o mesmo.")

            except Exception as e_code_update:
                print(f"ERRO: Falha ao gerar novo código para serviço ID {servico.id} após mudança de nome: {e_code_update}")

        return self.repo.update(servico)

    def deletar_servico(self, servico_id: int):
        servico = self.repo.get_by_id(servico_id)

        if not servico:
            raise ValueError("Serviço não encontrado")

        if not servico.ativo:
            print(f"AVISO: Serviço ID {servico_id} já está inativo.")
            return servico

        return self.repo.delete(servico)

# ==================== CATEGORIA SERVICE ====================
class CategoriaServicoService:

    def __init__(self):
        self.repo = CategoriaServicoRepository()

    def get_all(self):
        return self.repo.get_all()

    def get_by_id(self, categoria_id: int):
        return CategoriaServico.query.filter_by(id=categoria_id).first()

    def criar_categoria(self, **data):
        nome = data.get('nome')
        if not nome or not isinstance(nome, str) or len(nome.strip()) == 0:
            raise ValueError("Campo nome é obrigatório para Categoria")

        data['ativo'] = True

        existente_ativa = CategoriaServico.query.filter_by(nome=nome, ativo=True).first()
        if existente_ativa:
            raise ValueError("Já existe uma categoria ativa com este nome")

        existente_inativa = CategoriaServico.query.filter_by(nome=nome, ativo=False).first()
        if existente_inativa:
            print(f"INFO: Reativando categoria inativa ID {existente_inativa.id}")
            dados_atualizacao = {**data, 'ativo': True}
            return self.atualizar_categoria(existente_inativa.id, **dados_atualizacao)
        else:
            print(f"INFO: Criando nova categoria com nome '{nome}'")
            categoria = CategoriaServico(**data)
            return self.repo.create(categoria)

    def atualizar_categoria(self, categoria_id: int, **data):
        categoria = CategoriaServico.query.filter_by(id=categoria_id).first()

        if not categoria:
            raise ValueError("Categoria não encontrada")

        if 'nome' in data and data['nome'] != categoria.nome:
            outra_categoria = CategoriaServico.query.filter(
                CategoriaServico.nome == data['nome'],
                CategoriaServico.id != categoria_id,
                CategoriaServico.ativo == True
            ).first()
            if outra_categoria:
                raise ValueError("Já existe outra categoria ativa com este nome")

        for key, value in data.items():
            if hasattr(categoria, key):
                setattr(categoria, key, value)
            else:
                print(f"AVISO: Tentando definir atributo inexistente '{key}' na categoria ID {categoria_id}")

        return self.repo.update(categoria)

    def deletar_categoria(self, categoria_id: int):
        categoria = CategoriaServico.query.filter_by(id=categoria_id).first()

        if not categoria:
            raise ValueError("Categoria não encontrada")

        if not categoria.ativo:
            print(f"AVISO: Categoria ID {categoria_id} já está inativa.")
            return categoria

        return self.repo.delete(categoria)