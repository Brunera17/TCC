import React, { useState, useEffect } from 'react';
import { Plus, Search, Trash2, Mail, User, Building, Eye, Edit2 } from 'lucide-react';
import { apiService } from '../lib/api';
import { LoadingSpinner } from '../components/common/LoadingSpinner';
import { Modal } from '../components/modals/Modal';
import { ModalCadastroCliente } from '../components/modals/ModalCadastroCliente';

// Interface Cliente local (compatível com o backend)
interface Cliente {
  id: number;
  nome: string;
  cpf?: string;
  email?: string;
  telefone?: string;
  created_at?: string;
  updated_at?: string;
  
  // Relacionamentos
  enderecos?: Array<{
    id: number;
    rua: string;
    numero: string;
    complemento?: string;
    cidade: string;
    estado: string;
    cep: string;
    cliente_id: number;
  }>;
  entidades_juridicas?: Array<{
    id: number;
    nome: string;
    cnpj: string;
    tipo: string;
    cliente_id: number;
  }>;
}

interface ClientesPageProps {
  openModalOnLoad?: boolean;
}

export const ClientesPage: React.FC<ClientesPageProps> = ({ openModalOnLoad = false }) => {
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  // Estados para os novos modais
  const [clienteParaVisualizar, setClienteParaVisualizar] = useState<Cliente | null>(null);
  const [clienteParaEditar, setClienteParaEditar] = useState<Cliente | null>(null);
  const [clienteParaDeletar, setClienteParaDeletar] = useState<Cliente | null>(null);
  const [isModalEdicaoOpen, setIsModalEdicaoOpen] = useState(false);

  const fetchClientes = async (page = 1, search = '') => {
    setLoading(true);
    try {
      const response = await apiService.getClientes({
        page,
        per_page: 10,
        search,
        ativo: true
      });

      setClientes(response.data || []);
      setTotalPages(Math.ceil(response.total / (response.per_page || 10)));
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchClientes(currentPage, searchTerm);
  }, [currentPage, searchTerm]);

  // Abrir modal automaticamente se openModalOnLoad for true
  useEffect(() => {
    if (openModalOnLoad) {
      setIsModalOpen(true);
    }
  }, [openModalOnLoad]);

  const handleSearch = (term: string) => {
    setSearchTerm(term);
    setCurrentPage(1);
  };

  const openModal = () => {
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
  };

  const handleClienteCadastrado = (cliente: Cliente) => {
    fetchClientes(currentPage, searchTerm);
    closeModal();
  };

  // Funções para os novos botões de ação
  const handleVisualizar = (cliente: Cliente) => {
    setClienteParaVisualizar(cliente);
  };

  const handleEditar = (cliente: Cliente) => {
    setClienteParaEditar(cliente);
    setIsModalEdicaoOpen(true);
  };

  const handleDeletar = (cliente: Cliente) => {
    setClienteParaDeletar(cliente);
  };

  const confirmarDeletar = async () => {
    if (!clienteParaDeletar) return;

    try {
      await apiService.deleteCliente(clienteParaDeletar.id);
      fetchClientes(currentPage, searchTerm);
      setClienteParaDeletar(null);
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleClienteEditado = (cliente: Cliente) => {
    fetchClientes(currentPage, searchTerm);
    setIsModalEdicaoOpen(false);
    setClienteParaEditar(null);
  };


  // Função para formatar CPF/CNPJ
  const formatarDocumento = (documento: string) => {
    const limpo = documento.replace(/\D/g, '');
    if (limpo.length === 11) {
      return limpo.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
    } else if (limpo.length === 14) {
      return limpo.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, '$1.$2.$3/$4-$5');
    }
    return documento;
  };

  // Função para formatar CEP
  const formatarCEP = (cep: string) => {
    const limpo = cep.replace(/\D/g, '');
    return limpo.replace(/(\d{5})(\d{3})/, '$1-$2');
  };

  return (
    <div className="space-y-6">
      {/* Page Title */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Clientes</h1>
        <p className="text-sm text-gray-500">Gerencie seus clientes e informações cadastrais</p>
      </div>

      {/* Header Actions */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center space-y-4 sm:space-y-0">
        <div className="flex-1 max-w-md">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Buscar clientes..."
              value={searchTerm}
              onChange={(e) => handleSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
        </div>
        <button
          onClick={() => openModal()}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors flex items-center space-x-2"
        >
          <Plus className="w-4 h-4" />
          <span>Novo Cliente</span>
        </button>
      </div>

      {/* Error Message */}
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-lg">
          {error}
        </div>
      )}

      {/* Content */}
      {loading ? (
        <div className="flex justify-center py-8">
          <LoadingSpinner />
        </div>
      ) : (
        <>
          {/* Clientes List */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Cliente
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      CPF/CNPJ
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      E-mail
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Tipo
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Ações
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {clientes.map((cliente) => (
                    <tr key={cliente.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center mr-3">
                            {cliente.abertura_empresa ? (
                              <Building className="w-4 h-4 text-blue-600" />
                            ) : (
                              <User className="w-4 h-4 text-blue-600" />
                            )}
                          </div>
                          <div>
                            <div className="text-sm font-medium text-gray-900">
                              {cliente.nome}
                            </div>
                            <div className="text-sm text-gray-500">
                              ID: {cliente.id}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {formatarDocumento(cliente.cpf)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center text-sm text-gray-900">
                          <Mail className="w-4 h-4 mr-2 text-gray-400" />
                          {cliente.email}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${cliente.abertura_empresa
                          ? 'bg-purple-100 text-purple-800'
                          : 'bg-green-100 text-green-800'
                          }`}>
                          {cliente.abertura_empresa ? 'Abertura de Empresa' : 'Cliente Existente'}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${cliente.ativo
                          ? 'bg-green-100 text-green-800'
                          : 'bg-red-100 text-red-800'
                          }`}>
                          {cliente.ativo ? 'Ativo' : 'Inativo'}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        <div className="flex items-center space-x-2">
                          <button
                            onClick={() => handleVisualizar(cliente)}
                            className="text-blue-600 hover:text-blue-900 p-1 rounded-full hover:bg-blue-50"
                            title="Visualizar cliente"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleEditar(cliente)}
                            className="text-green-600 hover:text-green-900 p-1 rounded-full hover:bg-green-50"
                            title="Editar cliente"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDeletar(cliente)}
                            className="text-red-600 hover:text-red-900 p-1 rounded-full hover:bg-red-50"
                            title="Excluir cliente"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {clientes.length === 0 && (
              <div className="text-center py-8">
                <User className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-500">Nenhum cliente encontrado</p>
              </div>
            )}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-center space-x-2">
              <button
                onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                disabled={currentPage === 1}
                className="px-3 py-1 border border-gray-300 rounded-md disabled:opacity-50"
              >
                Anterior
              </button>
              <span className="px-3 py-1">
                Página {currentPage} de {totalPages}
              </span>
              <button
                onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                disabled={currentPage === totalPages}
                className="px-3 py-1 border border-gray-300 rounded-md disabled:opacity-50"
              >
                Próxima
              </button>
            </div>
          )}
        </>
      )}

      {/* Modal de Cadastro de Cliente */}
      <ModalCadastroCliente
        isOpen={isModalOpen}
        onClose={closeModal}
        onClienteCadastrado={handleClienteCadastrado}
      />

      {/* Modal de Edição de Cliente */}
      <ModalCadastroCliente
        isOpen={isModalEdicaoOpen}
        onClose={() => setIsModalEdicaoOpen(false)}
        onClienteCadastrado={handleClienteEditado}
        clienteParaEditar={clienteParaEditar}
      />

      {/* Modal de Visualização */}
      <Modal
        isOpen={!!clienteParaVisualizar}
        onClose={() => setClienteParaVisualizar(null)}
        title="Visualizar Cliente"
        size="lg"
      >
        {clienteParaVisualizar && (
          <div className="space-y-6">
            {/* Dados do Cliente */}
            <div>
              <h4 className="text-lg font-medium text-gray-900 mb-4">Dados do Cliente</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">Nome</label>
                  <p className="mt-1 text-sm text-gray-900">{clienteParaVisualizar.nome}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">CPF/CNPJ</label>
                  <p className="mt-1 text-sm text-gray-900">{formatarDocumento(clienteParaVisualizar.cpf)}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">E-mail</label>
                  <p className="mt-1 text-sm text-gray-900">{clienteParaVisualizar.email || 'Não informado'}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Tipo</label>
                  <p className="mt-1 text-sm text-gray-900">
                    {clienteParaVisualizar.abertura_empresa ? 'Abertura de Empresa' : 'Cliente Existente'}
                  </p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Status</label>
                  <p className="mt-1 text-sm text-gray-900">
                    {clienteParaVisualizar.ativo ? 'Ativo' : 'Inativo'}
                  </p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Data de Criação</label>
                  <p className="mt-1 text-sm text-gray-900">
                    {new Date(clienteParaVisualizar.created_at).toLocaleDateString('pt-BR')}
                  </p>
                </div>
              </div>
            </div>

            {/* Endereço */}
            {clienteParaVisualizar.endereco && (
              <div>
                <h4 className="text-lg font-medium text-gray-900 mb-4">Endereço</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Rua</label>
                    <p className="mt-1 text-sm text-gray-900">{clienteParaVisualizar.endereco.rua}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Número</label>
                    <p className="mt-1 text-sm text-gray-900">{clienteParaVisualizar.endereco.numero}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Cidade</label>
                    <p className="mt-1 text-sm text-gray-900">{clienteParaVisualizar.endereco.cidade}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Estado</label>
                    <p className="mt-1 text-sm text-gray-900">{clienteParaVisualizar.endereco.estado}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">CEP</label>
                    <p className="mt-1 text-sm text-gray-900">{formatarCEP(clienteParaVisualizar.endereco.cep)}</p>
                  </div>
                </div>
              </div>
            )}

            {/* Empresa */}
            {clienteParaVisualizar.entidades_juridicas && clienteParaVisualizar.entidades_juridicas.length > 0 && (
              <div>
                <h4 className="text-lg font-medium text-gray-900 mb-4">Empresa</h4>
                {clienteParaVisualizar.entidades_juridicas.map((empresa, index) => (
                  <div key={index} className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Nome da Empresa</label>
                      <p className="mt-1 text-sm text-gray-900">{empresa.nome}</p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700">CNPJ</label>
                      <p className="mt-1 text-sm text-gray-900">{formatarDocumento(empresa.cnpj)}</p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Tipo</label>
                      <p className="mt-1 text-sm text-gray-900">{empresa.tipo}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </Modal>

      {/* Modal de Confirmação para Deletar */}
      <Modal
        isOpen={!!clienteParaDeletar}
        onClose={() => setClienteParaDeletar(null)}
        title="Confirmar Exclusão"
        size="sm"
      >
        <div className="space-y-4">
          <p className="text-gray-700">
            Tem certeza que deseja excluir o cliente <strong>{clienteParaDeletar?.nome}</strong>?
          </p>
          <p className="text-sm text-red-600">
            Esta ação não pode ser desfeita.
          </p>
          <div className="flex justify-end space-x-3">
            <button
              onClick={() => setClienteParaDeletar(null)}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
            >
              Cancelar
            </button>
            <button
              onClick={confirmarDeletar}
              className="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-lg hover:bg-red-700"
            >
              Excluir
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
};