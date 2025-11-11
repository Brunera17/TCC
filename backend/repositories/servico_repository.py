import uuid
from config import db
from models.servico import CategoriaServico, Servico

class CategoriaServicoRepository:
    """Repositório para gerenciar as categorias de serviço"""
    
    def get_all(self):
        # Geralmente bom manter o filtro ativo aqui para listagens gerais
        return CategoriaServico.query.filter_by(ativo=True).all()
    
    def get_by_id(self, categoria_id: int):
        # Pode fazer sentido remover o filtro ativo=True aqui também,
        # dependendo se você precisa buscar categorias inativas por ID.
        return CategoriaServico.query.filter_by(id=categoria_id).first() 
        # return CategoriaServico.query.filter_by(id=categoria_id, ativo=True).first() # Original
    
    def get_by_descricao(self, descricao: str):
        # Manter filtro ativo para buscas gerais
        return CategoriaServico.query.filter_by(descricao=descricao, ativo=True).first()
    
    def get_by_nome(self, nome: str):
        # Remover filtro ativo=True para permitir encontrar inativos
        # e tratar a lógica de duplicidade/reativação no Service
        return CategoriaServico.query.filter_by(nome=nome).first()
        # return CategoriaServico.query.filter_by(nome=nome, ativo=True).first() # Original
    
    def create(self, categoria: CategoriaServico):
        db.session.add(categoria)
        db.session.commit()
        return categoria

    def update(self, categoria: CategoriaServico):
        # Certifique-se que a lógica de update não sobrescreva 'ativo'
        # a menos que seja intencional (ex: reativar)
        db.session.commit()
        return categoria

    def delete(self, categoria: CategoriaServico):
        categoria.ativo = False # Soft delete
        # Se tiver um método categoria.desativar(), use-o
        # categoria.desativar() 
        db.session.commit()
        return categoria
    
class ServicoRepository:
    """Repositório para gerenciamento de serviços"""
    
    def get_all(self, ativo_only: bool = True): # Adicionado parâmetro opcional
        """Retorna serviços. Por padrão, apenas os ativos."""
        query = Servico.query
        if ativo_only:
            query = query.filter_by(ativo=True)
        return query.all()

    def get_by_categoria(self, categoria_id: int, ativo_only: bool = True): # Adicionado parâmetro opcional
        """Retorna serviços por categoria. Por padrão, apenas os ativos."""
        query = Servico.query.filter_by(categoria_id=categoria_id)
        if ativo_only:
            query = query.filter_by(ativo=True)
        return query.all()

    def get_by_id(self, servico_id: int):
        """Busca serviço por ID, independentemente do status ativo."""
        # Geralmente busca por ID deve encontrar mesmo inativos
        return Servico.query.filter_by(id=servico_id).first()
        # return Servico.query.filter_by(id=servico_id, ativo=True).first() # Original

    def get_by_codigo(self, codigo: str):
        """Busca serviço por código, independentemente do status ativo."""
        # 👇 CORREÇÃO: Removido filtro ativo=True
        return Servico.query.filter_by(codigo=codigo).first()
        # return Servico.query.filter_by(codigo=codigo, ativo=True).first() # Original

    def get_by_nome(self, nome: str):
        """Busca serviço por nome, independentemente do status ativo."""
        # 👇 CORREÇÃO: Removido filtro ativo=True
        return Servico.query.filter_by(nome=nome).first()
        # return Servico.query.filter_by(nome=nome, ativo=True).first() # Original
    
    def create(self, servico: Servico):
        """
        Cria o serviço com um código placeholder, commita para obter o ID,
        gera o código final e atualiza o serviço em um segundo commit.
        """
        placeholder_codigo = f"TEMP-{uuid.uuid4()}"
        servico.codigo = placeholder_codigo
        try:
            db.session.add(servico)
            db.session.commit()
            print(f"INFO: Serviço ID {servico.id} criado inicialmente com placeholder '{placeholder_codigo}'")

            # Verifica se o ID foi realmente gerado
            if not servico.id:
                raise ValueError("ID do serviço não gerado após o primeiro commit.")

            # Gera o código final AGORA que temos o ID definitivo
            prefixo = ''.join(filter(str.isalnum, servico.nome))[:4].upper()
            if len(prefixo) < 4: prefixo = prefixo.ljust(4, 'X')
            codigo_final = f"{prefixo}{servico.id:03d}"
            servico.codigo = codigo_final

            # Segundo Commit: Atualiza com o código final
            db.session.add(servico) # Adiciona novamente para rastrear a mudança do código
            db.session.commit()
            print(f"INFO: Código final '{codigo_final}' atualizado para serviço ID {servico.id}")
            return servico
        except Exception as e:
            db.session.rollback()
            print(f"ERRO no ServicoRepository.create (two-commit): {e}")
            servico_temp = self.get_by_codigo(placeholder_codigo)
            if servico_temp:
                try:
                    db.session.delete(servico_temp)
                    db.session.commit()
                    print(f"INFO: Registro temporário com placeholder '{placeholder_codigo}' removido após erro.")
                except Exception as cleanup_error:
                    print(f"ERRO ao limpar registro temporário: {cleanup_error}")
                    db.session.rollback()

            raise e

    def update(self, servico: Servico):
        db.session.add(servico)
        db.session.commit()
        return servico

    def delete(self, servico: Servico):
        """Desativa (soft delete) um serviço."""
        servico.ativo = False # Soft delete direto no repositório
        # Se o seu modelo Servico tem um método desativar():
        # servico.desativar() 
        db.session.add(servico) # Garante que a mudança seja rastreada
        db.session.commit()
        return servico