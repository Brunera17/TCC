from datetime import datetime

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
        data = self._prepare_datas(data)
        agendamento = Agendamento(**data)
        return self.repo.create(agendamento)
    
    def atualizar_agendamento(self, agendamento_id: int, **data):
        agendamento = self.repo.get_by_id(agendamento_id)

        if not agendamento:
            raise ValueError("Agendamento não encontrado")
        
        data = self._prepare_datas(data)

        for key, value in data.items():
            setattr(agendamento, key, value)
        return self.repo.update(agendamento)
    
    def deletar_agendamento(self, agendamento_id: int):
        agendamento = self.repo.get_by_id(agendamento_id)
        
        if not agendamento:
            raise ValueError("Agendamento não encontrado")
        return self.repo.delete(agendamento)

    @staticmethod
    def _prepare_datas(data: dict) -> dict:
        def _parse(valor):
            if isinstance(valor, str):
                cleaned = valor.strip()
                if cleaned.endswith('Z'):
                    cleaned = cleaned[:-1] + '+00:00'
                try:
                    return datetime.fromisoformat(cleaned)
                except ValueError as exc:
                    raise ValueError('Formato de data inválido. Utilize ISO 8601.') from exc
            return valor

        for field in ('data_inicio', 'data_fim'):
            if field in data and data[field] is not None:
                data[field] = _parse(data[field])
        return data