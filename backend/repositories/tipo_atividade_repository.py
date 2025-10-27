from config import db
from models.tipoAtividade import TipoAtividade

class TipoAtividadeRepository:
    """ Repositório para gerenciar tipos de atividade """

    def get_all(self):
        """Retorna todos os tipos de atividade ativos"""
        return TipoAtividade.query.filter_by(ativo=True).all()
    
    def get_by_id(self, tipo_id: int):
        """Retorna tipo de atividade por ID"""
        return TipoAtividade.query.filter_by(id=tipo_id, ativo=True).first()
    
    def get_by_nome(self, nome: str):
        """Busca tipo de atividade por nome"""
        return TipoAtividade.query.filter_by(nome=nome, ativo=True).first()
    
    def get_by_codigo(self, codigo: str):
        """Busca tipo de atividade por código"""
        return TipoAtividade.query.filter_by(codigo=codigo, ativo=True).first()
    
    def search_by_name(self, nome: str):
        """Busca tipos de atividade por nome (LIKE)"""
        return TipoAtividade.query.filter(
            TipoAtividade.nome.ilike(f'%{nome}%'),
            TipoAtividade.ativo == True
        ).all()

    def create(self, tipo: TipoAtividade):
        """Cria um novo tipo de atividade"""
        db.session.add(tipo)
        db.session.commit()
        return tipo
    
    def update(self, tipo: TipoAtividade):
        """Atualiza um tipo de atividade existente"""
        db.session.commit()
        return tipo
    
    def delete(self, tipo: TipoAtividade):
        """Remove um tipo de atividade (soft delete)"""
        tipo.desativar()
        db.session.commit()
        return tipo