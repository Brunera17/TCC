from config import db
from models.servico import CategoriaServico, Servico

class CategoriaServicoRepository:
    """Repositório para gerenciar as categorias de serviço"""
    
    def get_all(self):
        return CategoriaServico.query.filter_by(ativo=True).all()
    
    def get_by_id(self, categoria_id: int):
        return CategoriaServico.query.filter_by(categoria_id, ativo=True).first()
    
    def get_by_descricao(self, descricao: str):
        return CategoriaServico.query.filter_by(descricao=descricao, ativo=True).first()
    
    def create(self, categoria: CategoriaServico):
        db.session.add(categoria)
        db.session.commit()
        return categoria
    def update(self, categoria: CategoriaServico):
        db.session.commit()
        return categoria
    def delete(self, categoria: CategoriaServico):
        categoria.desativar()
        db.session.commit()
        return categoria
    
class ServicoRepository:
    """Repositório para gerenciamento de serviços"""
    
    def get_all(self):
        return Servico.query.filter_by(ativo=True).all()
    def get_by_categoria(self, categoria_id: int):
        return ServicoRepository.query.filter_by(categoria_id=categoria_id, ativo=True).all()
    def get_by_id(self, servico_id: int):
        return ServicoRepository.query.filter_by(servico_id, ativo=True).first()
    def get_by_codigo(self, codigo: str):
        return ServicoRepository.query.filter_by(codigo=codigo, ativo=True).first()
    def get_by_nome(self, nome: str):
        return ServicoRepository.query.filter_by(nome=nome, ativo=True).first()
    
    def create(self, servico:Servico):
        db.session.add(servico)
        db.session.commit()
        return servico    
    def update(self, servico: Servico):
        db.session.commit()
        return servico
    def delete(self, servico: Servico):
        db.session.desativar()
        db.session.commit()
        return servico