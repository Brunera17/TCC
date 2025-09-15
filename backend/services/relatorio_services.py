from models.relatorio import Relatorio
from repositories.relatorio_repository import RelatorioRepository

class RelatorioService:
    """ Serviço para gerenciar relatórios """
    
    def __init__(self):
        self.repo = RelatorioRepository()
        
    def get_all(self):
        return self.repo.get_all()
    def get_by_id(self, relatorio_id: int):
        return self.repo.get_by_id(relatorio_id)
    
    def criar_relatorio(self, **data):
        relatorio = Relatorio(**data)
        
        return self.repo.create(relatorio)
    def atualizar_relatorio(self, relatorio_id: int, **data):
        relatorio = self.repo.get_by_id(relatorio_id)
        
        if not relatorio:
            raise ValueError("Relatorio não encontrado")
        
        for key, value in data.items():
            setattr(relatorio, key, value)
        return self.repo.update(relatorio)
    
    def deletar_relatorio(self, relatorio_id: int):
        relatorio = self.repo.get_by_id(relatorio_id)
        
        if not relatorio:
            raise ValueError("Relatorio não encontrado")
        return self.repo.delete(relatorio)