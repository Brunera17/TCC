from config import db
from models.tipoAtividade import TipoAtividade

class TipoAtividadeRepository:
    """ Repositório para gerenciar tipos de atividade """

    @staticmethod
    def _gerar_codigo(tipo: TipoAtividade) -> str:
        # Usa as três primeiras letras alfanuméricas do nome como prefixo
        prefixo = ''.join(filter(str.isalnum, tipo.nome or ''))[:3].upper()
        if len(prefixo) < 3:
            prefixo = prefixo.ljust(3, 'X')
        return f"{prefixo}{tipo.id:03d}"

    def get_all(self):
        """Retorna todos os tipos de atividade ativos"""
        return TipoAtividade.query.filter_by(ativo=True).all()
    
    def get_by_id(self, tipo_id: int):
        """Retorna tipo de atividade por ID"""
        return TipoAtividade.query.filter_by(id=tipo_id, ativo=True).first()
    
    def get_by_nome(self, nome: str, ativo_only: bool = True):
        """Busca tipo de atividade por nome"""
        consulta = TipoAtividade.query.filter_by(nome=nome)
        if ativo_only:
            consulta = consulta.filter_by(ativo=True)
        return consulta.first()
    
    def get_by_codigo(self, codigo: str):
        """Busca tipo de atividade por código"""
        return TipoAtividade.query.filter_by(codigo=codigo, ativo=True).first()
    
    def search_by_name(self, nome: str):
        """Busca tipos de atividade por nome (LIKE)"""
        return TipoAtividade.query.filter(
            TipoAtividade.nome.ilike(f'%{nome}%'),
            TipoAtividade.ativo == True
        ).all()

    def create(self, tipo: TipoAtividade):
        """Cria um novo tipo de atividade"""
        db.session.add(tipo)
        db.session.flush()
        if tipo.id and not tipo.codigo:
            tipo.codigo = self._gerar_codigo(tipo)
        db.session.commit()
        return tipo
    
    def update(self, tipo: TipoAtividade):
        """Atualiza um tipo de atividade existente"""
        if tipo.id and not tipo.codigo:
            tipo.codigo = self._gerar_codigo(tipo)
        db.session.commit()
        return tipo
    
    def delete(self, tipo: TipoAtividade):
        """Remove um tipo de atividade (soft delete)"""
        tipo.desativar()
        db.session.commit()
        return tipo