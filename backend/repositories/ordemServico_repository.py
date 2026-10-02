from config import db
from models.ordemServico import OrdemServico, ItemOrdemServico
from models.cliente import Cliente
from models.entidadeJuridica import EntidadeJuridica
from sqlalchemy import or_

class OrdemServicoRepository:
    """Repositório para gerenciar os Agendamentos"""
    def get_all(self):
        return OrdemServico.query.filter_by(ativo=True).all()

    def get_by_id(self, ordem_id: int):
        return OrdemServico.query.filter_by(id=ordem_id, ativo=True).first()
    def get_by_cliente(self, cliente_id: int):
        return OrdemServico.query.filter_by(cliente_id=cliente_id, ativo=True).all()

    def get_query_with_filters(self, status: str | None, search: str | None, empresa_id: int | None = None):
        """
        Retorna uma query do SQLAlchemy com filtros de status, busca e empresa aplicados.

        `empresa_id` restringe a ordens cujo cliente OU entidade jurídica vinculado
        pertence a essa empresa - OrdemServico não tem empresa_id próprio, então a
        checagem é sempre derivada dessas duas relações (join externo: uma ordem
        pode não ter cliente/entidade e nesse caso não corresponde a nenhuma empresa).
        """
        # Começa com a query básica
        query = OrdemServico.query.filter_by(ativo=True)

        if empresa_id is not None or search:
            # Join externo: preserva ordens sem cliente vinculado nos resultados
            # não filtrados por empresa (ex.: busca por protocolo).
            query = query.outerjoin(Cliente, OrdemServico.cliente_id == Cliente.id)

        if empresa_id is not None:
            query = query.outerjoin(EntidadeJuridica, OrdemServico.empresa_id == EntidadeJuridica.id)
            query = query.filter(or_(Cliente.empresa_id == empresa_id, EntidadeJuridica.empresa_id == empresa_id))

        # 1. Aplicar filtro de STATUS
        if status:
            query = query.filter(OrdemServico.status == status)

        # 2. Aplicar filtro de BUSCA (search)
        if search:
            search_term = f"%{search.lower()}%"
            query = query.filter(
                or_(
                    # Busca pelo protocolo da OS
                    OrdemServico.protocolo.ilike(search_term),
                    # Busca pelo nome do Cliente
                    Cliente.nome.ilike(search_term),
                    # Busca pelo email do Cliente
                    Cliente.email.ilike(search_term)
                )
            )

        # Ordenar pelos mais recentes primeiro
        query = query.order_by(OrdemServico.created_at.desc())

        return query
    
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
        return ItemOrdemServico.query.filter_by(id=item_id, ativo=True).first()
    
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