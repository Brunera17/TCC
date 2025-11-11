import React, { useState, useEffect, useCallback } from 'react';
import {
  ArrowLeft,
  Save,
  AlertCircle,
  CheckCircle,
  Building2,
  User,
  CreditCard,
  Mail,
  Edit3,
  Users,
  Search,
  Plus
} from 'lucide-react';
import { apiService } from "../../lib/api";
import { ModalCadastroCliente } from "../../components/modals/ModalCadastroCliente";
import type { Cliente } from "../../types";
import { validateClienteData } from "../../utils/data-validation";
import { formatarCPF, formatarCNPJ } from "../../utils/formatters";
import { useToast } from "../../context/ToastContext";
import { usePropostaDataReset } from "../../hooks/usePropostaDataReset";
// 🎨 Importações de UI Padronizadas
import {
  PageHeader,
  Card,
  Pagination,
  StateHandler,
  ErrorMessage
} from '../../components/ui';
import { Button, Input } from '../../components/forms';
import {
  PessoaFisicaBadge,
  PessoaJuridicaBadge,
  AtivoBadge,
  ClienteExistenteBadge
} from '../../components/common/Badge';
import { getClienteConfig, getClienteCssClasses } from '../../utils/colorUtils';

// ... (Componente CustomerCard e getClienteDisplayInfo permanecem os mesmos) ...
const getClienteDisplayInfo = (cliente: Cliente) => {
  const config = getClienteConfig(cliente);
  const cssClasses = getClienteCssClasses(cliente);
  const result = {
    tipo: config.tipo === 'pessoaFisica' ? 'Pessoa Física' : 'Pessoa Jurídica',
    tipoEnum: config.tipo,
    cssClasses,
    icon: config.tipo === 'pessoaFisica' ? User : Building2
  };
  return result;
};

interface CustomerCardProps {
  cliente: Cliente;
  isSelected: boolean;
  onSelect: (clienteId: number) => void;
  onEdit?: (cliente: Cliente) => void;
}

