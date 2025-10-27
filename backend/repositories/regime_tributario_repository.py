from config import db
from models.entidadeJuridica import RegimeTributario

class RegimeTributarioRepository:
    """ Repositório para gerenciar regimes tributários """

    def get_all(self):
        """Retorna todos os regimes tributários ativos"""
        return RegimeTributario.query.filter_by(ativo=True).all()
    
    def get_by_id(self, regime_id: int):
        """Retorna regime tributário por ID"""
        return RegimeTributario.query.filter_by(id=regime_id, ativo=True).first()
    
    def get_by_nome(self, nome: str):
        """Busca regime tributário por nome"""
        return RegimeTributario.query.filter_by(nome=nome, ativo=True).first()
    
    def search_by_name(self, nome: str):
        """Busca regimes tributários por nome (LIKE)"""
        return RegimeTributario.query.filter(
            RegimeTributario.nome.ilike(f'%{nome}%'),
            RegimeTributario.ativo == True
        ).all()

    def create(self, regime: RegimeTributario):
        """Cria um novo regime tributário"""
        db.session.add(regime)
        db.session.commit()
        return regime
    
    def update(self, regime: RegimeTributario):
        """Atualiza um regime tributário existente"""
        db.session.commit()
        return regime
    
    def delete(self, regime: RegimeTributario):
        """Remove um regime tributário (soft delete)"""
        regime.desativar()
        db.session.commit()
        return regime