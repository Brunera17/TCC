from models.organizacional import Empresa
from repositories.empresa_repository import EmpresaRepository

class EmpresaService:
    """ Serviço para gerenciar empresas """
    # Inicialização
    def __init__(self):
        self.repo = EmpresaRepository()

    # Métodos de busca
    def get_all(self):
        return self.repo.get_all()
    
    def get_by_id(self, empresa_id: int):
        return self.repo.get_by_id(empresa_id)
    
    def get_by_cnpj(self, cnpj: str):
        return self.repo.get_by_cnpj(cnpj)
    
    def get_by_email(self, email: str):
        return self.repo.get_by_email(email)


    # Métodos de criação, atualização e deleção
    def criar_empresa(self, **data):
        empresa = Empresa(**data)

        
        if self.repo.get_by_cnpj(data['cnpj']):
            raise ValueError("CNPJ já cadastrado")
        
        if self.repo.get_by_email(data['email']):
            raise ValueError("Email já cadastrado")
        
        return self.repo.create(empresa)
    
    def atualizar_empresa(self, empresa_id: int, **data):
        empresa = self.repo.get_by_id(empresa_id)
        
        if not empresa:
            raise ValueError("Empresa não encontrada")
        if 'cnpj' in data and data['cnpj'] != empresa.cnpj:
            if self.repo.get_by_cnpj(data['cnpj']):
                raise ValueError("CNPJ já cadastrado")
        if 'email' in data and data['email'] != empresa.email:
            if self.repo.get_by_email(data['email']):
                raise ValueError("Email já cadastrado")
        
        for key, value in data.items():
            setattr(empresa, key, value)
        return self.repo.update(empresa)
    
    def deletar_empresa(self, empresa_id: int):
        empresa = self.repo.get_by_id(empresa_id)
        if not empresa:
            raise ValueError("Empresa não encontrada")
        return self.repo.delete(empresa)
