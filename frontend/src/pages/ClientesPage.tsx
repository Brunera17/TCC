import React, { useState, useEffect, useCallback } from 'react';
import {
  Plus,
  Search,
  Trash2,
  Mail,
  User,
  Building,
  Eye,
  Edit2,
  AlertTriangle,
  MapPin,
  Phone,
  Calendar
} from 'lucide-react';
import { apiService, ApiError } from '../lib/api';
import { useAuth } from '../context/AuthContext';
import {
  PageLayout,
  PageHeader,
  SearchBar,
  IconButton,
  DataTable,
  ConfirmDialog,
  StatusBadge,
  StateHandler,
  Pagination,
  ModalPadrao, // Usar ModalPadrao
  type Column
} from '../components/ui';
import { LoadingSpinner } from '../components/common/LoadingSpinner';
import { ModalCadastroCliente } from '../components/modals/ModalCadastroCliente';

// Interface Cliente local (compatível com o backend)
// --- CORREÇÃO: Adicionadas 'ativo' e 'abertura_empresa' que estavam faltando na interface mas eram usadas ---
interface Cliente {
  id: number;
  nome: string;
  cpf?: string;
  email?: string;
  telefone?: string;
  created_at?: string;
  updated_at?: string;
  abertura_empresa: boolean; // <-- Adicionado
  ativo: boolean; // <-- Adicionado
  endereco?: { // Mantido para consistência
    logradouro: string;
    numero: string;
    bairro: string;
    complemento?: string;
    cidade: string;
    estado: string;
    cep: string;
    rua?: string;
  };
  enderecos?: Array<{
    id: number;
    logradouro: string;
    numero: string;
    bairro: string;
    complemento?: string;
    cidade: string;
    estado: string;
    cep: string;
    cliente_id: number;
    rua?: string;
  }>;
  entidades_juridicas?: Array<{
    id: number;
    nome: string;
    cnpj: string;
    tipo: string;
    cliente_id: number;
  }>;
}

// Helper para checagem de tipo da resposta da API
type ClientesApiPayload = {
  data?: Cliente[];
  items?: Cliente[];
  total?: number;
  count?: number;
  per_page?: number;
  page_size?: number;
};
const isClientesApiPayload = (value: unknown): value is ClientesApiPayload =>
  typeof value === 'object' && value !== null;

interface ClientesPageProps {
  openModalOnLoad?: boolean;
}

