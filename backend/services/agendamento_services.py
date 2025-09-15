from models.agendamento import Agendamento
from repositories.agendamento_repository import AgendamentoRepository

class AgendamentoService:
    """ Serviço para gerenciar agendamentos """

    def __init__(self):
        self.repo = AgendamentoRepository()
    
    def get_all(self):
        return self.repo.get_all()
    
    def get_by_id(self, agendamento_id: int):
        return self.repo.get_by_id(agendamento_id)
    
    def get_by_funcionario(self, funcionario_id: int):
        return self.repo.get_by_funcionario(funcionario_id)

    def criar_agendamento(self, **data):
        agendamento = Agendamento(**data)
        return self.repo.create(agendamento)
    
    def atualizar_agendamento(self, agendamento_id: int, **data):
        agendamento = self.repo.get_by_id(agendamento_id)

        if not agendamento:
            raise ValueError("Agendamento não encontrado")
        
        for key, value in data.items():
            setattr(agendamento, key, value)
        return self.repo.update(agendamento)
    
    def deletar_agendamento(self, agendamento_id: int):
        agendamento = self.repo.get_by_id(agendamento_id)
        
        if not agendamento:
            raise ValueError("Agendamento não encontrado")
        return self.repo.delete(agendamento)