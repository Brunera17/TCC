from models.ordemServico import OrdemServico
from repositories.ordemServico_repository import OrdemServicoRepository

class OrdemServicoService:
    """ Serviço para gerenciar ordens de serviço """

    def __init__(self):
        self.repo = OrdemServicoRepository()
    
    def get_all(self):
        return self.repo.get_all()
    
    def get_by_id(self, ordem_servico_id: int):
        return self.repo.get_by_id(ordem_servico_id)
    
    def get_by_agendamento(self, agendamento_id: int):
        return self.repo.get_by_agendamento(agendamento_id)

    def criar_ordem_servico(self, **data):
        ordem_servico = OrdemServico(**data)
        return self.repo.create(ordem_servico)
    
    def atualizar_ordem_servico(self, ordem_servico_id: int, **data):
        ordem_servico = self.repo.get_by_id(ordem_servico_id)

        if not ordem_servico:
            raise ValueError("Ordem de Serviço não encontrada")
        
        for key, value in data.items():
            setattr(ordem_servico, key, value)
        return self.repo.update(ordem_servico)
    
    def deletar_ordem_servico(self, ordem_servico_id: int):
        ordem_servico = self.repo.get_by_id(ordem_servico_id)
        
        if not ordem_servico:
            raise ValueError("Ordem de Serviço não encontrada")
        return self.repo.delete(ordem_servico)