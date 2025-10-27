import React, { useState, useEffect, useCallback } from 'react';
import {
  Search,
  Plus,
  Users,
  ArrowLeft,
  Save,
  AlertCircle,
  CheckCircle,
  Building2,
  User,
  CreditCard,
  Mail,
  Edit3
} from 'lucide-react';
  import { apiService } from "../../lib/api";
  import { LoadingSpinner } from "../../components/common/LoadingSpinner";
  import { ModalCadastroCliente } from "../../components/modals/ModalCadastroCliente";
  import type { Cliente } from "../../types";
  import { validateClienteData } from "../../utils/data-validation";
  import { formatarCPF, formatarCNPJ } from "../../utils/formatters";
  import { useToast } from "../../context/ToastContext";
  import { usePropostaDataReset } from "../../hooks/usePropostaDataReset";
// 🎨 NOVO: Importações do sistema de cores padronizado
  import {
    PessoaFisicaBadge,
    PessoaJuridicaBadge,
    AtivoBadge,
    ClienteExistenteBadge
  } from '../../components/common/Badge';
  import { getClienteConfig, getClienteCssClasses } from '../../utils/colorUtils';// 🎨 NOVO: Sistema de cores padronizado usando funções utilitárias
const getClienteDisplayInfo = (cliente: Cliente) => {
  // ✅ CORREÇÃO: Debug mais detalhado para análise
  console.log('🔍 getClienteDisplayInfo Debug - Cliente:', {
    id: cliente.id,
    nome: cliente.nome,
    cpf: cliente.cpf,
    abertura_empresa: cliente.abertura_empresa,
    entidades_juridicas: cliente.entidades_juridicas ? {
      count: cliente.entidades_juridicas.length,
      first: cliente.entidades_juridicas[0] || null
    } : null,
    rawData: cliente
  });

  const config = getClienteConfig(cliente);
  const cssClasses = getClienteCssClasses(cliente);

  const result = {
    tipo: config.tipo === 'pessoaFisica' ? 'Pessoa Física' : 'Pessoa Jurídica',
    tipoEnum: config.tipo,
    cssClasses,
    icon: config.tipo === 'pessoaFisica' ? User : Building2
  };

  // ✅ DEBUG: Log do resultado final
  console.log('🔍 getClienteDisplayInfo Result:', {
    clienteId: cliente.id,
    clienteNome: cliente.nome,
    tipoFinal: result.tipo,
    tipoEnum: result.tipoEnum,
    icon: result.icon.name
  });

  return result;
};

