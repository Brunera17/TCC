from typing import Optional

from models.tipoAtividade import TipoAtividade
from repositories.tipo_atividade_repository import TipoAtividadeRepository

class TipoAtividadeService:
    """ Serviços para gerenciar tipos de atividade """

    _ALLOWED_FIELDS = {"nome", "descricao", "codigo", "ativo", "aplicavel_pj"}

    def __init__(self):
        self.repo = TipoAtividadeRepository()

    @staticmethod
    def _normalize_aplicabilidade(payload: Optional[dict]) -> None:
        if not payload:
            return

        if 'aplicavel_pf' in payload and 'aplicavel_pj' not in payload:
            payload['aplicavel_pj'] = not bool(payload['aplicavel_pf'])

        if 'aplicavel_pj' in payload:
            payload['aplicavel_pj'] = bool(payload['aplicavel_pj'])

        payload.pop('aplicavel_pf', None)

    def _sanitize_payload(self, payload: Optional[dict]) -> dict:
        """Remove chaves desconhecidas e retorna apenas campos aceitos."""
        if not payload:
            return {}
        return {k: v for k, v in payload.items() if k in self._ALLOWED_FIELDS}
    
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
        self._normalize_aplicabilidade(data)
        data = self._sanitize_payload(data)

        # Validações básicas
        if not data.get('nome'):
            raise ValueError("Nome é obrigatório")

        data['nome'] = data['nome'].strip()
        if not data['nome']:
            raise ValueError("Nome é obrigatório")

        if 'codigo' in data:
            codigo = data.get('codigo')
            if codigo is None:
                data.pop('codigo', None)
            else:
                codigo = codigo.strip()
                if not codigo:
                    data.pop('codigo', None)
                else:
                    data['codigo'] = codigo
        
        # Verificar se já existe tipo com esse nome
        existing = self.repo.get_by_nome(data['nome'], ativo_only=False)
        if existing:
            if existing.ativo:
                raise ValueError("Já existe um tipo de atividade com esse nome")

            # Reativar registro existente com os novos dados
            for campo, valor in data.items():
                if hasattr(existing, campo):
                    setattr(existing, campo, valor)
            existing.ativo = True
            existing.deleted_at = None
            return self.repo.update(existing)
        
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
        
        self._normalize_aplicabilidade(data)
        data = self._sanitize_payload(data)

        if 'nome' in data and data['nome'] is not None:
            data['nome'] = data['nome'].strip()
            if not data['nome']:
                raise ValueError("Nome é obrigatório")

        if 'codigo' in data:
            codigo = data.get('codigo')
            if codigo is None:
                data['codigo'] = None
            else:
                codigo = codigo.strip()
                if not codigo:
                    data['codigo'] = None
                else:
                    data['codigo'] = codigo

        # Verificar se novo nome já existe (se nome foi alterado)
        if 'nome' in data and data['nome'] != tipo.nome:
            existing = self.repo.get_by_nome(data['nome'], ativo_only=False)
            if existing:
                raise ValueError("Já existe um tipo de atividade com esse nome")
        
        # Verificar se novo código já existe (se código foi alterado)
        if 'codigo' in data and data['codigo'] and data['codigo'] != tipo.codigo:
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