from models.tipoAtividade import TipoAtividade
from repositories.tipo_atividade_repository import TipoAtividadeRepository

class TipoAtividadeService:
    """ Serviços para gerenciar tipos de atividade """

    def __init__(self):
        self.repo = TipoAtividadeRepository()
    
    def get_all(self):
        """Retorna todos os tipos de atividade"""
        return self.repo.get_all()
    
    def get_by_id(self, tipo_id: int):
        """Retorna tipo de atividade por ID"""
        tipo = self.repo.get_by_id(tipo_id)
        if not tipo:
            raise ValueError("Tipo de atividade não encontrado")
        return tipo
    
    def search_by_name(self, nome: str):
        """Busca tipos de atividade por nome"""
        if not nome or len(nome.strip()) < 2:
            raise ValueError("Nome deve ter pelo menos 2 caracteres")
        return self.repo.search_by_name(nome.strip())
    
    def criar_tipo(self, **data):
        """Cria um novo tipo de atividade"""
        # Validações básicas
        if not data.get('nome'):
            raise ValueError("Nome é obrigatório")
        
        # Verificar se já existe tipo com esse nome
        existing = self.repo.get_by_nome(data['nome'])
        if existing:
            raise ValueError("Já existe um tipo de atividade com esse nome")
        
        # Verificar se já existe tipo com esse código (se fornecido)
        if data.get('codigo'):
            existing_codigo = self.repo.get_by_codigo(data['codigo'])
            if existing_codigo:
                raise ValueError("Já existe um tipo de atividade com esse código")
        
        # Criar tipo
        tipo = TipoAtividade(**data)
        return self.repo.create(tipo)
    
    def atualizar_tipo(self, tipo_id: int, **data):
        """Atualiza um tipo de atividade existente"""
        tipo = self.repo.get_by_id(tipo_id)
        if not tipo:
            raise ValueError("Tipo de atividade não encontrado")
        
        # Verificar se novo nome já existe (se nome foi alterado)
        if 'nome' in data and data['nome'] != tipo.nome:
            existing = self.repo.get_by_nome(data['nome'])
            if existing:
                raise ValueError("Já existe um tipo de atividade com esse nome")
        
        # Verificar se novo código já existe (se código foi alterado)
        if 'codigo' in data and data['codigo'] != tipo.codigo:
            existing_codigo = self.repo.get_by_codigo(data['codigo'])
            if existing_codigo:
                raise ValueError("Já existe um tipo de atividade com esse código")
        
        # Atualizar campos
        for key, value in data.items():
            if hasattr(tipo, key):
                setattr(tipo, key, value)
        
        return self.repo.update(tipo)
    
    def deletar_tipo(self, tipo_id: int):
        """Remove um tipo de atividade"""
        tipo = self.repo.get_by_id(tipo_id)
        if not tipo:
            raise ValueError("Tipo de atividade não encontrado")
        
        return self.repo.delete(tipo)