export const ClientesPage: React.FC<ClientesPageProps> = ({ openModalOnLoad = false }) => {
  const { user } = useAuth(); // Obter usuário para permissões
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [loading, setLoading] = useState(true); // Iniciar como true
  const [error, setError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const itemsPerPage = 10;

  // Estados dos modais (simplificado)
  const [isModalCadastroOpen, setIsModalCadastroOpen] = useState(false);
  const [isModalVisualizacaoOpen, setIsModalVisualizacaoOpen] = useState(false);
  const [modalExclusaoOpen, setModalExclusaoOpen] = useState(false);

  // Dados para os modais
  const [clienteParaVisualizar, setClienteParaVisualizar] = useState<Cliente | null>(null);
  const [clienteParaEditar, setClienteParaEditar] = useState<Cliente | null>(null);
  const [clienteParaDeletar, setClienteParaDeletar] = useState<Cliente | null>(null);

  // Permissão
  const isAdmin = Boolean(user?.gerente);
  const [verificandoPermissao, setVerificandoPermissao] = useState(true);

  useEffect(() => {
    setVerificandoPermissao(false);
  }, [user]);

  // --- Funções ---

  const fetchClientes = useCallback(async (page = currentPage, search = searchTerm) => {
    // Não busca se não for admin (assumindo que só admins veem clientes)
    // Se funcionários comuns puderem ver, remova esta verificação
    if (!isAdmin) { 
        setLoading(false); 
        setClientes([]);
        return; 
    }

    setLoading(true);
    setError('');
    try {
      const response: unknown = await apiService.getClientes({
        page,
        per_page: itemsPerPage,
        search: search || undefined,
        ativo: true
      });

      let clientesData: Cliente[] = [];
      let totalRegistros = 0;
      let itensPorPaginaApi = itemsPerPage;

      if (Array.isArray(response)) {
        clientesData = response;
        totalRegistros = clientesData.length;
        setTotalPages(1); // Assume 1 página se for array
      } else if (isClientesApiPayload(response)) {
        clientesData = response.data || response.items || [];
        totalRegistros = response.total ?? response.count ?? clientesData.length;
        itensPorPaginaApi = response.per_page ?? response.page_size ?? itemsPerPage;
        setTotalPages(Math.max(1, Math.ceil(totalRegistros / Math.max(1, itensPorPaginaApi))));
      } else {
         throw new Error("Formato de resposta inesperado da API");
      }
      
      setClientes(clientesData);

    } catch (err: unknown) {
       const errorMsg = err instanceof ApiError ? `Erro ${err.status}: ${JSON.stringify(err.details)}` : (err instanceof Error ? err.message : 'Erro desconhecido');
       setError(errorMsg);
       setClientes([]);
       setTotalPages(1);
    } finally {
      setLoading(false);
    }
  }, [isAdmin, currentPage, searchTerm]); // Adicionado isAdmin

  useEffect(() => {
    fetchClientes(currentPage, searchTerm);
  }, [currentPage, searchTerm, fetchClientes]); // fetchClientes é dependência

  useEffect(() => {
    if (openModalOnLoad && isAdmin) { // Só abre se for admin
      setClienteParaEditar(null);
      setIsModalCadastroOpen(true);
    }
  }, [openModalOnLoad, isAdmin]);

  const handleSearch = (term: string) => {
    setSearchTerm(term);
    setCurrentPage(1);
  };
  
  const handlePageChange = (newPage: number) => {
    setCurrentPage(newPage);
  };

  const openModalCadastro = () => {
    setClienteParaEditar(null);
    setIsModalCadastroOpen(true);
  };

  const closeModalCadastro = () => {
    setIsModalCadastroOpen(false);
    setClienteParaEditar(null);
  };

  const handleClienteCadastrado = () => {
    fetchClientes(1); // Volta para a página 1 após cadastro
    closeModalCadastro();
  };

  const handleClienteEditado = () => {
    fetchClientes(currentPage); // Recarrega a página atual
    closeModalCadastro();
  };

  const handleVisualizar = (cliente: Cliente) => {
    setClienteParaVisualizar(cliente);
    setIsModalVisualizacaoOpen(true);
  };

  const closeModalVisualizacao = () => {
    setIsModalVisualizacaoOpen(false);
    setClienteParaVisualizar(null);
  };

  const handleEditar = (cliente: Cliente) => {
    setClienteParaEditar(cliente);
    setIsModalCadastroOpen(true); // Reutiliza o ModalCadastroCliente
  };

  const handleDeletar = (cliente: Cliente) => {
    setClienteParaDeletar(cliente);
    setModalExclusaoOpen(true);
  };

  const confirmarDeletar = async () => {
    if (!clienteParaDeletar) return;
    setLoading(true);
    try {
      await apiService.deleteCliente(clienteParaDeletar.id);
      setModalExclusaoOpen(false);
      setClienteParaDeletar(null);
      fetchClientes(1); // Volta para pág 1
    } catch (err: unknown) {
      const errorMsg = err instanceof ApiError ? `Erro ${err.status}: ${JSON.stringify(err.details)}` : (err instanceof Error ? err.message : 'Erro desconhecido');
      setError(errorMsg);
      setModalExclusaoOpen(false);
    } finally {
      setLoading(false);
    }
  };

  // --- Funções de Formatação ---
  const formatarDocumento = (cliente: Cliente): string => {
    const pjCnpj = cliente.entidades_juridicas?.[0]?.cnpj;
    const pfCpf = cliente.cpf;
    const doc = pjCnpj || pfCpf;
    if (!doc) return '—';
    
    const limpo = doc.replace(/\D/g, '');
    if (limpo.length === 11) {
      return limpo.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
    } else if (limpo.length === 14) {
      return limpo.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, '$1.$2.$3/$4-$5');
    }
    return doc;
  };
  
  const formatarCEP = (cep?: string) => {
     if (!cep) return '—';
     const limpo = cep.replace(/\D/g, '');
     if (limpo.length === 8) {
       return limpo.replace(/(\d{5})(\d{3})/, '$1-$2');
     }
     return cep;
  };
  
  const getTipoClienteBadge = (cliente: Cliente) => {
     const isPJ = cliente.entidades_juridicas && cliente.entidades_juridicas.length > 0;
     const isAbertura = cliente.abertura_empresa;
     
     if (isAbertura) {
         return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-800">Abertura</span>;
     }
     if (isPJ) {
         return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">PJ</span>;
     }
     return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">PF</span>;
  };

  // --- Colunas da Tabela ---
  const columns: Column<Cliente>[] = [
    {
      key: 'nome',
      label: 'Cliente',
      render: (_, cliente) => (
        <div className="flex items-center">
          <div className={`w-8 h-8 rounded-full flex items-center justify-center mr-3 flex-shrink-0 ${
              cliente.abertura_empresa ? 'bg-purple-100' : (cliente.entidades_juridicas && cliente.entidades_juridicas.length > 0 ? 'bg-blue-50' : 'bg-green-50')
          }`}>
            {cliente.abertura_empresa ? (
              <Building className="w-4 h-4 text-purple-600" />
            ) : (cliente.entidades_juridicas && cliente.entidades_juridicas.length > 0) ? (
              <Building className="w-4 h-4 text-blue-600" />
            ) : (
              <User className="w-4 h-4 text-green-600" />
            )}
          </div>
          <div>
            <div className="text-sm font-medium text-gray-900">{cliente.nome}</div>
            <div className="text-sm text-gray-500">ID: {cliente.id}</div>
          </div>
        </div>
      )
    },
    {
      key: 'cpf', // Usado como key, mas render usa lógica customizada
      label: 'Documento',
      render: (_, cliente) => (
         <span className="text-sm font-mono text-gray-700 bg-gray-100 px-2 py-0.5 rounded">
            {formatarDocumento(cliente)}
         </span>
      )
    },
    {
      key: 'email',
      label: 'E-mail',
      render: (email: Cliente['email']) => (
        <span className="text-sm text-gray-700">{email || '—'}</span>
      )
    },
    {
      key: 'abertura_empresa', // Usado como key
      label: 'Tipo',
      render: (_, cliente) => getTipoClienteBadge(cliente)
    },
    {
      key: 'ativo',
      label: 'Status',
      render: (ativo) => <StatusBadge status={ativo ? 'ativo' : 'inativo'} />
    }
  ];

  return (
    <PageLayout>
      <PageHeader title="Clientes" subtitle="Gerencie seus clientes e informações cadastrais">
        <IconButton icon={Plus} onClick={openModalCadastro} label="Novo Cliente" />
      </PageHeader>

      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 mb-6">
        <SearchBar value={searchTerm} onChange={handleSearch} placeholder="Buscar por nome, CPF/CNPJ ou email..." />
      </div>

      <StateHandler
        loading={loading}
        error={error || undefined}
        onErrorDismiss={() => setError('')}
        isEmpty={clientes.length === 0 && !loading}
        emptyState={
          <div className="text-center py-16 bg-white rounded-lg shadow-sm border border-gray-200">
            <User className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-500 font-medium">
              {searchTerm ? `Nenhum cliente encontrado para "${searchTerm}"` : "Nenhum cliente cadastrado."}
            </p>
            {!searchTerm && (
               <button onClick={openModalCadastro} className="mt-4 text-sm text-blue-600 hover:text-blue-800 font-medium">
                 + Cadastrar Novo Cliente
               </button>
             )}
          </div>
        }
      >
        <DataTable
          data={clientes}
          columns={columns}
          actions={(cliente) => (
            <div className="flex items-center justify-end space-x-1">
              <IconButton icon={Eye} size="sm" variant="outline" onClick={() => handleVisualizar(cliente)} title="Visualizar"/>
              <IconButton icon={Edit2} size="sm" variant="outline" onClick={() => handleEditar(cliente)} title="Editar"/>
              <IconButton icon={Trash2} size="sm" variant="danger" onClick={() => handleDeletar(cliente)} title="Excluir"/>
            </div>
          )}
        />
        {totalPages > 1 && (
          <div className="bg-white px-4 py-3 border-t border-gray-200 rounded-b-lg">
             <Pagination currentPage={currentPage} totalPages={totalPages} onPageChange={handlePageChange} />
          </div>
        )}
      </StateHandler>

      {/* Modal de Cadastro/Edição de Cliente */}
      <ModalCadastroCliente
        isOpen={isModalCadastroOpen}
        onClose={closeModalCadastro}
        onClienteCadastrado={clienteParaEditar ? handleClienteEditado : handleClienteCadastrado}
        clienteParaEditar={clienteParaEditar}
      />

      {/* Modal de Visualização (Novo Design) */}
      <ModalPadrao
        isOpen={isModalVisualizacaoOpen}
        onClose={closeModalVisualizacao}
        title="Detalhes do Cliente"
        confirmLabel="Fechar"
        onConfirm={closeModalVisualizacao}
        size="lg"
      >
        {clienteParaVisualizar && (
           <div className="space-y-6">
             {/* Dados Pessoais */}
             <div className="p-4 bg-gray-50 rounded-lg border border-gray-200">
               <div className="flex items-center mb-3">
                 <User className="w-5 h-5 text-blue-600 mr-2" />
                 <h3 className="text-lg font-semibold text-gray-800">Dados Pessoais / Responsável</h3>
               </div>
               <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4 text-sm">
                 <div>
                   <label className="block text-xs font-medium text-gray-500 mb-1">Nome</label>
                   <p className="text-gray-900 font-semibold">{clienteParaVisualizar.nome}</p>
                 </div>
                 <div>
                   <label className="flex items-center text-xs font-medium text-gray-500 mb-1"><User className="w-3 h-3 mr-1" /> CPF</label>
                   <p className="text-gray-900">{formatarDocumento(clienteParaVisualizar)}</p>
                 </div>
                 <div>
                   <label className="flex items-center text-xs font-medium text-gray-500 mb-1"><Mail className="w-3 h-3 mr-1" /> Email</label>
                   <p className="text-gray-900">{clienteParaVisualizar.email || '—'}</p>
                 </div>
                 <div>
                   <label className="flex items-center text-xs font-medium text-gray-500 mb-1"><Phone className="w-3 h-3 mr-1" /> Telefone</label>
                   <p className="text-gray-900">{clienteParaVisualizar.telefone || '—'}</p>
                 </div>
                 <div>
                   <label className="block text-xs font-medium text-gray-500 mb-1">Status</label>
                   <StatusBadge status={clienteParaVisualizar.ativo ? 'ativo' : 'inativo'} />
                 </div>
                 <div>
                   <label className="block text-xs font-medium text-gray-500 mb-1">Tipo</label>
                   {getTipoClienteBadge(clienteParaVisualizar)}
                 </div>
               </div>
             </div>

             {/* Endereço(s) */}
             {clienteParaVisualizar.enderecos && clienteParaVisualizar.enderecos.length > 0 && (
               <div className="p-4 bg-gray-50 rounded-lg border border-gray-200">
                 <div className="flex items-center mb-3">
                   <MapPin className="w-5 h-5 text-green-600 mr-2" />
                   <h3 className="text-lg font-semibold text-gray-800">Endereço</h3>
                 </div>
                 {clienteParaVisualizar.enderecos.map(end => (
                    <div key={end.id} className="grid grid-cols-1 md:grid-cols-3 gap-x-6 gap-y-4 text-sm">
                      <div className="md:col-span-2">
                        <label className="block text-xs font-medium text-gray-500 mb-1">Logradouro</label>
                        <p className="text-gray-900">{end.logradouro || end.rua || '—'}, {end.numero || 'S/N'}</p>
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-500 mb-1">CEP</label>
                        <p className="text-gray-900">{formatarCEP(end.cep)}</p>
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-500 mb-1">Cidade</label>
                        <p className="text-gray-900">{end.cidade || '—'}</p>
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-500 mb-1">Estado</label>
                        <p className="text-gray-900">{end.estado || '—'}</p>
                      </div>
                   </div>
                 ))}
               </div>
             )}
             
             {/* Empresa(s) */}
             {clienteParaVisualizar.entidades_juridicas && clienteParaVisualizar.entidades_juridicas.length > 0 && (
                <div className="p-4 bg-gray-50 rounded-lg border border-gray-200">
                 <div className="flex items-center mb-3">
                   <Building className="w-5 h-5 text-purple-600 mr-2" />
                   <h3 className="text-lg font-semibold text-gray-800">Empresa(s) Vinculada(s)</h3>
                 </div>
                 <div className="space-y-4">
                    {clienteParaVisualizar.entidades_juridicas.map(emp => (
                        <div key={emp.id} className="grid grid-cols-1 md:grid-cols-3 gap-x-6 gap-y-4 text-sm border-t pt-4 first:border-t-0 first:pt-0">
                          <div>
                            <label className="block text-xs font-medium text-gray-500 mb-1">Nome Fantasia / Razão Social</label>
                            <p className="text-gray-900 font-semibold">{emp.nome}</p>
                          </div>
                          <div>
                            <label className="block text-xs font-medium text-gray-500 mb-1">CNPJ</label>
                            <p className="text-gray-900">{formatarDocumento(emp)}</p>
                          </div>
                           <div>
                            <label className="block text-xs font-medium text-gray-500 mb-1">Tipo</label>
                            <p className="text-gray-900">{emp.tipo || '—'}</p>
                          </div>
                       </div>
                    ))}
                 </div>
               </div>
             )}
           </div>
        )}
      </ModalPadrao>

      {/* Modal de Confirmação para Deletar (Usando ConfirmDialog) */}
      <ConfirmDialog
        open={modalExclusaoOpen}
        onCancel={() => {
          setModalExclusaoOpen(false);
          setClienteParaDeletar(null);
        }}
        onConfirm={confirmarDeletar}
        title="Confirmar Exclusão"
        message={`Tem certeza que deseja excluir o cliente "${clienteParaDeletar?.nome}"? Esta ação não pode ser desfeita.`}
        confirmLabel="Sim, Excluir"
        cancelLabel="Cancelar"
        variant="danger"
      />
    </PageLayout>
  );
};

