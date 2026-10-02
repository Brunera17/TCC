# services/ordemServico_services.py (CORRIGIDO)

from datetime import datetime, date # <-- NOVO: Importar datetime
from models.ordemServico import OrdemServico, ItemOrdemServico
from repositories.ordemServico_repository import OrdemServicoRepository
#from gerarQRCode import gerar_qrcode_pix
from config import db 
from services.notificacao_service import NotificacaoService
from models.notificacao import Notificacao
from models.organizacional import Usuario

class OrdemServicoService:
    """ Serviço para gerenciar ordens de serviço """

    def __init__(self):
        self.repo = OrdemServicoRepository()
    
    def get_all(self):
        return self.repo.get_all()
    
    def get_all_paginated(self, page: int, per_page: int, status: str | None, search: str | None, empresa_id: int | None = None):
        """
        Busca ordens de serviço de forma paginada e com filtros.
        """
        # 1. Passa os filtros para o repositório construir a query
        query = self.repo.get_query_with_filters(status=status, search=search, empresa_id=empresa_id)
        
        # 2. Executa a paginação na query filtrada
        paginacao = query.paginate(
            page=page,
            per_page=per_page,
            error_out=False
        )
        
        # 3. Formata a resposta para o frontend
        return {
            'data': [ordem.to_json() for ordem in paginacao.items],
            'total': paginacao.total,
            'current_page': paginacao.page,
            'per_page': paginacao.per_page,
            'total_pages': paginacao.pages
        }
    
    def get_by_id(self, ordem_servico_id: int):
        return self.repo.get_by_id(ordem_servico_id)
    
    def get_by_agendamento(self, agendamento_id: int):
        return self.repo.get_by_agendamento(agendamento_id)

    def _converter_data(self, data_str: str | None) -> date | None:
        """Converte uma string YYYY-MM-DD para um objeto date."""
        if not data_str:
            return None
        try:
            return datetime.fromisoformat(data_str).date()
        except ValueError:
            raise ValueError(f"Formato de data inválido: '{data_str}'. Use YYYY-MM-DD.")

    def criar_ordem_servico(self, **data):
        """
        Cria uma nova Ordem de Serviço, tratando os itens aninhados e convertendo datas.
        """
        try:
            itens_data = data.pop('itens', [])
            data.pop('valor_total_os', None)
            # Converter data string para objeto date
            data['vencimento'] = self._converter_data(data.pop('vencimento', None))
            ordem_servico = OrdemServico(**data)
            # Garantir protocolo único
            if ordem_servico.protocolo:
                original_protocolo = ordem_servico.protocolo
                count = 1
                while self.repo.get_by_protocolo(ordem_servico.protocolo):
                    ordem_servico.protocolo = f"{original_protocolo}-{count}"
                    count += 1
            total_os = 0.0
            desconto_maior_20 = False
            for item_data in itens_data:
                if not item_data.get('servico_id') or item_data.get('quantidade') is None:
                    raise ValueError("Dados do item inválidos (servico_id e quantidade são obrigatórios)")
                item_data.pop('valor_total', None)
                novo_item = ItemOrdemServico(
                    servico_id=item_data.get('servico_id'),
                    quantidade=item_data.get('quantidade'),
                    valor_unitario=item_data.get('valor_unitario', 0),
                    desconto=item_data.get('desconto', 0)
                )
                if novo_item.desconto > 20:
                    desconto_maior_20 = True
                novo_item.calcular_valor_total()
                total_os += novo_item.valor_total
                ordem_servico.itens.append(novo_item)
            ordem_servico.valor_total_os = total_os
            # Se desconto > 20% e usuário não for gerente, criar notificação para gerente
            if desconto_maior_20 and not getattr(ordem_servico.usuario, 'eh_gerente', False):
                notificacao_service = NotificacaoService()
                # Buscar todos os gerentes
                gerentes = Usuario.query.filter_by(eh_gerente=True, ativo=True).all()
                from config import db
                for gerente in gerentes:
                    nova_notificacao = Notificacao(
                        usuario_id=gerente.id,
                        ordem_servico_id=ordem_servico.id,
                        tipo='avaliacao_os',
                        titulo=f'OS com desconto > 20% aguardando avaliação',
                        mensagem=f'A ordem de serviço {ordem_servico.protocolo} foi cadastrada com desconto superior a 20% e está aguardando avaliação.',
                        lida=False
                    )
                    db.session.add(nova_notificacao)
                db.session.commit()
            return self.repo.create(ordem_servico)

        except TypeError as e:
            db.session.rollback()
            raise ValueError(f"Erro ao criar Ordem de Serviço: Campos inesperados ou ausentes. Detalhe: {str(e)}")
        except Exception as e:
            db.session.rollback()
            raise e
    
    def atualizar_ordem_servico(self, ordem_servico_id: int, **data):
        """
        Atualiza uma Ordem de Serviço, incluindo a recriação dos seus itens.
        """
        ordem_servico = self.repo.get_by_id(ordem_servico_id)

        if not ordem_servico:
            raise ValueError("Ordem de Serviço não encontrada")
        
        try:
            # 1. Remover dados não atualizáveis
            data.pop('protocolo', None)
            data.pop('usuario_id', None)
            data.pop('valor_total_os', None) # Será recalculado

            # 2. Separar os itens
            itens_data = data.pop('itens', None)

            # 3. Converter a data de vencimento (string -> date object)
            if 'vencimento' in data:
                data['vencimento'] = self._converter_data(data.pop('vencimento', None))

            # 4. Atualizar os campos simples da OS
            for key, value in data.items():
                if hasattr(ordem_servico, key):
                    setattr(ordem_servico, key, value)
            
            # 5. Lógica de atualização dos itens (Limpar e Recriar)
            #    Isso funciona por causa do 'cascade="all, delete-orphan"' no modelo
            if itens_data is not None:
                # Limpa a coleção existente. O delete-orphan fará o DELETE no DB.
                ordem_servico.itens.clear()
                
                total_os = 0.0
                for item_data in itens_data:
                    if not item_data.get('servico_id') or item_data.get('quantidade') is None:
                        raise ValueError("Dados do item inválidos (servico_id e quantidade são obrigatórios)")

                    # Remover dados que não devem vir do frontend
                    item_data.pop('valor_total', None)
                    item_data.pop('id', None) # Remover ID antigo para criar novo
                    item_data.pop('tempId', None) # Remover ID do frontend

                    novo_item = ItemOrdemServico(
                        servico_id=item_data.get('servico_id'),
                        quantidade=item_data.get('quantidade'),
                        valor_unitario=item_data.get('valor_unitario', 0),
                        desconto=item_data.get('desconto', 0)
                    )
                    
                    novo_item.calcular_valor_total()
                    total_os += novo_item.valor_total
                    
                    # Adiciona o novo item (SQLAlchemy entende como INSERT)
                    ordem_servico.itens.append(novo_item)
                
                ordem_servico.valor_total_os = total_os
            
            else:
                # Se nenhum item foi enviado, apenas recalcula o total
                # (embora não deva mudar se os itens não mudaram)
                ordem_servico.calcular_valor_total()
            
            # 6. Salvar as alterações
            return self.repo.update(ordem_servico)

        except TypeError as e:
            db.session.rollback()
            raise ValueError(f"Erro ao atualizar Ordem de Serviço: Campos inesperados ou ausentes. Detalhe: {str(e)}")
        except Exception as e:
            db.session.rollback()
            raise e
    
    def deletar_ordem_servico(self, ordem_servico_id: int):
        ordem_servico = self.repo.get_by_id(ordem_servico_id)
        
        if not ordem_servico:
            raise ValueError("Ordem de Serviço não encontrada")
        
        return self.repo.delete(ordem_servico)