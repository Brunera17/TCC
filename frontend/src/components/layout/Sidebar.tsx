import { useState } from 'react';
import type { ComponentType } from 'react';
import {
  Home,
  Users,
  UserCheck,
  Building2,
  FileText,
  Calculator,
  Settings,
  MessageCircle,
  BarChart3,
  Shield,
  LogOut,
  Calendar,
  Briefcase
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { NotificacoesDropdown } from '../common/NotificacoesDropdown';

interface SidebarProps {
  currentPage: string;
  setCurrentPage: (page: string) => void;
  onNavigateToProposta?: (propostaId: number) => void;
}

interface MenuItem {
  id: string;
  label: string;
  icon: ComponentType<{ className?: string }>;
  section: string;
}

const menuItems: MenuItem[] = [
  { id: 'dashboard', label: 'Dashboard', icon: Home, section: 'main' },
  { id: 'propostas', label: 'Propostas', icon: FileText, section: 'main' },
  { id: 'clientes', label: 'Clientes', icon: Users, section: 'main' },
  { id: 'funcionarios', label: 'Funcionários', icon: UserCheck, section: 'gestao' },
  { id: 'cargos', label: 'Cargos', icon: Briefcase, section: 'gestao' },
  { id: 'tipos-atividade', label: 'Tipos de Atividade', icon: Building2, section: 'gestao' },
  { id: 'regimes-tributarios', label: 'Regimes Tributários', icon: Shield, section: 'gestao' },
  { id: 'servicos', label: 'Serviços', icon: Calculator, section: 'gestao' },
  { id: 'relatorios', label: 'Relatórios', icon: BarChart3, section: 'analise' },
  { id: 'agenda', label: 'Agenda', icon: Calendar, section: 'analise' },
  { id: 'chat', label: 'Chat de Suporte', icon: MessageCircle, section: 'suporte' },
  { id: 'configuracoes', label: 'Configurações', icon: Settings, section: 'sistema' },
];

export const Sidebar: React.FC<SidebarProps> = ({
  currentPage,
  setCurrentPage,
  onNavigateToProposta
}) => {
  const { logout, user } = useAuth();
  const [, setNotificationCount] = useState(0);
  // Estado para mobile
  const [mobileOpen, setMobileOpen] = useState(false);

  const handleNotificationCountChange = (count: number) => {
    setNotificationCount(count);
  };

  // Botão hambúrguer para mobile
  const HamburgerButton = () => (
    <button
      className="md:hidden fixed top-4 left-4 z-50 bg-white rounded-full shadow-lg p-2 border border-gray-200"
      onClick={() => setMobileOpen(true)}
      aria-label="Abrir menu"
    >
      <svg width="24" height="24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-custom-blue">
        <line x1="3" y1="12" x2="21" y2="12" />
        <line x1="3" y1="6" x2="21" y2="6" />
        <line x1="3" y1="18" x2="21" y2="18" />
      </svg>
    </button>
  );

  const getSectionTitle = (section: string) => {
    switch (section) {
      case 'main': return 'Principal';
      case 'gestao': return 'Gestão';
      case 'analise': return 'Análise';
      case 'suporte': return 'Suporte';
      case 'sistema': return 'Sistema';
      default: return '';
    }
  };

  const renderMenuSection = (section: string) => {
    const sectionItems = menuItems.filter(item => item.section === section);
    if (sectionItems.length === 0) return null;

    return (
      <div key={section} className="mb-6">
        <h3 className="px-3 mb-2 text-xs font-semibold text-gray-500 uppercase tracking-wider">
          {getSectionTitle(section)}
        </h3>
        <div className="space-y-1">
          {sectionItems.map((item) => {
            const Icon = item.icon;
            return (
              <button
                key={item.id}
                onClick={() => setCurrentPage(item.id)}
                className={`w-full flex items-center px-3 py-2 text-sm font-medium rounded-lg transition-colors ${currentPage === item.id
                  ? 'bg-custom-blue text-white'
                  : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
                  }`}
              >
                <Icon className="w-4 h-4 mr-3 flex-shrink-0" />
                <span>{item.label}</span>
              </button>
            );
          })}
        </div>
      </div>
    );
  };

  return (
    <>
      {/* Botão hambúrguer só no mobile */}
      <HamburgerButton />
      {/* Sidebar para desktop */}
      <div className="w-64 bg-white text-gray-900 border-r border-gray-200 flex flex-col h-screen hidden md:flex">
        {/* ...existing code... */}
        <div className="flex items-center p-4 border-b border-gray-200">
          <div className="flex items-center">
            <div className="w-8 h-8 bg-gradient-to-br from-custom-blue to-purple-600 rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-sm">P</span>
            </div>
            <div className="ml-3">
              <h1 className="text-lg font-bold">Propostas</h1>
              <p className="text-xs text-gray-500">Sistema Contábil</p>
            </div>
          </div>
        </div>
        <div className="flex-1 overflow-y-auto py-4 px-3">
          {['main', 'gestao', 'analise', 'suporte', 'sistema'].map(renderMenuSection)}
        </div>
        <div className="border-t border-gray-200 p-3">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 bg-gradient-to-br from-custom-blue to-purple-600 rounded-full flex items-center justify-center">
                <span className="text-white font-bold text-sm">
                  {user?.nome ? user.nome.charAt(0).toUpperCase() : 'U'}
                </span>
              </div>
              <div className="text-left">
                <p className="text-sm font-medium text-gray-900">
                  {user?.nome || 'Usuário'}
                </p>
                <p className="text-xs text-gray-500">
                  {user?.cargo?.nome || 'Funcionário'}
                  {user?.gerente && ' • Gerente'}
                </p>
              </div>
            </div>
            <NotificacoesDropdown
              onNotificationCountChange={handleNotificationCountChange}
              onNavigateToProposta={onNavigateToProposta}
            />
          </div>
        </div>
        <div className="border-t border-gray-200 p-3">
          <button
            onClick={logout}
            className="w-full flex items-center px-3 py-2 text-sm font-medium text-red-600 hover:bg-red-50 hover:text-red-700 rounded-lg transition-colors"
          >
            <LogOut className="w-4 h-4 mr-3 flex-shrink-0" />
            <span>Sair</span>
          </button>
        </div>
      </div>
      {/* Sidebar mobile: drawer lateral */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 flex">
          {/* Overlay escuro */}
          <div className="fixed inset-0 bg-black bg-opacity-40" onClick={() => setMobileOpen(false)} />
          {/* Drawer lateral */}
          <div className="w-64 bg-white text-gray-900 border-r border-gray-200 flex flex-col h-full shadow-xl relative">
            {/* Botão fechar */}
            <button
              className="absolute top-4 right-4 text-gray-500 hover:text-gray-900"
              onClick={() => setMobileOpen(false)}
              aria-label="Fechar menu"
            >
              <svg width="24" height="24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
            {/* ...existing code... */}
            <div className="flex items-center p-4 border-b border-gray-200">
              <div className="flex items-center">
                <div className="w-8 h-8 bg-gradient-to-br from-custom-blue to-purple-600 rounded-lg flex items-center justify-center">
                  <span className="text-white font-bold text-sm">P</span>
                </div>
                <div className="ml-3">
                  <h1 className="text-lg font-bold">Propostas</h1>
                  <p className="text-xs text-gray-500">Sistema Contábil</p>
                </div>
              </div>
            </div>
            <div className="flex-1 overflow-y-auto py-4 px-3">
              {['main', 'gestao', 'analise', 'suporte', 'sistema'].map(renderMenuSection)}
            </div>
            <div className="border-t border-gray-200 p-3">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center space-x-3">
                  <div className="w-8 h-8 bg-gradient-to-br from-custom-blue to-purple-600 rounded-full flex items-center justify-center">
                    <span className="text-white font-bold text-sm">
                      {user?.nome ? user.nome.charAt(0).toUpperCase() : 'U'}
                    </span>
                  </div>
                  <div className="text-left">
                    <p className="text-sm font-medium text-gray-900">
                      {user?.nome || 'Usuário'}
                    </p>
                    <p className="text-xs text-gray-500">
                      {user?.cargo?.nome || 'Funcionário'}
                      {user?.gerente && ' • Gerente'}
                    </p>
                  </div>
                </div>
                <NotificacoesDropdown
                  onNotificationCountChange={handleNotificationCountChange}
                  onNavigateToProposta={onNavigateToProposta}
                />
              </div>
            </div>
            <div className="border-t border-gray-200 p-3">
              <button
                onClick={logout}
                className="w-full flex items-center px-3 py-2 text-sm font-medium text-red-600 hover:bg-red-50 hover:text-red-700 rounded-lg transition-colors"
              >
                <LogOut className="w-4 h-4 mr-3 flex-shrink-0" />
                <span>Sair</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
