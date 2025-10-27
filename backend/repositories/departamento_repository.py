from config import db
from models.organizacional import Departamento

class DepartamentoRepository:
    """Repositório para gerenciar departamentos"""
    
    # Métodos de busca
    def get_all(self):
        """Busca todos os departamentos ativos"""
        return Departamento.query.filter_by(ativo=True).all()
    
    def get_by_id(self, departamento_id: int):
        """Busca departamento por ID"""
        return Departamento.query.filter_by(id=departamento_id, ativo=True).first()
    
    def get_by_nome(self, nome: str):
        """Busca departamento por nome"""
        return Departamento.query.filter_by(nome=nome, ativo=True).first()
    
    def get_by_empresa(self, empresa_id: int):
        """Busca departamentos por empresa"""
        return Departamento.query.filter_by(empresa_id=empresa_id, ativo=True).all()
    
    def get_by_status(self, status: str):
        """Busca departamentos por status"""
        return Departamento.query.filter_by(status=status, ativo=True).all()
    
    def search_by_nome(self, termo: str):
        """Busca departamentos por termo no nome"""
        return Departamento.query.filter(
            Departamento.nome.contains(termo),
            Departamento.ativo == True
        ).all()
    
    # Métodos de CRUD
    def create(self, departamento: Departamento):
        """Cria um novo departamento"""
        try:
            db.session.add(departamento)
            db.session.commit()
            return departamento
        except Exception as e:
            db.session.rollback()
            raise e
    
    def update(self, departamento: Departamento):
        """Atualiza um departamento existente"""
        try:
            db.session.commit()
            return departamento
        except Exception as e:
            db.session.rollback()
            raise e
    
    def delete(self, departamento: Departamento):
        """Desativa um departamento (soft delete)"""
        try:
            departamento.desativar()
            db.session.commit()
            return departamento
        except Exception as e:
            db.session.rollback()
            raise e
    
    def hard_delete(self, departamento: Departamento):
        """Remove permanentemente um departamento"""
        try:
            db.session.delete(departamento)
            db.session.commit()
            return True
        except Exception as e:
            db.session.rollback()
            raise e
    
    # Métodos auxiliares
    def exists_by_nome(self, nome: str, empresa_id: int, exclude_id: int = None):
        """Verifica se já existe departamento com esse nome na empresa"""
        query = Departamento.query.filter_by(
            nome=nome, 
            empresa_id=empresa_id, 
            ativo=True
        )
        
        if exclude_id:
            query = query.filter(Departamento.id != exclude_id)
        
        return query.first() is not None
    
    def count_by_empresa(self, empresa_id: int):
        """Conta quantos departamentos ativos uma empresa tem"""
        return Departamento.query.filter_by(
            empresa_id=empresa_id, 
            ativo=True
        ).count()
    
    def get_with_cargos(self, departamento_id: int):
        """Busca departamento com seus cargos relacionados"""
        return Departamento.query.filter_by(
            id=departamento_id, 
            ativo=True
        ).first()