from models.organizacional import Departamento, Empresa, Usuario
from repositories.departamento_repository import DepartamentoRepository
from repositories.empresa_repository import EmpresaRepository

class DepartamentoService:
    """Serviço para gerenciar departamentos"""
    
    def __init__(self):
        self.repository = DepartamentoRepository()
        self.empresa_repository = EmpresaRepository()
    
    # Métodos de busca
    def get_all(self):
        """Retorna todos os departamentos ativos"""
        try:
            departamentos = self.repository.get_all()
            return {
                'success': True,
                'data': [dept.to_json() for dept in departamentos],
                'total': len(departamentos)
            }
        except Exception as e:
            return {
                'success': False,
                'error': f'Erro ao buscar departamentos: {str(e)}'
            }
    
    def get_by_id(self, departamento_id: int):
        """Busca departamento por ID"""
        try:
            if not departamento_id or departamento_id <= 0:
                return {
                    'success': False,
                    'error': 'ID do departamento deve ser um número positivo'
                }
            
            departamento = self.repository.get_by_id(departamento_id)
            if not departamento:
                return {
                    'success': False,
                    'error': 'Departamento não encontrado'
                }
            
            return {
                'success': True,
                'data': departamento.to_json()
            }
        except Exception as e:
            return {
                'success': False,
                'error': f'Erro ao buscar departamento: {str(e)}'
            }
    
    def get_by_empresa(self, empresa_id: int):
        """Busca departamentos por empresa"""
        try:
            if not empresa_id or empresa_id <= 0:
                return {
                    'success': False,
                    'error': 'ID da empresa deve ser um número positivo'
                }
            
            # Verificar se empresa existe
            empresa = self.empresa_repository.get_by_id(empresa_id)
            if not empresa:
                return {
                    'success': False,
                    'error': 'Empresa não encontrada'
                }
            
            departamentos = self.repository.get_by_empresa(empresa_id)
            return {
                'success': True,
                'data': [dept.to_json() for dept in departamentos],
                'total': len(departamentos),
                'empresa': empresa.to_json()
            }
        except Exception as e:
            return {
                'success': False,
                'error': f'Erro ao buscar departamentos da empresa: {str(e)}'
            }
    
    def search(self, termo: str):
        """Busca departamentos por termo no nome"""
        try:
            if not termo or len(termo.strip()) < 2:
                return {
                    'success': False,
                    'error': 'Termo de busca deve ter pelo menos 2 caracteres'
                }
            
            departamentos = self.repository.search_by_nome(termo.strip())
            return {
                'success': True,
                'data': [dept.to_json() for dept in departamentos],
                'total': len(departamentos),
                'termo': termo.strip()
            }
        except Exception as e:
            return {
                'success': False,
                'error': f'Erro na busca: {str(e)}'
            }
    
    # Métodos de CRUD
    def create(self, dados: dict):
        """Cria um novo departamento"""
        try:
            # Validações básicas
            nome = dados.get('nome', '').strip()
            empresa_id = dados.get('empresa_id')
            
            if not nome:
                return {
                    'success': False,
                    'error': 'Nome do departamento é obrigatório'
                }
            
            if not empresa_id:
                return {
                    'success': False,
                    'error': 'ID da empresa é obrigatório'
                }
            
            # Verificar se empresa existe
            empresa = self.empresa_repository.get_by_id(empresa_id)
            if not empresa:
                return {
                    'success': False,
                    'error': 'Empresa não encontrada'
                }
            
            # Verificar se já existe departamento com esse nome na empresa
            if self.repository.exists_by_nome(nome, empresa_id):
                return {
                    'success': False,
                    'error': 'Já existe um departamento com esse nome nesta empresa'
                }
            
            # Criar novo departamento
            departamento = Departamento(
                nome=nome,
                descricao=dados.get('descricao', '').strip(),
                status=dados.get('status', 'ativo'),
                empresa_id=empresa_id
            )
            
            departamento_criado = self.repository.create(departamento)
            
            return {
                'success': True,
                'data': departamento_criado.to_json(),
                'message': 'Departamento criado com sucesso'
            }
            
        except ValueError as ve:
            return {
                'success': False,
                'error': f'Dados inválidos: {str(ve)}'
            }
        except Exception as e:
            return {
                'success': False,
                'error': f'Erro ao criar departamento: {str(e)}'
            }
    
    def update(self, departamento_id: int, dados: dict):
        """Atualiza um departamento existente"""
        try:
            # Buscar departamento
            departamento = self.repository.get_by_id(departamento_id)
            if not departamento:
                return {
                    'success': False,
                    'error': 'Departamento não encontrado'
                }
            
            # Validar dados
            nome = dados.get('nome', '').strip()
            if nome and nome != departamento.nome:
                # Verificar se não existe outro departamento com esse nome na mesma empresa
                if self.repository.exists_by_nome(nome, departamento.empresa_id, departamento.id):
                    return {
                        'success': False,
                        'error': 'Já existe outro departamento com esse nome nesta empresa'
                    }
                departamento.nome = nome
            
            # Atualizar outros campos
            if 'descricao' in dados:
                departamento.descricao = dados['descricao'].strip()
            
            if 'status' in dados:
                status = dados['status'].strip()
                if status in ['ativo', 'inativo', 'suspenso']:
                    departamento.status = status
                else:
                    return {
                        'success': False,
                        'error': 'Status deve ser: ativo, inativo ou suspenso'
                    }
            
            # Salvar alterações
            departamento_atualizado = self.repository.update(departamento)
            
            return {
                'success': True,
                'data': departamento_atualizado.to_json(),
                'message': 'Departamento atualizado com sucesso'
            }
            
        except ValueError as ve:
            return {
                'success': False,
                'error': f'Dados inválidos: {str(ve)}'
            }
        except Exception as e:
            return {
                'success': False,
                'error': f'Erro ao atualizar departamento: {str(e)}'
            }
    
    def delete(self, departamento_id: int):
        """Remove um departamento (soft delete)"""
        try:
            departamento = self.repository.get_by_id(departamento_id)
            if not departamento:
                return {
                    'success': False,
                    'error': 'Departamento não encontrado'
                }
            
            # Verificar se há cargos vinculados
            if departamento.cargos.filter_by(ativo=True).count() > 0:
                return {
                    'success': False,
                    'error': 'Não é possível excluir departamento com cargos ativos vinculados'
                }
            
            # Verificar se há ordens de serviço vinculadas
            if departamento.ordens_servico.filter_by(ativo=True).count() > 0:
                return {
                    'success': False,
                    'error': 'Não é possível excluir departamento com ordens de serviço ativas'
                }
            
            self.repository.delete(departamento)
            
            return {
                'success': True,
                'message': 'Departamento removido com sucesso'
            }
            
        except Exception as e:
            return {
                'success': False,
                'error': f'Erro ao remover departamento: {str(e)}'
            }
    
    # Métodos auxiliares
    def get_estatisticas_empresa(self, empresa_id: int):
        """Retorna estatísticas dos departamentos de uma empresa"""
        try:
            # Verificar se empresa existe
            empresa = self.empresa_repository.get_by_id(empresa_id)
            if not empresa:
                return {
                    'success': False,
                    'error': 'Empresa não encontrada'
                }
            
            departamentos = self.repository.get_by_empresa(empresa_id)
            total = len(departamentos)
            ativos = len([d for d in departamentos if d.status == 'ativo'])
            inativos = len([d for d in departamentos if d.status == 'inativo'])
            
            return {
                'success': True,
                'data': {
                    'empresa': empresa.to_json(),
                    'total_departamentos': total,
                    'departamentos_ativos': ativos,
                    'departamentos_inativos': inativos,
                    'departamentos': [dept.to_json() for dept in departamentos]
                }
            }
            
        except Exception as e:
            return {
                'success': False,
                'error': f'Erro ao gerar estatísticas: {str(e)}'
            }
    
    # Métodos auxiliares
    def usuario_eh_admin_ou_gerente(self, usuario_id: int):
        """Verificar se usuário é admin ou gerente"""
        try:
            usuario = Usuario.query.get(usuario_id)
            return usuario and (usuario.eh_gerente or usuario.tipo_usuario in ['admin', 'gerente'])
        except:
            return False
    
    def usuario_eh_admin(self, usuario_id: int):
        """Verificar se usuário é admin"""
        try:
            usuario = Usuario.query.get(usuario_id)
            return usuario and usuario.tipo_usuario == 'admin'
        except:
            return False