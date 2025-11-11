from models.cliente import Cliente
from repositories.cliente_repository import ClienteRepository
from services.endereco_service import EnderecoService
from services.entidade_juridica_service import EntidadeJuridicaService

class ClienteService:
    """ Serviço para gerenciar clientes """

    def __init__(self):
        self.repo = ClienteRepository()
        self.endereco_service = EnderecoService()
        self.entidade_service = EntidadeJuridicaService()
    
    def get_all(self):
        return self.repo.get_all()
    def get_by_id(self, cliente_id: int):
        return self.repo.get_by_id(cliente_id)
    def get_by_cpf(self, cpf: str):
        return self.repo.get_by_cpf(cpf)
    def get_by_email(self, email: str):
        return self.repo.get_by_email(email)

    def criar_cliente(self, **data):
        cpf = (data.get('cpf') or '').strip()
        email = (data.get('email') or '').strip()

        if not cpf:
            raise ValueError("CPF é obrigatório")
        if not email:
            raise ValueError("E-mail é obrigatório")

        if self.repo.get_by_cpf(cpf):
            raise ValueError("CPF já cadastrado")
        if self.get_by_email(email):
            raise ValueError("E-mail já cadastrado")

        data['cpf'] = cpf
        data['email'] = email
        cliente = Cliente(**data)
        return self.repo.create(cliente)
    
    def atualizar_cliente(self, cliente_id: int, **data):
        cliente = self.repo.get_by_id(cliente_id)

        if not cliente:
            raise ValueError("Cliente não encontrado")

        enderecos_payload = data.pop('enderecos', None)
        endereco_payload = data.pop('endereco', None)
        entidades_payload = data.pop('entidades_juridicas', None)
        entidade_payload = data.pop('entidade_juridica', None)

        cpf_atualizado = data.get('cpf')
        email_atualizado = data.get('email')

        if cpf_atualizado and cpf_atualizado != cliente.cpf:
            if self.repo.get_by_cpf(cpf_atualizado):
                raise ValueError("CPF já cadastrado")
        if email_atualizado and email_atualizado != cliente.email:
            if self.get_by_email(email_atualizado):
                raise ValueError("E-mail já cadastrado")

        campos_permitidos = {'nome', 'cpf', 'email', 'telefone', 'endereco', 'observacoes'}
        atualizacoes = {k: v for k, v in data.items() if k in campos_permitidos}

        for key, value in atualizacoes.items():
            setattr(cliente, key, value)

        self.repo.update(cliente)

        self._atualizar_enderecos(cliente_id, enderecos_payload or endereco_payload)
        self._atualizar_entidades_juridicas(cliente_id, entidades_payload or entidade_payload)

        return cliente

    def _atualizar_enderecos(self, cliente_id: int, payload):
        if not payload:
            return

        registros = payload if isinstance(payload, list) else [payload]

        for dados in registros:
            if not isinstance(dados, dict):
                continue
            endereco_id = dados.get('id')
            try:
                if endereco_id:
                    self.endereco_service.atualizar_endereco_por_id(endereco_id, **dados)
                else:
                    dados = dados.copy()
                    dados['cliente_id'] = cliente_id
                    self.endereco_service.criar_endereco(**dados)
            except ValueError as exc:
                raise ValueError(f"Endereço inválido: {exc}")

    def _atualizar_entidades_juridicas(self, cliente_id: int, payload):
        if not payload:
            return

        registros = payload if isinstance(payload, list) else [payload]

        for dados in registros:
            if not isinstance(dados, dict):
                continue
            entidade_id = dados.get('id')
            try:
                if entidade_id:
                    self.entidade_service.atualizar_entidade_juridica(entidade_id, **dados)
                else:
                    dados = dados.copy()
                    dados['cliente_id'] = cliente_id
                    self.entidade_service.criar_entidade_juridica(**dados)
            except ValueError as exc:
                raise ValueError(f"Entidade jurídica inválida: {exc}")
    def deletar_cliente(self, cliente_id: int):
        cliente = self.repo.get_by_id(cliente_id)
        
        if not cliente:
            raise ValueError("Cliente não encontrado")
        return self.repo.delete(cliente)

    