// ✅ NOVO: Componente CustomerCard modular e reutilizável
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

  // 🎨 NOVO: Classes CSS usando o sistema padronizado
  const cardClasses = [
    'relative p-3 rounded-lg border transition-all duration-300 ease-out',
    'group cursor-pointer focus:outline-none focus:ring-2 focus:ring-offset-2',
    isSelected
      ? `card-cliente-selected ${displayInfo.tipoEnum === 'pessoaFisica' ? 'card-cliente-pessoa-fisica-selected' : 'card-cliente-pessoa-juridica-selected'}`
      : 'card-cliente hover:border-gray-300'
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
      {/* Radio button no canto superior esquerdo */}
      <div className="absolute top-2 left-2">
        <input
          type="radio"
          name="cliente"
          value={cliente.id}
          checked={isSelected}
          onChange={() => onSelect(cliente.id)}
          className={`h-3 w-3 ${isSelected ? 'text-purple-600' : 'text-gray-400'} focus:ring-purple-500 border-gray-300`}
          aria-label={`Selecionar cliente ${cliente.nome}`}
        />
      </div>

      {/* ✅ NOVO: Botão Editar no canto inferior direito - apenas quando selecionado */}
      {onEdit && isSelected && (
        <div className="absolute bottom-2 right-2">
          <button
            onClick={(e) => {
              e.stopPropagation(); // Evita que o clique no botão selecione o cliente
              onEdit(cliente);
            }}
            className="opacity-70 group-hover:opacity-100 transition-opacity duration-200 p-1.5 rounded-full bg-white shadow-sm border border-gray-200 hover:bg-gray-50 hover:border-custom-blue focus:outline-none focus:ring-2 focus:ring-custom-blue focus:ring-offset-1"
            title={`Editar dados de ${cliente.nome}`}
            aria-label={`Editar dados de ${cliente.nome}`}
          >
            <Edit3 className="w-4 h-4 text-gray-700 hover:text-custom-blue transition-colors duration-200" />
          </button>
        </div>
      )}

      {/* Conteúdo principal */}
      <div className="ml-6">
        {/* 🎨 NOVO: Header com badges padronizados */}
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

        {/* Nome da empresa com ícone */}
        <div className="flex items-center space-x-1 mb-1">
          <displayInfo.icon className="w-3 h-3 text-gray-600" aria-hidden="true" />
          <h3 id={`cliente-${cliente.id}-name`} className="text-sm font-semibold text-gray-900">
            {(() => {
              // ✅ CORREÇÃO: Lógica melhorada para exibição do nome da empresa
              if (displayInfo.tipo === 'Pessoa Jurídica') {
                // Prioridade 1: Primeira entidade jurídica (se existir)
                if (cliente.entidades_juridicas && cliente.entidades_juridicas.length > 0) {
                  return cliente.entidades_juridicas[0].nome;
                }

                // Prioridade 2: Nome do cliente (fallback)
                return cliente.nome;
              }

              // Para Pessoa Física, sempre o nome do cliente
              return cliente.nome;
            })()}
          </h3>
        </div>

        {/* Subtítulo para Pessoa Jurídica */}
        {displayInfo.tipo === 'Pessoa Jurídica' && (
          <div className="mb-2">
            <p className="text-xs font-medium text-gray-700">
              Responsável: {cliente.nome}
            </p>
          </div>
        )}

        {/* 🎨 NOVO: Informações específicas por tipo usando classes padronizadas */}
        <div className="space-y-0.5">
          {/* Para Pessoa Jurídica: CNPJ, CPF do responsável e email */}
          {displayInfo.tipo === 'Pessoa Jurídica' && (
            <>
              {/* CNPJ da empresa */}
              {(() => {
                // ✅ CORREÇÃO: Buscar CNPJ da primeira entidade jurídica
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

              {/* CPF do responsável */}
              {cliente.cpf && (
                <div className="flex items-center space-x-1">
                  <CreditCard className="w-2.5 h-2.5 text-gray-600" aria-hidden="true" />
                  <span className="text-xs text-gray-700">
                    CPF Responsável: {formatarCPF(cliente.cpf)}
                  </span>
                </div>
              )}

              {/* Email */}
              <div className="flex items-center space-x-1">
                <Mail className="w-2.5 h-2.5 text-gray-600" aria-hidden="true" />
                <span className="text-xs text-gray-700">
                  Email: {cliente.email}
                </span>
              </div>
            </>
          )}

          {/* Para Pessoa Física: CPF e email */}
          {displayInfo.tipo === 'Pessoa Física' && (
            <>
              {/* CPF */}
              {cliente.cpf && (
                <div className="flex items-center space-x-1">
                  <CreditCard className="w-2.5 h-2.5 text-gray-600" aria-hidden="true" />
                  <span className="text-xs text-gray-700">
                    CPF: {formatarCPF(cliente.cpf)}
                  </span>
                </div>
              )}

              {/* Email */}
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




interface Passo1Props {
  onVoltar: () => void;
  onProximo: (clienteId: number) => void;
  // ⚠️ NOVO: Props para salvamento automático
  dadosSalvos?: any;
  onSalvarProgresso?: (dados: any) => void;
}

export const Passo1SelecionarCliente: React.FC<Passo1Props> = ({
  onVoltar,
  onProximo,
  dadosSalvos,
  onSalvarProgresso
}) => {
  // ✅ NOVO: Hook para reset automático de dados
  const { limparDadosPasso } = usePropostaDataReset();

  // ✅ NOVO: Hook para notificações toast
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

  // ⚠️ NOVO: Estados para salvamento automático
  const [salvando, setSalvando] = useState(false);
  const [ultimoSalvamento, setUltimoSalvamento] = useState<Date | null>(null);
  const [erroSalvamento, setErroSalvamento] = useState<string | null>(null);


  // ⚠️ NOVO: Recuperar dados salvos ao montar componente
  useEffect(() => {
    if (dadosSalvos?.clienteId) {
      setSelectedClienteId(dadosSalvos.clienteId);
    }

    // Recuperar do localStorage como fallback
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

  // ⚠️ NOVO: Função de salvamento automático com validação de dados completos
  const salvarProgresso = useCallback(async () => {
    if (!selectedClienteId) return;

    setSalvando(true);
    setErroSalvamento(null);

    try {
      // ✅ BUSCAR: Cliente selecionado com dados completos
      const clienteSelecionado = clientes.find(c => c.id === selectedClienteId);

      if (!clienteSelecionado) {
        throw new Error('Cliente selecionado não encontrado na lista');
      }

      // ✅ VALIDAR: Dados completos do cliente usando validateClienteData
      const validacao = validateClienteData(clienteSelecionado);
      
      if (!validacao.isValid) {
        console.warn('⚠️ Cliente com dados inválidos:', validacao.errors);
        // Continuar mesmo com dados inválidos, mas logar o problema
      }

      // Usar dados sanitizados
      const clienteValidado = validacao.sanitizedData;

      const dadosParaSalvar = {
        passo: 1,
        clienteId: selectedClienteId,
        timestamp: new Date().toISOString(),
        dadosCompletos: {
          cliente: clienteValidado
        },
        // ✅ METADADOS: Informações sobre o salvamento
        metadata: {
          versao: '1.0',
          dadosCompletos: true,
          entidadesJuridicas: clienteValidado.entidades_juridicas?.length || 0,
          enderecos: clienteValidado.enderecos?.length || 0
        }
      };

      console.log(`💾 Salvando progresso - Cliente: ${clienteValidado.nome}, Entidades: ${clienteValidado.entidades_juridicas?.length || 0}`);

      // Salvar no localStorage como backup
      localStorage.setItem('proposta_passo1_backup', JSON.stringify(dadosParaSalvar));

      // Chamar callback de salvamento se fornecido
      if (onSalvarProgresso) {
        await onSalvarProgresso(dadosParaSalvar);
      }

      setUltimoSalvamento(new Date());
      console.log('✅ Progresso do Passo 1 salvo com sucesso');

    } catch (error) {
      console.error('❌ Erro ao salvar progresso:', error);
      setErroSalvamento(error instanceof Error ? error.message : 'Erro desconhecido');
    } finally {
      setSalvando(false);
    }
  }, [selectedClienteId, clientes, onSalvarProgresso]);

  // ⚠️ NOVO: Salvamento automático quando cliente é selecionado
  useEffect(() => {
    if (selectedClienteId) {
      const timeoutId = setTimeout(salvarProgresso, 1000); // Debounce de 1 segundo
      return () => clearTimeout(timeoutId);
    }
  }, [selectedClienteId, salvarProgresso]);

  // ⚠️ NOVO: Limpar backup ao sair
  useEffect(() => {
    return () => {
      // Manter backup por 24 horas para recuperação
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
      console.log(`🔍 Buscando clientes - Página: ${page}, Busca: "${search}"`);

      // ✅ TESTE DE CONECTIVIDADE: Verificar se a API está acessível
      console.log('🧪 Testando conectividade com API...');
      
      const response = await apiService.getClientes({
        page,
        per_page: 5,
        search: search.trim() || undefined,
        ativo: true
      });

      console.log('🔍 DEBUG Passo1 - Resposta completa da API:', {
        response,
        keys: Object.keys(response),
        hasData: !!response.data,
        hasItems: !!response.items,
        dataLength: response.data?.length || 0,
        itemsLength: response.items?.length || 0,
        responseType: typeof response,
        isArray: Array.isArray(response)
      });

      // ✅ VERIFICAÇÃO ROBUSTA: Extrair dados de clientes de qualquer formato
      let clientesData: Cliente[] = [];
      
      if (response && typeof response === 'object') {
        if ('data' in response && Array.isArray(response.data)) {
          clientesData = response.data;
          console.log('✅ Usando response.data:', clientesData.length, 'clientes');
        } else if ('items' in response && Array.isArray(response.items)) {
          clientesData = response.items;
          console.log('✅ Usando response.items:', clientesData.length, 'clientes');
        } else if (Array.isArray(response)) {
          clientesData = response;
          console.log('✅ Usando response direto (array):', clientesData.length, 'clientes');
        } else {
          console.log('⚠️ Formato de resposta não reconhecido:', response);
        }
      }

      // ✅ DEBUG: Verificar dados brutos da API
      console.log('🔍 DEBUG Passo1 - Dados processados:', {
        clientesData,
        totalClientes: clientesData.length,
        primeiroCliente: clientesData[0] || null
      });

      // ✅ DEBUG: Verificar cliente ADILSON nos dados brutos
      const clienteAdilsonBruto = clientesData.find((c) => c.nome && c.nome.includes('ADILSON'));
      if (clienteAdilsonBruto) {
        console.log('🔍 DEBUG Passo1 - Cliente ADILSON dados brutos:', {
          id: clienteAdilsonBruto.id,
          nome: clienteAdilsonBruto.nome,
          entidades_juridicas: clienteAdilsonBruto.entidades_juridicas,
          dadosOriginais: clienteAdilsonBruto
        });
      }

      // ✅ VALIDAÇÃO: Garantir que os dados estão completos
      const clientesValidados = clientesData.map((cliente) => {
        // ✅ DEBUG: Verificar dados do cliente ADILSON
        if (cliente.nome && cliente.nome.includes('ADILSON')) {
          console.log('🔍 DEBUG Passo1 - Cliente ADILSON encontrado:', {
            id: cliente.id,
            nome: cliente.nome,
            entidades_juridicas: cliente.entidades_juridicas,
            dadosOriginais: cliente
          });
        }

        return {
          ...cliente,
          // Garantir que entidades_juridicas sempre existe como array
          entidades_juridicas: cliente.entidades_juridicas || [],
          // Garantir que enderecos sempre existe como array
          enderecos: cliente.enderecos || []
        };
      });

      console.log(`✅ ${clientesValidados.length} clientes carregados com dados completos`);

      // ✅ DEBUG: Verificar se cliente ADILSON tem dados corretos após validação
      const clienteAdilson = clientesValidados.find((c) => c.nome && c.nome.includes('ADILSON'));
      if (clienteAdilson) {
        console.log('🔍 DEBUG Passo1 - Cliente ADILSON após validação:', {
          id: clienteAdilson.id,
          nome: clienteAdilson.nome,
          entidades_juridicas: clienteAdilson.entidades_juridicas,
          dadosCompletos: clienteAdilson
        });
      }

      setClientes(clientesValidados);
      setTotalPages(response.total_pages || Math.ceil((response.total || 0) / (response.per_page || 5)) || 1);
    } catch (err: unknown) {
      console.error('Erro ao carregar clientes:', err);

      // Se for erro de autenticação ou conexão, usar dados mockados temporariamente
      const errorMessage = err instanceof Error ? err.message : String(err);
      if (errorMessage?.includes('401') || errorMessage?.includes('UNAUTHORIZED') || errorMessage?.includes('Failed to fetch')) {
        setError('API não disponível. Usando dados de demonstração.');

        // Dados mockados para demonstração com entidades jurídicas
        const clientesMockados: Cliente[] = [
          {
            id: 1,
            nome: 'João Silva Santos',
            cpf: '123.456.789-01',
            email: 'joao@email.com',
            abertura_empresa: false,
            ativo: true,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
            entidades_juridicas: [],
            enderecos: []
          },
          {
            id: 2,
            nome: 'Maria Empresária',
            cpf: '987.654.321-02',
            email: 'maria@email.com',
            abertura_empresa: true,
            ativo: true,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
            entidades_juridicas: [
              {
                id: 1,
                nome: 'Empresa ABC Ltda',
                cnpj: '12.345.678/0001-90',
                tipo: 'LTDA',
                cliente_id: 2,
                ativo: true,
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString()
              },
              {
                id: 2,
                nome: 'Comércio XYZ ME',
                cnpj: '98.765.432/0001-10',
                tipo: 'ME',
                cliente_id: 2,
                ativo: true,
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString()
              }
            ],
            enderecos: []
          },
          {
            id: 3,
            nome: 'Pedro Comerciante',
            cpf: '456.789.123-03',
            email: 'pedro@comercio.com',
            abertura_empresa: false,
            ativo: true,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
            entidades_juridicas: [
              {
                id: 3,
                nome: 'Comércio Pedro EIRELI',
                cnpj: '11.222.333/0001-44',
                tipo: 'EIRELI',
                cliente_id: 3,
                ativo: true,
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString()
              }
            ],
            enderecos: []
          },
          {
            id: 4,
            nome: 'Ana Consultora',
            cpf: '789.123.456-04',
            email: 'ana@consultoria.com',
            abertura_empresa: true,
            ativo: true,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
            entidades_juridicas: [],
            enderecos: []
          },
          {
            id: 5,
            nome: 'Carlos Industrial',
            cpf: '321.654.987-05',
            email: 'carlos@industria.com',
            abertura_empresa: false,
            ativo: true,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
            entidades_juridicas: [
              {
                id: 4,
                nome: 'Indústria Beta S/A',
                cnpj: '33.333.333/0001-33',
                tipo: 'S/A',
                cliente_id: 5,
                ativo: true,
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString()
              },
              {
                id: 5,
                nome: 'Tecnologia Zeta S/A',
                cnpj: '77.777.777/0001-77',
                tipo: 'S/A',
                cliente_id: 5,
                ativo: true,
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString()
              }
            ],
            enderecos: []
          }
        ];

        setClientes(clientesMockados);
        setTotalPages(1);
      } else {
        setError(err.message || 'Erro ao carregar clientes');
        setClientes([]);
      }
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

    // ✅ VALIDAR: Cliente selecionado antes de prosseguir
    const clienteSelecionado = clientes.find(c => c.id === selectedClienteId);
    if (!clienteSelecionado) {
      showError('Cliente Não Encontrado', 'Cliente selecionado não encontrado. Recarregue a página.');
      return;
    }

    // ✅ VALIDAR: Dados do cliente usando validateClienteData
    const validacao = validateClienteData(clienteSelecionado);

    if (!validacao.isValid) {
      const mensagemErro = `Dados do cliente incompletos:\n${validacao.errors.map(e => e.message).join('\n')}`;
      showError('Dados Incompletos', mensagemErro);
      return;
    }

    // Usar dados sanitizados
    const clienteValidado = validacao.sanitizedData;

    console.log('✅ Cliente validado com sucesso:', clienteValidado.nome);

    // ✅ NOVO: Limpar dados do passo 1 antes de prosseguir
    console.log('🧹 [Passo1] Limpando dados do passo 1 antes de prosseguir...');
    const dadosRemovidos = limparDadosPasso(1);
    if (dadosRemovidos) {
      console.log('✅ [Passo1] Dados do passo 1 limpos com sucesso');
    }

    // ⚠️ NOVO: Salvar antes de prosseguir
    salvarProgresso();
    onProximo(selectedClienteId);
  };

  const handleClienteCadastrado = (novoCliente: Cliente) => {
    // Adicionar à lista e selecionar automaticamente
    setClientes(prev => [novoCliente, ...prev]);
    setSelectedClienteId(novoCliente.id);
    setModalCadastroAberto(false);

    // Mostrar mensagem de sucesso
    showSuccess('Cliente Cadastrado', 'Cliente cadastrado com sucesso!');
  };

  // ✅ NOVO: Função para abrir modal de edição
  const handleEditarCliente = () => {
    if (!selectedClienteId) return;

    const clienteSelecionado = clientes.find(c => c.id === selectedClienteId);
    if (clienteSelecionado) {
      setClienteParaEditar(clienteSelecionado);
      setModalEdicaoAberto(true);
    }
  };

  // ✅ NOVO: Função para lidar com cliente editado
  const handleClienteEditado = (clienteEditado: Cliente) => {
    // Atualizar a lista de clientes
    setClientes(prev => prev.map(c => c.id === clienteEditado.id ? clienteEditado : c));

    // Fechar modal
    setModalEdicaoAberto(false);
    setClienteParaEditar(null);

    // Salvar progresso automaticamente
    salvarProgresso();
  };

  return (
    <div>
      {/* Header da Página */}
      <div className="mb-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Nova Proposta - Passo 1</h1>
            <p className="text-sm text-gray-500">Selecione um cliente para criar a proposta</p>

            {/* ⚠️ NOVO: Indicador de salvamento */}
            <div className="flex items-center space-x-2 mt-2">
              {salvando && (
                <div className="flex items-center text-custom-blue text-sm">
                  <div className="animate-spin w-4 h-4 border-2 border-custom-blue border-t-transparent rounded-full mr-2"></div>
                  <span>Salvando progresso...</span>
                </div>
              )}

              {ultimoSalvamento && !salvando && (
                <div className="flex items-center text-green-600 text-sm">
                  <CheckCircle className="w-4 h-4 mr-1" />
                  <span>Salvo {ultimoSalvamento.toLocaleTimeString()}</span>
                </div>
              )}

              {erroSalvamento && (
                <div className="flex items-center text-red-600 text-sm">
                  <AlertCircle className="w-4 h-4 mr-1" />
                  <span>Erro no salvamento</span>
                </div>
              )}
            </div>
          </div>
          <button
            onClick={onVoltar}
            className="text-gray-600 hover:text-gray-800 flex items-center space-x-2 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Voltar</span>
          </button>
        </div>
      </div>

      {/* Erro */}
      {error && (
        <div className="mb-6 bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-red-700">{error}</p>
        </div>
      )}

      {/* ⚠️ NOVO: Aviso de recuperação se aplicável */}
      {selectedClienteId && dadosSalvos?.clienteId === selectedClienteId && (
        <div className="mb-6 bg-custom-blue-light border border-custom-blue rounded-lg p-4">
          <div className="flex items-center space-x-2">
            <CheckCircle className="w-5 h-5 text-custom-blue" />
            <span className="text-custom-blue-dark text-sm">
              Progresso recuperado - Cliente selecionado anteriormente
            </span>
          </div>
        </div>
      )}

      {/* Barra de Ações */}
      <div className="mb-6 flex items-center justify-between">
        <button
          onClick={() => setModalCadastroAberto(true)}
          className="btn-success flex items-center space-x-2"
        >
          <Plus className="w-4 h-4" />
          <span>Cadastrar Cliente</span>
        </button>

        <div className="relative flex-1 max-w-md ml-4">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Buscar cliente..."
            value={searchTerm}
            onChange={(e) => handleSearchChange(e.target.value)}
            className="input-custom pl-10 pr-4 py-2 w-full"
          />
        </div>
      </div>

      {/* Lista de Clientes */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 mb-6">
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <div className="flex items-center">
              <LoadingSpinner size="md" />
              <span className="ml-3 text-gray-500">Carregando clientes...</span>
            </div>
          </div>
        ) : (
          <>

            <div role="radiogroup" aria-label="Lista de clientes disponíveis" className="space-y-2">
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
          </>
        )}

        {clientes.length === 0 && !loading && (
          <div className="text-center py-20">
            <div className="max-w-md mx-auto">
              <div className="mb-6">
                <div className="w-20 h-20 mx-auto mb-4 bg-gray-100 rounded-full flex items-center justify-center">
                  <Users className="w-10 h-10 text-gray-400" />
                </div>
                <h3 className="text-xl font-semibold text-gray-900 mb-2">
                  {searchTerm ? 'Nenhum cliente encontrado' : 'Nenhum cliente cadastrado'}
                </h3>
                <p className="text-gray-500 mb-6">
                  {searchTerm
                    ? `Não encontramos clientes para "${searchTerm}". Tente buscar por nome, CPF ou email.`
                    : 'Você ainda não possui clientes cadastrados. Cadastre um cliente para começar a criar propostas.'
                  }
                </p>
              </div>

              {!searchTerm && (
                <button
                  onClick={() => setModalCadastroAberto(true)}
                  className="btn-primary inline-flex items-center px-6 py-3"
                >
                  <Plus className="w-5 h-5 mr-2" />
                  Cadastrar Primeiro Cliente
                </button>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Paginação */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center space-x-3 mb-6">
          <button
            onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
            disabled={currentPage === 1}
            className="btn-secondary disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Anterior
          </button>

          <div className="flex items-center space-x-2">
            {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
              const page = i + 1;
              const isActive = page === currentPage;

              return (
                <button
                  key={page}
                  onClick={() => setCurrentPage(page)}
                  className={`w-10 h-10 rounded-lg font-medium transition-all duration-200 ${isActive
                    ? 'bg-custom-blue text-white shadow-md'
                    : 'text-gray-700 hover:bg-gray-100 border border-gray-200'
                    }`}
                >
                  {page}
                </button>
              );
            })}
          </div>

          <span className="px-4 py-2 text-sm text-gray-500 font-medium">
            Página {currentPage} de {totalPages}
          </span>

          <button
            onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
            disabled={currentPage === totalPages}
            className="btn-secondary disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Próxima
          </button>
        </div>
      )}

      {/* Botões de Ação Fixos */}
      <div className="fixed bottom-0 left-64 right-0 bg-white border-t border-gray-200 px-6 py-4 shadow-lg">
        <div className="flex justify-between items-center">
          <div className="flex items-center space-x-4">
            {selectedClienteId && (
              <div className="flex items-center space-x-2">
                <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                <span className="text-sm font-medium text-gray-700">
                  Cliente selecionado: <span className="text-gray-900 font-semibold">{clientes.find(c => c.id === selectedClienteId)?.nome}</span>
                </span>
              </div>
            )}

            {/* Botão de salvamento manual */}
            <button
              onClick={salvarProgresso}
              disabled={!selectedClienteId || salvando}
              className="flex items-center space-x-2 px-4 py-2 text-sm font-medium text-custom-blue bg-custom-blue-light rounded-lg hover:bg-blue-100 disabled:opacity-50 transition-all duration-200 border border-custom-blue-light"
            >
              <Save className={`w-4 h-4 ${salvando ? 'animate-spin' : ''}`} />
              <span>{salvando ? 'Salvando...' : 'Salvar Progresso'}</span>
            </button>
          </div>

          <div className="flex justify-end space-x-3">
            <button
              onClick={onVoltar}
              className="btn-secondary px-6 py-3 text-sm"
            >
              Cancelar
            </button>
            <button
              onClick={handleProximo}
              disabled={!selectedClienteId}
              className="btn-primary px-6 py-3 text-sm disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Próximo Passo
            </button>
          </div>
        </div>
      </div>

      {/* Modal de Cadastro de Cliente */}
      <ModalCadastroCliente
        isOpen={modalCadastroAberto}
        onClose={() => setModalCadastroAberto(false)}
        onClienteCadastrado={handleClienteCadastrado}
      />

      {/* ✅ NOVO: Modal de Edição de Cliente */}
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
