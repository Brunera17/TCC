from models.proposta import Proposta
from repositories.proposta_repository import PropostaRepository

class PropostaService:
    """ Serviço para gerenciar propostas """

    def __init__(self):
        self.repo = PropostaRepository()
    
    def get_all(self):
        return self.repo.get_all()
    
    def get_by_id(self, proposta_id: int):
        return self.repo.get_by_id(proposta_id)
    
    def get_by_cliente(self, cliente_id: int):
        return self.repo.get_by_cliente(cliente_id)

    def criar_proposta(self, **data):
        proposta = Proposta(**data)
        return self.repo.create(proposta)
    
    def atualizar_proposta(self, proposta_id: int, **data):
        proposta = self.repo.get_by_id(proposta_id)

        if not proposta:
            raise ValueError("Proposta não encontrada")
        
        for key, value in data.items():
            setattr(proposta, key, value)
        return self.repo.update(proposta)
    
    def deletar_proposta(self, proposta_id: int):
        proposta = self.repo.get_by_id(proposta_id)
        
        if not proposta:
            raise ValueError("Proposta não encontrada")
        return self.repo.delete(proposta)
