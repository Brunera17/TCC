from models.entidadeJuridica import RegimeTributario
from repositories.regime_tributario_repository import RegimeTributarioRepository

class RegimeTributarioService:
    """ Serviços para gerenciar regimes tributários """

    def __init__(self):
        self.repo = RegimeTributarioRepository()
    
    def get_all(self):
        """Retorna todos os regimes tributários"""
        return self.repo.get_all()
    
    def get_by_id(self, regime_id: int):
        """Retorna regime tributário por ID"""
        regime = self.repo.get_by_id(regime_id)
        if not regime:
            raise ValueError("Regime tributário não encontrado")
        return regime
    
    def search_by_name(self, nome: str):
        """Busca regimes tributários por nome"""
        if not nome or len(nome.strip()) < 2:
            raise ValueError("Nome deve ter pelo menos 2 caracteres")
        return self.repo.search_by_name(nome.strip())
    
    def criar_regime(self, **data):
        """Cria um novo regime tributário"""
        # Validações básicas
        if not data.get('nome'):
            raise ValueError("Nome é obrigatório")
        
        # Verificar se já existe regime com esse nome
        existing = self.repo.get_by_nome(data['nome'])
        if existing:
            raise ValueError("Já existe um regime tributário com esse nome")
        
        # Criar regime
        regime = RegimeTributario(**data)
        return self.repo.create(regime)
    
    def atualizar_regime(self, regime_id: int, **data):
        """Atualiza um regime tributário existente"""
        regime = self.repo.get_by_id(regime_id)
        if not regime:
            raise ValueError("Regime tributário não encontrado")
        
        # Verificar se novo nome já existe (se nome foi alterado)
        if 'nome' in data and data['nome'] != regime.nome:
            existing = self.repo.get_by_nome(data['nome'])
            if existing:
                raise ValueError("Já existe um regime tributário com esse nome")
        
        # Atualizar campos
        for key, value in data.items():
            if hasattr(regime, key):
                setattr(regime, key, value)
        
        return self.repo.update(regime)
    
    def deletar_regime(self, regime_id: int):
        """Remove um regime tributário"""
        regime = self.repo.get_by_id(regime_id)
        if not regime:
            raise ValueError("Regime tributário não encontrado")
        
        # Verificar se há entidades jurídicas vinculadas
        if regime.entidades_juridicas.count() > 0:
            raise ValueError("Não é possível deletar regime com entidades jurídicas vinculadas")
        
        return self.repo.delete(regime)