from config import db
from models.cliente import Endereco

class EnderecoRepository:
    """ Repositório para gerenciar endereços """

    def get_by_cliente(self, cliente_id: int):
        return Endereco.query.filter_by(cliente_id, ativo=True).first()
    def get_by_cidade(self, cidade: str):
        return Endereco.query.filter_by(cidade=cidade, ativo=True).first()
    def get_by_uf(self, uf: str):
        return Endereco.query.filter_by(uf=uf, ativo=True).first()
    def get_by_cep(self, cep: str):
        return Endereco.query.filter_by(cep=cep, ativo=True).first()

    def create(self, endereco: Endereco):
        db.session.add(endereco)
        db.session.commit()
        return endereco
    def update(self, endereco: Endereco):
        db.session.commit()
        return endereco
    def delete(self, endereco: Endereco):
        endereco.desativar()
        db.session.commit()
        return endereco
