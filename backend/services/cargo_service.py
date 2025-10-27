from models.organizacional import Cargo
from repositories.cargo_repository import CargoRepository

class CargoService:
    """ Serviços para gerenciar cargos """

    def __init__(self):
        self.repo = CargoRepository()
    
    def get_all(self):
        """Retorna todos os cargos"""
        return self.repo.get_all()
    
    def get_by_id(self, cargo_id: int):
        """Retorna cargo por ID"""
        cargo = self.repo.get_by_id(cargo_id)
        if not cargo:
            raise ValueError("Cargo não encontrado")
        return cargo
    
    def get_by_departamento(self, departamento_id: int):
        """Retorna cargos de um departamento"""
        return self.repo.get_by_departamento(departamento_id)
    
    def search_by_name(self, nome: str):
        """Busca cargos por nome"""
        if not nome or len(nome.strip()) < 2:
            raise ValueError("Nome deve ter pelo menos 2 caracteres")
        return self.repo.search_by_name(nome.strip())
    
    def criar_cargo(self, **data):
        """Cria um novo cargo"""
        # Validações básicas
        if not data.get('nome'):
            raise ValueError("Nome é obrigatório")
        
        if not data.get('departamento_id'):
            raise ValueError("Departamento é obrigatório")
        
        # Verificar se já existe cargo com esse nome no departamento
        existing = Cargo.query.filter_by(
            nome=data['nome'], 
            departamento_id=data['departamento_id'],
            ativo=True
        ).first()
        
        if existing:
            raise ValueError("Já existe um cargo com esse nome neste departamento")
        
        # Criar cargo
        cargo = Cargo(**data)
        return self.repo.create(cargo)
    
    def atualizar_cargo(self, cargo_id: int, **data):
        """Atualiza um cargo existente"""
        cargo = self.repo.get_by_id(cargo_id)
        if not cargo:
            raise ValueError("Cargo não encontrado")
        
        # Verificar se novo nome já existe no departamento (se nome foi alterado)
        if 'nome' in data and data['nome'] != cargo.nome:
            departamento_id = data.get('departamento_id', cargo.departamento_id)
            existing = Cargo.query.filter_by(
                nome=data['nome'], 
                departamento_id=departamento_id,
                ativo=True
            ).filter(Cargo.id != cargo_id).first()
            
            if existing:
                raise ValueError("Já existe um cargo com esse nome neste departamento")
        
        # Atualizar campos
        for key, value in data.items():
            if hasattr(cargo, key):
                setattr(cargo, key, value)
        
        return self.repo.update(cargo)
    
    def deletar_cargo(self, cargo_id: int):
        """Remove um cargo"""
        cargo = self.repo.get_by_id(cargo_id)
        if not cargo:
            raise ValueError("Cargo não encontrado")
        
        # Verificar se há usuários vinculados
        if cargo.usuarios.count() > 0:
            raise ValueError("Não é possível deletar cargo com funcionários vinculados")
        
        return self.repo.delete(cargo)