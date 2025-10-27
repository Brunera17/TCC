# -*- coding: utf-8 -*-
"""
Arquivo de inicialização dos modelos
Importa todos os modelos na ordem correta para resolver dependências
"""

# Importar base mixins primeiro
from .base import TimestampMixin, ActiveMixin

# Modelos independentes (sem FK para outros modelos internos)
from .organizacional import Empresa, Departamento, Cargo, Usuario
from .servico import CategoriaServico, Servico
from .tipoAtividade import TipoAtividade

# Modelos com dependências simples
from .cliente import Cliente, Endereco

# Modelos com dependências complexas (ordem importa)
from .entidadeJuridica import RegimeTributario, FaixaFaturamento, TipoEmpresa, EntidadeJuridica
from .solicitacao import Solicitacao
from .relatorio import Relatorio
from .agendamento import Agendamento
from .proposta import ItemProposta, Proposta
from .ordemServico import ItemOrdemServico, OrdemServico

# Lista de todos os modelos para facilitar imports
__all__ = [
    'TimestampMixin',
    'ActiveMixin',
    'Empresa', 
    'Departamento', 
    'Cargo', 
    'Usuario',
    'CategoriaServico', 
    'Servico',
    'TipoAtividade',
    'Cliente', 
    'Endereco',
    'RegimeTributario', 
    'FaixaFaturamento', 
    'TipoEmpresa', 
    'EntidadeJuridica',
    'Solicitacao',
    'Relatorio',
    'Agendamento',
    'ItemProposta', 
    'Proposta',
    'ItemOrdemServico', 
    'OrdemServico'
]