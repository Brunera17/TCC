from config import db
from models.organizacional import Cargo

class CargoRepository:
    """ Repositório para gerenciar cargos """

    def get_all(self):
        """Retorna todos os cargos ativos"""
        return Cargo.query.filter_by(ativo=True).all()
    
    def get_by_id(self, cargo_id: int):
        """Retorna cargo por ID"""
        return Cargo.query.filter_by(id=cargo_id, ativo=True).first()
    
    def get_by_nome(self, nome: str):
        """Busca cargo por nome"""
        return Cargo.query.filter_by(nome=nome, ativo=True).first()
    
    def get_by_departamento(self, departamento_id: int):
        """Retorna cargos de um departamento específico"""
        return Cargo.query.filter_by(departamento_id=departamento_id, ativo=True).all()
    
    def search_by_name(self, nome: str):
        """Busca cargos por nome (LIKE)"""
        return Cargo.query.filter(
            Cargo.nome.ilike(f'%{nome}%'),
            Cargo.ativo == True
        ).all()

    def create(self, cargo: Cargo):
        """Cria um novo cargo"""
        db.session.add(cargo)
        db.session.commit()
        return cargo
    
    def update(self, cargo: Cargo):
        """Atualiza um cargo existente"""
        db.session.commit()
        return cargo
    
    def delete(self, cargo: Cargo):
        """Remove um cargo (soft delete)"""
        cargo.desativar()
        db.session.commit()
        return cargo