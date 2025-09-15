from models.servico import Servico, CategoriaServico
from repositories.servico_repository import ServicoRepository, CategoriaServicoRepository

class ServicoService:
    """ Serviço para gerenciar serviços """

    def __init__(self):
        self.repo = ServicoRepository()
    
    def get_all(self):
        return self.repo.get_all()
    def get_by_id(self, servico_id: int):
        return self.repo.get_by_id(servico_id)
    
    def criar_servico(self, **data):
        servico = Servico(**data)
        
        return self.repo.create(servico)
    def atualizar_servico(self, servico_id: int, **data):
        servico = self.repo.get_by_id(servico_id)
        
        if not servico:
            raise ValueError("Serviço não encontrado")
        
        for key, value in data.items():
            setattr(servico, key, value)
        return self.repo.update(servico)
    
    def deletar_servico(self, servico_id: int):
        servico = self.repo.get_by_id(servico_id)
        
        if not servico:
            raise ValueError("Serviço não encontrado")
        return self.repo.delete(servico)

class CategoriaServicoService:
    """ Serviço para gerenciar categorias de serviço """

    def __init__(self):
        self.repo = CategoriaServicoRepository()
    
    def get_all(self):
        return self.repo.get_all()
    def get_by_id(self, categoria_id: int):
        return self.repo.get_by_id(categoria_id)
    
    def criar_categoria(self, **data):
        categoria = CategoriaServico(**data)
        
        if self.repo.get_by_descricao(data['descricao']):
            raise ValueError("Categoria já cadastrada")
        return self.repo.create(categoria)
    def atualizar_categoria(self, categoria_id: int, **data):
        categoria = self.repo.get_by_id(categoria_id)
        
        if not categoria:
            raise ValueError("Categoria não encontrada")
        if 'descricao' in data and data['descricao'] != categoria.descricao:
            if self.repo.get_by_descricao(data['descricao']):
                raise ValueError("Categoria já cadastrada")
        
        for key, value in data.items():
            setattr(categoria, key, value)
        return self.repo.update(categoria)
    
    def deletar_categoria(self, categoria_id: int):
        categoria = self.repo.get_by_id(categoria_id)
        
        if not categoria:
            raise ValueError("Categoria não encontrada")
        return self.repo.delete(categoria)