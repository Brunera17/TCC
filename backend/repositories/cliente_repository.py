from config import db
from models.cliente import Cliente

class ClienteRepository:
    """Repositório para gerenciar os Clientes"""
    def get_all(self):
        return Cliente.query.filter_by(ativo=True).all()

    def get_by_id(self, cliente_id: int):
        return Cliente.query.filter_by(id=cliente_id, ativo=True).first()
    
    def get_by_cpf(self, cpf: str):
        return Cliente.query.filter_by(cpf=cpf, ativo=True).first()

    def get_by_cpf_any(self, cpf: str):
        """Retorna cliente por CPF independentemente do campo 'ativo' (inclui soft-deleted)."""
        return Cliente.query.filter_by(cpf=cpf).first()
    
    def get_by_email(self, email:str):
        return Cliente.query.filter_by(email=email, ativo=True).first()

    def get_by_email_any(self, email: str):
        """Retorna cliente por email independentemente do campo 'ativo' (inclui soft-deleted)."""
        return Cliente.query.filter_by(email=email).first()
        
    def create(self, cliente: Cliente):
        db.session.add(cliente)
        db.session.commit()
        return cliente
    def update(self, cliente: Cliente):
        db.session.commit()
        return cliente
    def delete(self, cliente: Cliente):
        cliente.desativar()
        db.session.commit()
        return cliente