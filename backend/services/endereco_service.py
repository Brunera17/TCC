from models.cliente import Endereco
from repositories.endereco_repository import EnderecoRepository

class EnderecoService:
    """ Serviços para gerenciar o endereço"""

    def __init__(self):
        self.repo = EnderecoRepository()
    
    def get_by_cliente(self, cliente_id: int):
        return self.repo.get_by_cliente(cliente_id)
    def get_by_cidade(self, cidade: str):
        return self.repo.get_by_cidade(cidade)
    def get_by_uf(self, uf: str):
        return self.repo.get_by_uf(uf)
    
    def criar_endereco(self, **data):
        endereco = Endereco(**data)

        if self.repo.get_by_cliente(data['cliente_id']):
            raise ValueError("Cliente não vinculado ao endereço")
        if self.repo.get_by_cep(data['cep']):
            raise ValueError("CEP não informado")
        
        return self.repo.create(endereco)

    def Atualiza_endereco(self, cliente_id: int, **dado):
        endereco = self.repo.get_by_cliente(cliente_id)

        if not endereco:
            raise ValueError("Endereço não encontrado")
        
        for key, value in dado.items():
            setattr(endereco, key, value)
        
        return self.repo.update(endereco)
    
    def deletar_endereco(self, endereco_id: int):
        endereco = self.repo.get_by_id(endereco_id)

        if not endereco:
            raise ValueError("Endereço não encontrado")
        
        return self.repo.delete(endereco)
    
    