from config import db
from models.relatorio import Relatorio

class RelatorioRepository:
    """Repositório para gerenciar os Relatórios"""
    def get_all(self):
        return Relatorio.query.filter_by(ativo=True).all()

    def get_by_id(self, relatorio_id: int):
        return Relatorio.query.filter_by(relatorio_id, ativo=True).first()
    
    def get_by_funcionario(self, funcionario_id: int):
        return Relatorio.query.filter_by(funcionario_id=funcionario_id, ativo=True).first()
    
    def create(self, relatorio: Relatorio):
        db.session.add(relatorio)
        db.session.commit()
        return relatorio
    def update(self, relatorio: Relatorio):
        db.session.commit()
        return relatorio
    def delete(self, relatorio: Relatorio):
        relatorio.desativar()
        db.session.commit()
        return relatorio