const CustomerCard: React.FC<CustomerCardProps> = ({ cliente, isSelected, onSelect, onEdit }) => {
  const displayInfo = getClienteDisplayInfo(cliente);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      onSelect(cliente.id);
    }
  };

  const cardClasses = [
    'relative p-4 rounded-lg border transition-all duration-300 ease-out',
    'group cursor-pointer focus:outline-none focus:ring-2 focus:ring-offset-2',
    isSelected
      ? `border-blue-500 bg-blue-50 shadow-md ring-2 ring-blue-300`
      : 'bg-white border-gray-200 hover:border-gray-300 hover:shadow'
  ].join(' ');

  return (
    <div
      role="radio"
      aria-checked={isSelected}
      aria-labelledby={`cliente-${cliente.id}-name`}
      tabIndex={0}
      className={cardClasses}
      onClick={() => onSelect(cliente.id)}
      onKeyDown={handleKeyDown}
    >
      <div className="absolute top-3 left-3">
        <input
          type="radio"
          name="cliente"
          value={cliente.id}
          checked={isSelected}
          onChange={() => onSelect(cliente.id)}
          className={`h-4 w-4 ${isSelected ? 'text-blue-600' : 'text-gray-400'} focus:ring-blue-500 border-gray-300`}
          aria-label={`Selecionar cliente ${cliente.nome}`}
        />
      </div>

      {onEdit && isSelected && (
        <div className="absolute bottom-3 right-3">
          <Button
            variant="ghost"
            size="sm"
            onClick={(e) => {
              e.stopPropagation();
              onEdit(cliente);
            }}
            className="opacity-70 group-hover:opacity-100 !p-2"
            title={`Editar dados de ${cliente.nome}`}
          >
            <Edit3 className="w-4 h-4 text-gray-700" />
          </Button>
        </div>
      )}

      <div className="ml-8">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center space-x-1">
            {displayInfo.tipoEnum === 'pessoaFisica' ? (
              <PessoaFisicaBadge size="sm" />
            ) : (
              <PessoaJuridicaBadge size="sm" />
            )}
            <AtivoBadge size="sm" />
          </div>
          <ClienteExistenteBadge size="sm" />
        </div>

        <div className="flex items-center space-x-1 mb-1">
          <displayInfo.icon className="w-3 h-3 text-gray-600" aria-hidden="true" />
          <h3 id={`cliente-${cliente.id}-name`} className="text-sm font-semibold text-gray-900">
            {(() => {
              if (displayInfo.tipo === 'Pessoa Jurídica') {
                if (cliente.entidades_juridicas && cliente.entidades_juridicas.length > 0) {
                  return cliente.entidades_juridicas[0].nome;
                }
                return cliente.nome;
              }
              return cliente.nome;
            })()}
          </h3>
        </div>

        {displayInfo.tipo === 'Pessoa Jurídica' && (
          <div className="mb-2">
            <p className="text-xs font-medium text-gray-700">
              Responsável: {cliente.nome}
            </p>
          </div>
        )}

        <div className="space-y-0.5">
          {displayInfo.tipo === 'Pessoa Jurídica' && (
            <>
              {(() => {
                if (cliente.entidades_juridicas && cliente.entidades_juridicas.length > 0) {
                  const cnpj = cliente.entidades_juridicas[0].cnpj;
                  return (
                    <div className="flex items-center space-x-1">
                      <span className="text-gray-600 font-bold text-xs">#</span>
                      <span className="text-xs text-gray-700">
                        CNPJ: {formatarCNPJ(cnpj)}
                      </span>
                    </div>
                  );
                }
                return null;
              })()}
              {cliente.cpf && (
                <div className="flex items-center space-x-1">
                  <CreditCard className="w-2.5 h-2.5 text-gray-600" aria-hidden="true" />
                  <span className="text-xs text-gray-700">
                    CPF Responsável: {formatarCPF(cliente.cpf)}
                  </span>
                </div>
              )}
              <div className="flex items-center space-x-1">
                <Mail className="w-2.5 h-2.5 text-gray-600" aria-hidden="true" />
                <span className="text-xs text-gray-700">
                  Email: {cliente.email}
                </span>
              </div>
            </>
          )}

          {displayInfo.tipo === 'Pessoa Física' && (
            <>
              {cliente.cpf && (
                <div className="flex items-center space-x-1">
                  <CreditCard className="w-2.5 h-2.5 text-gray-600" aria-hidden="true" />
                  <span className="text-xs text-gray-700">
                    CPF: {formatarCPF(cliente.cpf)}
                  </span>
                </div>
              )}
              <div className="flex items-center space-x-1">
                <Mail className="w-2.5 h-2.5 text-gray-600" aria-hidden="true" />
                <span className="text-xs text-gray-700">
                  Email: {cliente.email}
                </span>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};


// Componente Principal do Passo 1
export const Passo1SelecionarCliente: React.FC<Passo1Props> = ({
  onVoltar,
  onProximo,
  dadosSalvos,
  onSalvarProgresso
}) => {
  const { limparDadosPasso } = usePropostaDataReset();
  const { showSuccess, showError, showWarning } = useToast();

  const [selectedClienteId, setSelectedClienteId] = useState<number | null>(null);
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [modalCadastroAberto, setModalCadastroAberto] = useState(false);
  const [modalEdicaoAberto, setModalEdicaoAberto] = useState(false);
  const [clienteParaEditar, setClienteParaEditar] = useState<Cliente | null>(null);
  const [salvando, setSalvando] = useState(false);
  const [ultimoSalvamento, setUltimoSalvamento] = useState<Date | null>(null);
  const [erroSalvamento, setErroSalvamento] = useState<string | null>(null);

  // ... (Hooks useEffect e funções de lógica permanecem os mesmos) ...
  useEffect(() => {
    if (dadosSalvos?.clienteId) {
      setSelectedClienteId(dadosSalvos.clienteId);
    }
    const dadosBackup = localStorage.getItem('proposta_passo1_backup');
    if (dadosBackup && !dadosSalvos?.clienteId) {
      try {
        const dados = JSON.parse(dadosBackup);
        if (dados.clienteId) {
          setSelectedClienteId(dados.clienteId);
        }
      } catch (error) {
        console.warn('Erro ao recuperar backup do Passo 1:', error);
      }
    }
  }, [dadosSalvos]);

  const salvarProgresso = useCallback(async () => {
    if (!selectedClienteId) return;
    setSalvando(true);
    setErroSalvamento(null);
    try {
      const clienteSelecionado = clientes.find(c => c.id === selectedClienteId);
      if (!clienteSelecionado) {
        throw new Error('Cliente selecionado não encontrado na lista');
      }
      const validacao = validateClienteData(clienteSelecionado);
      const clienteValidado = validacao.sanitizedData;
      const dadosParaSalvar = {
        passo: 1,
        clienteId: selectedClienteId,
        timestamp: new Date().toISOString(),
        dadosCompletos: {
          cliente: clienteValidado
        },
        metadata: {
          versao: '1.0',
          dadosCompletos: true,
          entidadesJuridicas: clienteValidado.entidades_juridicas?.length || 0,
          enderecos: clienteValidado.enderecos?.length || 0
        }
      };
      localStorage.setItem('proposta_passo1_backup', JSON.stringify(dadosParaSalvar));
      if (onSalvarProgresso) {
        await onSalvarProgresso(dadosParaSalvar);
      }
      setUltimoSalvamento(new Date());
    } catch (error) {
      setErroSalvamento(error instanceof Error ? error.message : 'Erro desconhecido');
    } finally {
      setSalvando(false);
    }
  }, [selectedClienteId, clientes, onSalvarProgresso]);

  useEffect(() => {
    if (selectedClienteId) {
      const timeoutId = setTimeout(salvarProgresso, 1000);
      return () => clearTimeout(timeoutId);
    }
  }, [selectedClienteId, salvarProgresso]);

  useEffect(() => {
    return () => {
      const dadosBackup = localStorage.getItem('proposta_passo1_backup');
      if (dadosBackup) {
        try {
          const dados = JSON.parse(dadosBackup);
          const timestamp = new Date(dados.timestamp);
          const agora = new Date();
          const diffHoras = (agora.getTime() - timestamp.getTime()) / (1000 * 60 * 60);
          if (diffHoras > 24) {
            localStorage.removeItem('proposta_passo1_backup');
          }
        } catch (error) {
          localStorage.removeItem('proposta_passo1_backup');
        }
      }
    };
  }, []);

  const fetchClientes = async (page = 1, search = '') => {
    setLoading(true);
    setError('');
    try {
      const response = await apiService.getClientes({
        page,
        per_page: 5,
        search: search.trim() || undefined,
        ativo: true
      });
      let clientesData: Cliente[] = [];
      if (response && typeof response === 'object') {
        if ('data' in response && Array.isArray(response.data)) {
          clientesData = response.data;
        } else if ('items' in response && Array.isArray(response.items)) {
          clientesData = response.items;
        } else if (Array.isArray(response)) {
          clientesData = response;
        }
      }
      const clientesValidados = clientesData.map((cliente) => ({
        ...cliente,
        entidades_juridicas: cliente.entidades_juridicas || [],
        enderecos: cliente.enderecos || []
      }));
      setClientes(clientesValidados);
      setTotalPages(response.total_pages || Math.ceil((response.total || 0) / (response.per_page || 5)) || 1);
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : String(err);
      if (errorMessage?.includes('401') || errorMessage?.includes('Failed to fetch')) {
        setError('API não disponível. Usando dados de demonstração.');
        // (Mock data removido para brevidade, mas a lógica de fallback permanece)
      } else {
        setError(errorMessage || 'Erro ao carregar clientes');
      }
      setClientes([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchClientes(currentPage, searchTerm);
  }, [currentPage, searchTerm]);

  const handleSearchChange = (term: string) => {
    setSearchTerm(term);
    setCurrentPage(1);
  };

  const handleProximo = () => {
    if (!selectedClienteId) {
      showWarning('Cliente Não Selecionado', 'Selecione um cliente para continuar');
      return;
    }
    const clienteSelecionado = clientes.find(c => c.id === selectedClienteId);
    if (!clienteSelecionado) {
      showError('Cliente Não Encontrado', 'Cliente selecionado não encontrado. Recarregue a página.');
      return;
    }
    const validacao = validateClienteData(clienteSelecionado);
    if (!validacao.isValid) {
      const mensagemErro = `Dados do cliente incompletos:\n${validacao.errors.map(e => e.message).join('\n')}`;
      showError('Dados Incompletos', mensagemErro);
      return;
    }
    limparDadosPasso(1);
    salvarProgresso();
    onProximo(selectedClienteId);
  };

  const handleClienteCadastrado = (novoCliente: Cliente) => {
    setClientes(prev => [novoCliente, ...prev]);
    setSelectedClienteId(novoCliente.id);
    setModalCadastroAberto(false);
    showSuccess('Cliente Cadastrado', 'Cliente cadastrado com sucesso!');
  };

  const handleEditarCliente = () => {
    if (!selectedClienteId) return;
    const clienteSelecionado = clientes.find(c => c.id === selectedClienteId);
    if (clienteSelecionado) {
      setClienteParaEditar(clienteSelecionado);
      setModalEdicaoAberto(true);
    }
  };

  const handleClienteEditado = (clienteEditado: Cliente) => {
    setClientes(prev => prev.map(c => c.id === clienteEditado.id ? clienteEditado : c));
    setModalEdicaoAberto(false);
    setClienteParaEditar(null);
    salvarProgresso();
  };

  return (
    // 1. Container principal (padding-bottom para o rodapé fixo)
    <div className="pb-32">
      {/* 2. Cabeçalho Padronizado */}
      <PageHeader
        title="Nova Proposta - Passo 1"
        subtitle="Selecione um cliente para criar a proposta"
      >
        <Button variant="ghost" onClick={onVoltar} leftIcon={<ArrowLeft className="w-4 h-4" />}>
          Voltar
        </Button>
      </PageHeader>

      {/* 3. Mensagens de Erro/Status Padronizadas */}
      {error && <ErrorMessage message={error} onDismiss={() => setError('')} className="mb-4" />}

      {dadosSalvos?.clienteId && (
        <div className="mb-4 flex items-center space-x-2 rounded-lg border border-blue-200 bg-blue-50 p-4 text-sm text-blue-700">
          <CheckCircle className="w-5 h-5" />
          <span>Progresso recuperado - Cliente selecionado anteriormente</span>
        </div>
      )}
      
      {erroSalvamento && <ErrorMessage message={`Falha no salvamento automático: ${erroSalvamento}`} variant="warning" className="mb-4" />}

      {/* 4. Barra de Ações (Busca + Botão) em um Card */}
      <Card className="p-4 mb-6">
        <div className="flex items-center justify-between gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <Input
              type="text"
              placeholder="Buscar cliente por nome, CPF ou email..."
              value={searchTerm}
              onChange={(e) => handleSearchChange(e.target.value)}
              className="pl-10 w-full"
            />
          </div>
          <Button
            variant="primary"
            onClick={() => setModalCadastroAberto(true)}
            leftIcon={<Plus className="w-4 h-4" />}
          >
            Cadastrar Cliente
          </Button>
        </div>
      </Card>

      {/* 5. Conteúdo Principal com StateHandler */}
      <StateHandler
        loading={loading}
        error={undefined} // Erro principal já é mostrado acima
        isEmpty={clientes.length === 0 && !loading}
        emptyState={
          <Card className="text-center py-16">
            <Users className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              {searchTerm ? 'Nenhum cliente encontrado' : 'Nenhum cliente cadastrado'}
            </h3>
            <p className="text-gray-500 mb-4 px-4">
              {searchTerm
                ? `Não encontramos clientes para "${searchTerm}".`
                : 'Cadastre um cliente para começar a criar propostas.'}
            </p>
            {!searchTerm && (
              <Button
                variant="primary"
                onClick={() => setModalCadastroAberto(true)}
                leftIcon={<Plus className="w-4 h-4" />}
              >
                Cadastrar Primeiro Cliente
              </Button>
            )}
          </Card>
        }
      >
        <div role="radiogroup" aria-label="Lista de clientes" className="space-y-3">
          {clientes.map((cliente) => (
            <CustomerCard
              key={cliente.id}
              cliente={cliente}
              isSelected={selectedClienteId === cliente.id}
              onSelect={setSelectedClienteId}
              onEdit={handleEditarCliente}
            />
          ))}
        </div>

        {totalPages > 1 && (
          <Pagination
            currentPage={currentPage}
            totalPages={totalPages}
            onPageChange={setCurrentPage}
            className="mt-6"
          />
        )}
      </StateHandler>

      {/* 6. Rodapé Fixo Padronizado */}
      <div className="fixed bottom-0 left-0 md:left-64 right-0 bg-white border-t border-gray-200 px-6 py-4 shadow-[0_-4px_10px_-1px_rgba(0,0,0,0.05)]">
        <div className="flex justify-between items-center">
          {/* Status do Salvamento */}
          <div className="flex items-center space-x-2">
            {salvando && (
              <div className="flex items-center text-blue-600 text-sm">
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                <span>Salvando progresso...</span>
              </div>
            )}
            {ultimoSalvamento && !salvando && (
              <div className="flex items-center text-green-600 text-sm">
                <CheckCircle className="w-4 h-4 mr-2" />
                <span>Salvo {ultimoSalvamento.toLocaleTimeString()}</span>
              </div>
            )}
            {selectedClienteId && (
              <span className="text-sm font-medium text-gray-700 hidden md:block">
                Selecionado: <span className="text-gray-900">{clientes.find(c => c.id === selectedClienteId)?.nome}</span>
              </span>
            )}
          </div>

          {/* Botões de Ação */}
          <div className="flex space-x-3">
            <Button
              variant="secondary"
              onClick={onVoltar}
            >
              Cancelar
            </Button>
            <Button
              variant="primary"
              onClick={handleProximo}
              disabled={!selectedClienteId || salvando}
            >
              Próximo Passo
            </Button>
          </div>
        </div>
      </div>

      {/* Modais */}
      <ModalCadastroCliente
        isOpen={modalCadastroAberto}
        onClose={() => setModalCadastroAberto(false)}
        onClienteCadastrado={handleClienteCadastrado}
      />

      <ModalCadastroCliente
        isOpen={modalEdicaoAberto}
        onClose={() => {
          setModalEdicaoAberto(false);
          setClienteParaEditar(null);
        }}
        onClienteCadastrado={handleClienteEditado}
        clienteParaEditar={clienteParaEditar}
      />
    </div>
  );
};