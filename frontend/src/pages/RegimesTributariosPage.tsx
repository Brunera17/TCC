import { useEffect, useState } from 'react';
import { Plus, Search, Trash2, Eye, Edit2, BadgePercent } from 'lucide-react';
import { apiService } from '../lib/api';
import { LoadingSpinner } from '../components/common/LoadingSpinner';
import { Modal } from '../components/modals/Modal';
import { ModalVisualizacao } from '../components/modals/ModalVisualizacao';
import { ModalCadastroRegimeTributario } from '../components/modals/ModalCadastroRegimeTributario';
import { pageStyles, buttonStyles, formStyles } from '../styles';

// Interface local para a página de Regimes Tributários
interface RegimeTributarioPage {
  id: number;
  nome: string;
  codigo: string;
  descricao?: string;
  aplicavel_pf: boolean;
  aplicavel_pj: boolean;
  ativo: boolean;
  created_at?: string;
  updated_at?: string;
}

export const RegimesTributariosPage: React.FC = () => {
  const [regimes, setRegimes] = useState<RegimeTributarioPage[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);

  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  const [regimeParaVisualizar, setRegimeParaVisualizar] = useState<RegimeTributarioPage | null>(null);
  const [regimeParaEditar, setRegimeParaEditar] = useState<RegimeTributarioPage | null>(null);
  const [isModalEdicaoOpen, setIsModalEdicaoOpen] = useState(false);
  const [regimeParaDeletar, setRegimeParaDeletar] = useState<RegimeTributarioPage | null>(null);

  const fetchRegimes = async (page = 1, search = '') => {
    setLoading(true);
    console.log('🔍 DEBUG FRONTEND: Iniciando fetchRegimes com parâmetros:', { page, search });
    try {
      const response = await apiService.getRegimesTributarios({
        page,
        per_page: 10,
        search,
        ativo: true,
      });
      console.log('🔍 DEBUG FRONTEND: Resposta da API:', response);
      setRegimes(response.data || response || []);
      setTotalPages(Math.ceil((response.total || 0) / 10));
      console.log('🔍 DEBUG FRONTEND: Regimes definidos:', response.data || response || []);
    } catch (e: any) {
      console.error('🔍 DEBUG FRONTEND: Erro ao carregar regimes:', e);
      setError(e.message || 'Erro ao carregar regimes');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    console.log('🔍 DEBUG FRONTEND: useEffect executado com:', { currentPage, searchTerm });
    fetchRegimes(currentPage, searchTerm);
  }, [currentPage, searchTerm]);

  // useEffect adicional para debug
  useEffect(() => {
    console.log('🔍 DEBUG FRONTEND: Componente montado, iniciando fetchRegimes');
    fetchRegimes(1, '');
  }, []);

  const handleSearch = (term: string) => {
    setSearchTerm(term);
    setCurrentPage(1);
  };

  const openModal = () => setIsModalOpen(true);
  const closeModal = () => setIsModalOpen(false);

  const handleRegimeCadastrado = () => {
    fetchRegimes(currentPage, searchTerm);
    closeModal();
  };

  const handleVisualizar = async (regime: RegimeTributarioPage) => {
    try {
      const completo = await apiService.getRegimeTributario(regime.id);
      setRegimeParaVisualizar(completo);
    } catch {
      setRegimeParaVisualizar(regime);
    }
  };

  const handleEditar = (regime: RegimeTributarioPage) => {
    setRegimeParaEditar(regime);
    setIsModalEdicaoOpen(true);
  };

  const handleRegimeEditado = () => {
    fetchRegimes(currentPage, searchTerm);
    setIsModalEdicaoOpen(false);
    setRegimeParaEditar(null);
  };

  const confirmarDeletar = async () => {
    if (!regimeParaDeletar) return;
    try {
      await apiService.deleteRegimeTributario(regimeParaDeletar.id);
      fetchRegimes(currentPage, searchTerm);
      setRegimeParaDeletar(null);
    } catch (e: any) {
      setError(e.message || 'Erro ao excluir');
    }
  };



  return (
    <div className="space-y-6">
      {/* Título */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Regimes Tributários</h1>
        <p className="text-sm text-gray-500">Gerencie os regimes tributários e suas configurações</p>
      </div>

      {/* Ações do cabeçalho */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center space-y-4 sm:space-y-0">
        <div className="flex-1 max-w-md">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Buscar regimes..."
              value={searchTerm}
              onChange={(e) => handleSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
        </div>

        <button
          onClick={openModal}
          className="bg-custom-blue text-white px-4 py-2 rounded-lg hover:bg-custom-blue-light transition-colors flex items-center space-x-2"
        >
          <Plus className="w-4 h-4" />
          <span>Novo Regime</span>
        </button>
      </div>

      {/* Erro */}
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-lg">{error}</div>
      )}

      {/* Conteúdo */}
      {loading ? (
        <div className="flex justify-center py-8"><LoadingSpinner /></div>
      ) : (
        <>
          {/* Lista */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Regime</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Código</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Aplicabilidade</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Ações</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {regimes.map((regime) => (
                    <tr key={regime.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <div className="w-8 h-8 bg-blue-50 rounded-full flex items-center justify-center mr-3">
                            <BadgePercent className="w-4 h-4 text-blue-600" />
                          </div>
                          <div>
                            <div className="text-sm font-medium text-gray-900">{regime.nome}</div>
                            <div className="text-sm text-gray-500">ID: {regime.id}</div>
                          </div>
                        </div>
                      </td>

                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{regime.codigo}</td>

                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        <div className="space-y-1">
                          {regime.aplicavel_pf && (
                            <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-50 text-blue-800 mr-2">
                              PF
                            </span>
                          )}
                          {regime.aplicavel_pj && (
                            <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                              PJ
                            </span>
                          )}
                          {!regime.aplicavel_pf && !regime.aplicavel_pj && (
                            <span className="text-gray-500 text-xs">Não definido</span>
                          )}
                        </div>
                      </td>

                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${regime.ativo ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                          }`}>
                          {regime.ativo ? 'Ativo' : 'Inativo'}
                        </span>
                      </td>

                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        <div className="flex items-center space-x-2">
                          <button
                            onClick={() => handleVisualizar(regime)}
                            className="text-blue-600 hover:text-blue-600-light p-1 rounded-full hover:bg-custom-blue-light"
                            title="Visualizar regime"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleEditar(regime)}
                            className="text-green-600 hover:text-green-900 p-1 rounded-full hover:bg-green-50"
                            title="Editar regime"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => setRegimeParaDeletar(regime)}
                            className="text-red-600 hover:text-red-900 p-1 rounded-full hover:bg-red-50"
                            title="Excluir regime"
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

            {regimes.length === 0 && (
              <div className="text-center py-8">
                <BadgePercent className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-500">Nenhum regime encontrado</p>
              </div>
            )}
          </div>

          {/* Paginação */}
          {totalPages > 1 && (
            <div className="flex items-center justify-center space-x-2">
              <button
                onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                disabled={currentPage === 1}
                className="px-3 py-1 border border-gray-300 rounded-md disabled:opacity-50"
              >
                Anterior
              </button>
              <span className="px-3 py-1">Página {currentPage} de {totalPages}</span>
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

      {/* Modal Cadastro */}
      <ModalCadastroRegimeTributario
        isOpen={isModalOpen}
        onClose={closeModal}
        onRegimeCadastrado={handleRegimeCadastrado}
      />

      {/* Modal Edição */}
      <ModalCadastroRegimeTributario
        isOpen={isModalEdicaoOpen}
        onClose={() => setIsModalEdicaoOpen(false)}
        onRegimeCadastrado={handleRegimeEditado}
        regimeParaEditar={regimeParaEditar}
      />

      {/* Modal Visualização */}
      <ModalVisualizacao
        isOpen={!!regimeParaVisualizar}
        onClose={() => setRegimeParaVisualizar(null)}
        type="regime"
        data={regimeParaVisualizar}
      />

      {/* Modal Confirmação Exclusão */}
      <Modal
        isOpen={!!regimeParaDeletar}
        onClose={() => setRegimeParaDeletar(null)}
        title="Confirmar Exclusão"
        size="sm"
      >
        <div className="space-y-4">
          <p className="text-gray-700">
            Tem certeza que deseja excluir o regime <strong>{regimeParaDeletar?.nome}</strong>?
          </p>
          <p className="text-sm text-red-600">Esta ação não pode ser desfeita.</p>
          <div className="flex justify-end space-x-3">
            <button
              onClick={() => setRegimeParaDeletar(null)}
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
