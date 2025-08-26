from models.cliente import EntidadeJuridica
from repositories.entidade_juridica_repository import EntidadeJuridicaRepository

class EntidadeJuridicaService:
    """ Serviço para gerenciar entidades jurídicas """

    def __init__(self):
        self.repo = EntidadeJuridicaRepository()

    def get_by_cnpj(self, cnpj: str):
        return self.repo.get_by_cnpj(cnpj)
    
    def get_by_email(self, email: str):
        return self.repo.get_by_email(email)
    
    def criar_entidade_juridica(self, **data):  
        entidade_juridica = EntidadeJuridica(**data)

        if self.repo.get_by_cnpj(data['cnpj']):
            raise ValueError("CNPJ já cadastrado")
        if self.repo.get_by_email(data['email']):
            raise ValueError("E-mail já cadastrado")
        
        return self.repo.create(entidade_juridica)
    
    def atualizar_entidade_juridica(self, entidade_juridica_id: int, **data):
        entidade_juridica = self.repo.get_by_id(entidade_juridica_id)

        if not entidade_juridica:
            raise ValueError("Entidade jurídica não encontrada")
        
        for key, value in data.items():
            setattr(entidade_juridica, key, value)
        
        return self.repo.update(entidade_juridica)
    
    def deletar_entidade_juridica(self, entidade_juridica_id: int):
        entidade_juridica = self.repo.get_by_id(entidade_juridica_id)
        
        if not entidade_juridica:
            raise ValueError("Entidade jurídica não encontrada")
        
        return self.repo.delete(entidade_juridica)
    