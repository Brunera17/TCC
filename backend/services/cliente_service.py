from models.cliente import Cliente
from repositories.cliente_repository import ClienteRepository

class ClienteService:
    """ Serviço para gerenciar clientes """

    def __init__(self):
        self.repo = ClienteRepository()
    
    def get_all(self):
        return self.repo.get_all()
    def get_by_id(self, cliente_id: int):
        return self.repo.get_by_id(cliente_id)
    def get_by_cpf(self, cpf: str):
        return self.repo.get_by_cpf(cpf)
    def get_by_email(self, email: str):
        return self.repo.get_by_email(email)

    def criar_cliente(self, **data):
        cliente = Cliente(**data)

        if self.repo.get_by_cpf(data['cpf']):
            raise ValueError("CPF já cadastrado")
        if self.get_by_email(data['email']):
            raise ValueError("E-mail já cadastrado")
        return self.repo.create(cliente)
    
    def atualizar_cliente(self, cliente_id: int,**data):
        cliente = self.repo.get_by_id(cliente_id)

        if not cliente:
            raise ValueError("Cliente não encontrado")
        if 'cpf' in data and data['cpf'] != cliente.cpf:
            if self.repo.get_by_cpf(data['cpf']):
                raise ValueError("CPF já cadastrado")
        if 'email' in data and data['email'] != cliente.email:
            if self.repo.get_by_email(data['email']):
                raise ValueError("E-mail já cadastrado")
        
        for key, value in data.items():
            setattr(cliente, key, value)
        return self.repo.update(cliente)
    def deletar_cliente(self, cliente_id: int):
        cliente = self.repo.get_by_id(cliente_id)
        
        if not cliente:
            raise ValueError("Cliente não encontrado")
        return self.repo.delete(cliente)

    