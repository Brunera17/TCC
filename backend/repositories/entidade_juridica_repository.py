from config import db
from models.empresa import EntidadeJuridica

class EntidadeJuridicaRepository:
    def get_by_id(self, id: int):
        return EntidadeJuridica.query.filter_by(id=id, ativo=True).first()

    def get_by_cliente(self, cliente_id):
        return EntidadeJuridica.query.filter_by(cliente_id=cliente_id, ativo=True).first()

    def get_all(self):
        return EntidadeJuridica.query.filter_by(ativo=True).all()
    def get_by_cnpj(self, cnpj: str):
        return EntidadeJuridica.query.filter_by(cnpj=cnpj, ativo=True).first()
    def get_by_nome_fantasia(self, nome_fantasia: str):
        return EntidadeJuridica.query.filter_by(nome_fantasia=nome_fantasia, ativo=True).first()
    
    def create(self, entidade: EntidadeJuridica):
        db.session.add(entidade)
        db.session.commit()
        return entidade
    def update(self, entidade: EntidadeJuridica):
        db.session.commit()
        return entidade
    def delete(self, entidade: EntidadeJuridica):
        entidade.desativar()
        db.session.commit()
        return entidade