from config import db
from models.ordemServico import OrdemServico, ItemOrdemServico


class OrdemServicoRepository:
    """Repositório para gerenciar os Agendamentos"""
    def get_all(self):
        return OrdemServico.query.filter_by(ativo=True).all()

    def get_by_id(self, ordem_id: int):
        return OrdemServico.query.filter_by(ordem_id, ativo=True).first()
    
    def get_by_cliente(self, cliente_id: int):
        return OrdemServico.query.filter_by(cliente_id=cliente_id, ativo=True).all()
    
    def get_by_protocolo(self, protocolo: str):
        return OrdemServico.query.filter_by(protocolo=protocolo, ativo=True).first()
    
    def get_by_empresa(self, empresa_id: int):
        return OrdemServico.query.filter_by(empresa_id=empresa_id, ativo=True).all()
    
    def get_by_departamento(self, departamento_id: int):
        return OrdemServico.query.filter_by(departamento_id=departamento_id, ativo=True).all()
    
    def get_by_usuario(self, usuario_id: int):
        return OrdemServico.query.filter_by(usuario_id=usuario_id, ativo=True).all()
    
    def get_by_status(self, status: str):
        return OrdemServico.query.filter_by(status=status, ativo=True).all()
    
    def create(self, ordem: OrdemServico):
        db.session.add(ordem)
        db.session.commit()
        return ordem
    def update(self, ordem: OrdemServico):
        db.session.commit()
        return ordem
    def delete(self, ordem: OrdemServico):
        ordem.desativar()
        db.session.commit()
        return ordem 
    
class ItemOrdemServicoRepository:
    """Repositório para gerenciar os Itens da Ordem de Serviço"""
    def get_all(self):
        return ItemOrdemServico.query.filter_by(ativo=True).all()

    def get_by_id(self, item_id: int):
        return ItemOrdemServico.query.filter_by(item_id, ativo=True).first()
    
    def get_by_ordem(self, ordem_id: int):
        return ItemOrdemServico.query.filter_by(ordem_id=ordem_id, ativo=True).all()
    
    def create(self, item: ItemOrdemServico):
        db.session.add(item)
        db.session.commit()
        return item
    def update(self, item: ItemOrdemServico):
        db.session.commit()
        return item
    def delete(self, item: ItemOrdemServico):
        item.desativar()
        db.session.commit()
        return item