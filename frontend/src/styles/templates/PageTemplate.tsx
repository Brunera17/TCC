// 📄 Template de Página Padronizada
// Template base para páginas administrativas seguindo o design system

import React, { useState, useEffect } from 'react';
import { Search, Plus, Eye, Edit2, Trash2 } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { apiService } from '../lib/api';
import { LoadingSpinner } from '../components/common/LoadingSpinner';
import { Modal } from '../components/modals/Modal';
import { pageStyles, tableStyles, buttonStyles, formStyles, styleHelpers } from '../styles';

interface DataItem {
  id: number;
  nome: string;
  ativo: boolean;
  // ... outros campos específicos
}

interface PageTemplateProps {
  title: string;
  subtitle: string;
  // ... props específicas
}

export const PageTemplate: React.FC<PageTemplateProps> = ({ title, subtitle }) => {
  const { user } = useAuth();
  
  // Estados básicos
  const [items, setItems] = useState<DataItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  
  // Estados dos modais
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isModalEdicaoOpen, setIsModalEdicaoOpen] = useState(false);
  const [itemParaVisualizar, setItemParaVisualizar] = useState<DataItem | null>(null);
  const [itemParaEditar, setItemParaEditar] = useState<DataItem | null>(null);
  const [itemParaDeletar, setItemParaDeletar] = useState<DataItem | null>(null);
  
  // Estados do formulário
  const [formData, setFormData] = useState({
    nome: '',
    // ... outros campos
  });
  
  // Verificação de permissão
  const [isAdmin, setIsAdmin] = useState(false);
  const [verificandoPermissao, setVerificandoPermissao] = useState(true);

  // Verificar permissão de admin
  useEffect(() => {
    const isAdminUser = Boolean(user?.gerente);
    setIsAdmin(isAdminUser);
    setVerificandoPermissao(false);
    
    if (isAdminUser) {
      fetchItems();
    }
  }, [user]);

  // Funções básicas
  const fetchItems = async (page = 1, search = '') => {
    try {
      setLoading(true);
      // Implementar chamada da API
      const response = await apiService.getItems({
        page,
        per_page: 10,
        search: search || undefined,
        ativo: true
      });
      setItems(response.data || []);
      setTotalPages(Math.ceil(response.total / (response.per_page || 10)));
      setCurrentPage(page);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    fetchItems(1, searchTerm);
  };

  const handlePageChange = (page: number) => {
    fetchItems(page, searchTerm);
  };

  // Estados de permissão
  if (verificandoPermissao) {
    return (
      <div className={pageStyles.content.loadingContainer}>
        <LoadingSpinner />
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className={pageStyles.accessDenied.wrapper}>
        <div className={pageStyles.accessDenied.container}>
          <Shield className={pageStyles.accessDenied.icon} />
          <h2 className={pageStyles.accessDenied.title}>Acesso Negado</h2>
          <p className={pageStyles.accessDenied.message}>
            Você não tem permissão para acessar esta página.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className={pageStyles.layout.container}>
      {/* 📄 Cabeçalho da Página */}
      <div className={pageStyles.header.wrapper}>
        <h1 className={pageStyles.header.title}>{title}</h1>
        <p className={pageStyles.header.subtitle}>{subtitle}</p>
      </div>

      {/* 🔍 Barra de Ações (Busca + Filtros + Botão Principal) */}
      <div className={pageStyles.actionBar.wrapper}>
        <div className={pageStyles.actionBar.leftSection}>
          {/* Busca */}
          <form onSubmit={handleSearch} className={pageStyles.actionBar.searchForm}>
            <div className={pageStyles.actionBar.searchContainer}>
              <Search className={pageStyles.actionBar.searchIcon} />
              <input
                type="text"
                placeholder="Buscar..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className={pageStyles.actionBar.searchInput}
              />
            </div>
          </form>

          {/* Filtros adicionais podem ser adicionados aqui */}
          {/* 
          <select
            className={pageStyles.actionBar.filterSelect}
            aria-label="Filtro"
          >
            <option value="">Todos</option>
          </select>
          */}
        </div>

        {/* Botão Principal */}
        <button
          onClick={() => setIsModalOpen(true)}
          className={pageStyles.actionBar.primaryButton}
        >
          <Plus className={pageStyles.actionBar.primaryButtonIcon} />
          Novo Item
        </button>
      </div>

      {/* ⚠️ Mensagem de Erro */}
      {error && (
        <div className={pageStyles.messages.error}>
          <p className={pageStyles.messages.errorText}>{error}</p>
        </div>
      )}

      {/* 📊 Conteúdo Principal */}
      {loading ? (
        <div className={pageStyles.content.loadingContainer}>
          <LoadingSpinner />
        </div>
      ) : (
        <div className={tableStyles.container.wrapper}>
          <div className={tableStyles.container.scrollWrapper}>
            <table className={tableStyles.table.base}>
              {/* 📋 Cabeçalho da Tabela */}
              <thead className={tableStyles.header.wrapper}>
                <tr>
                  <th className={tableStyles.header.cell}>Nome</th>
                  <th className={tableStyles.header.cell}>Status</th>
                  <th className={tableStyles.header.cellRight}>Ações</th>
                </tr>
              </thead>
              
              {/* 📝 Corpo da Tabela */}
              <tbody className={tableStyles.body.wrapper}>
                {items.map((item) => (
                  <tr key={item.id} className={tableStyles.body.row}>
                    <td className={tableStyles.cell.base}>
                      <span className={tableStyles.cell.text}>{item.nome}</span>
                    </td>
                    
                    <td className={tableStyles.cell.base}>
                      <span className={styleHelpers.getStatusClasses(item.ativo, 'active')}>
                        {item.ativo ? 'Ativo' : 'Inativo'}
                      </span>
                    </td>
                    
                    <td className={tableStyles.cell.actions}>
                      <div className={tableStyles.actions.wrapper}>
                        <button
                          onClick={() => setItemParaVisualizar(item)}
                          className={styleHelpers.getActionButtonClasses('view')}
                          title="Visualizar"
                        >
                          <Eye className={tableStyles.actions.icon} />
                        </button>
                        
                        <button
                          onClick={() => setItemParaEditar(item)}
                          className={styleHelpers.getActionButtonClasses('edit')}
                          title="Editar"
                        >
                          <Edit2 className={tableStyles.actions.icon} />
                        </button>
                        
                        <button
                          onClick={() => setItemParaDeletar(item)}
                          className={styleHelpers.getActionButtonClasses('delete')}
                          title="Excluir"
                        >
                          <Trash2 className={tableStyles.actions.icon} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* 📄 Estado Vazio */}
          {items.length === 0 && (
            <div className={pageStyles.content.emptyState.wrapper}>
              <Package className={pageStyles.content.emptyState.icon} />
              <p className={pageStyles.content.emptyState.text}>
                Nenhum item encontrado
              </p>
            </div>
          )}
        </div>
      )}

      {/* 🔄 Paginação */}
      {totalPages > 1 && (
        <div className={tableStyles.pagination.wrapper}>
          <div className={tableStyles.pagination.mobile.wrapper}>
            <button
              onClick={() => handlePageChange(currentPage - 1)}
              disabled={currentPage === 1}
              className={tableStyles.pagination.mobile.button}
            >
              Anterior
            </button>
            <button
              onClick={() => handlePageChange(currentPage + 1)}
              disabled={currentPage === totalPages}
              className={tableStyles.pagination.mobile.button}
            >
              Próxima
            </button>
          </div>
          
          <div className={tableStyles.pagination.desktop.wrapper}>
            <div>
              <p className={tableStyles.pagination.info}>
                Página <span className="font-medium">{currentPage}</span> de{' '}
                <span className="font-medium">{totalPages}</span>
              </p>
            </div>
            <div>
              <nav className={tableStyles.pagination.desktop.navContainer}>
                <button
                  onClick={() => handlePageChange(currentPage - 1)}
                  disabled={currentPage === 1}
                  className={`${tableStyles.pagination.desktop.button} ${tableStyles.pagination.desktop.buttonFirst}`}
                >
                  Anterior
                </button>
                <button
                  onClick={() => handlePageChange(currentPage + 1)}
                  disabled={currentPage === totalPages}
                  className={`${tableStyles.pagination.desktop.button} ${tableStyles.pagination.desktop.buttonLast}`}
                >
                  Próxima
                </button>
              </nav>
            </div>
          </div>
        </div>
      )}

      {/* 🏠 Modais */}
      {/* Modal de Cadastro */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setFormData({ nome: '' });
          setError('');
        }}
        title="Novo Item"
      >
        <div className={formStyles.container.wrapper}>
          <div className={formStyles.fieldGroup.wrapper}>
            <label className={formStyles.label.required}>Nome</label>
            <input
              type="text"
              value={formData.nome}
              onChange={(e) => setFormData(prev => ({ ...prev, nome: e.target.value }))}
              className={formStyles.input.base}
              placeholder="Digite o nome..."
            />
          </div>
        </div>

        <div className={formStyles.actions.wrapper}>
          <button
            onClick={() => {
              setIsModalOpen(false);
              setFormData({ nome: '' });
              setError('');
            }}
            className={buttonStyles.variants.secondary}
          >
            Cancelar
          </button>
          <button
            onClick={() => {/* Implementar salvamento */}}
            disabled={loading}
            className={buttonStyles.variants.primary}
          >
            {loading ? 'Salvando...' : 'Salvar'}
          </button>
        </div>
      </Modal>

      {/* Modal de Visualização */}
      {itemParaVisualizar && (
        <Modal
          isOpen={!!itemParaVisualizar}
          onClose={() => setItemParaVisualizar(null)}
          title="Visualizar Item"
        >
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-500">Nome</label>
              <p className="text-sm text-gray-900 mt-1">{itemParaVisualizar.nome}</p>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-500">Status</label>
              <span className={styleHelpers.getStatusClasses(itemParaVisualizar.ativo, 'active')}>
                {itemParaVisualizar.ativo ? 'Ativo' : 'Inativo'}
              </span>
            </div>
          </div>

          <div className={formStyles.actions.wrapper}>
            <button
              onClick={() => setItemParaVisualizar(null)}
              className={buttonStyles.variants.secondary}
            >
              Fechar
            </button>
          </div>
        </Modal>
      )}

      {/* Modal de Confirmação de Exclusão */}
      {itemParaDeletar && (
        <Modal
          isOpen={!!itemParaDeletar}
          onClose={() => setItemParaDeletar(null)}
          title="Confirmar Exclusão"
        >
          <div className="space-y-4">
            <p className="text-gray-700">
              Tem certeza que deseja excluir <strong>{itemParaDeletar.nome}</strong>?
            </p>
            <p className="text-sm text-red-600">Esta ação não pode ser desfeita.</p>
          </div>

          <div className={formStyles.actions.wrapper}>
            <button
              onClick={() => setItemParaDeletar(null)}
              className={buttonStyles.variants.secondary}
            >
              Cancelar
            </button>
            <button
              onClick={() => {/* Implementar exclusão */}}
              className={buttonStyles.variants.danger}
            >
              Excluir
            </button>
          </div>
        </Modal>
      )}
    </div>
  );
};