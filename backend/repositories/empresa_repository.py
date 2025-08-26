from config import db
from models import Empresa

class EmpresaRepository:
    """ Repositório para gerenciar empresas """
    # Métodos de busca
    def get_all(self):
        return Empresa.query.filter_by(ativo=True).all()
    
    def get_by_id(self, empresa_id: int):
        return Empresa.query.get(empresa_id, ativo=True).first()
    
    def get_by_cnpj(self, cnpj: str):
        return Empresa.query.filter_by(cnpj=cnpj, ativo=True).first()
    
    def get_by_email(self, email: str):
        if not email:
            return None
        return Empresa.query.filter_by(email=email, ativo=True).first()
    
    # Métodos de CRUD
    def create(self, empresa: Empresa):
        db.session.add(empresa)
        db.session.commit()
        return empresa

    def update(self, empresa: Empresa):
        db.session.commit()
        return empresa
    
    def delete(self, empresa: Empresa):
        empresa.desativar()
        db.session.commit()
        return empresa