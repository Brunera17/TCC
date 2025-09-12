from config import db
from models.agendamento import Agendamento

class AgendamentoRepository:
    """Repositório para gerenciar os Agendamentos"""
    def get_all(self):
        return Agendamento.query.filter_by(ativo=True).all()

    def get_by_id(self, agendamento_id: int):
        return Agendamento.query.filter_by(agendamento_id, ativo=True).first()
    
    def get_by_funcionario(self, funcionario_id: int):
        return Agendamento.query.filter_by(funcionario_id=funcionario_id, ativo=True).all()
    
    def create(self, agendamento: Agendamento):
        db.session.add(agendamento)
        db.session.commit()
        return agendamento
    def update(self, agendamento: Agendamento):
        db.session.commit()
        return agendamento
    def delete(self, agendamento: Agendamento):
        agendamento.desativar()
        db.session.commit()
        return agendamento  