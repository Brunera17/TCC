from config import db
from models.proposta import Proposta, ItemProposta

class propostaRepository:
    """Repositório para gerenciar os Propostas"""
    def get_all(self):
        return Proposta.query.filter_by(ativo=True).all()

    def get_by_id(self, proposta_id: int):
        return Proposta.query.filter_by(proposta_id, ativo=True).first()
    
    def get_by_cliente(self, cliente_id: int):
        return Proposta.query.filter_by(cliente_id=cliente_id, ativo=True).all()
    
    def get_by_empresa(self, empresa_id: int):
        return Proposta.query.filter_by(empresa_id=empresa_id, ativo=True).all()
    
    def get_by_usuario(self, usuario_id: int):
        return Proposta.query.filter_by(usuario_id=usuario_id, ativo=True).all()
    
    def get_by_status(self, status: str):
        return Proposta.query.filter_by(status=status, ativo=True).all()
    
    def create(self, proposta: Proposta):
        db.session.add(proposta)
        db.session.commit()
        return proposta
    def update(self, proposta: Proposta):
        db.session.commit()
        return proposta
    def delete(self, proposta: Proposta):
        proposta.desativar()
        db.session.commit()
        return proposta
    
class ItemPropostaRepository:
    """Repositório para gerenciar os Itens da Proposta"""
    def get_all(self):
        return ItemProposta.query.filter_by(ativo=True).all()
    
    def create(self, item: ItemProposta):
        db.session.add(item)
        db.session.commit()
        return item
    def update(self, item: ItemProposta):
        db.session.commit()
        return item
    def delete(self, item: ItemProposta):
        item.desativar()
        db.session.commit()
        return item