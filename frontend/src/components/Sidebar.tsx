import { NavLink, useNavigate } from 'react-router-dom';
import type { LucideIcon } from 'lucide-react';
import {
    Home,
    Users,
    UserCheck,
    Building2,
    FileText,
    Calculator,
    Settings,
    Handshake,
    BarChart3,
    Shield,
    LogOut,
    Bell,
    User,
    Calendar,
    Briefcase
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { API_URL } from '../lib/api';

interface MenuItem {
    id: string;
    label: string;
    icon: LucideIcon;
    section: string;
    route: string;
}

type ExtendedUser = {
    foto?: string | null;
    cargo?: { nome?: string | null } | null;
    tipo_usuario?: string | null;
};

type SidebarUser = ExtendedUser & {
    nome?: string | null;
    username?: string | null;
    gerente?: boolean | null;
};

const resolveAvatarUrl = (foto?: string | null): string | null => {
    if (!foto) return null;
    if (/^(https?:|data:)/i.test(foto)) return foto;
    const sanitized = foto.replace(/^\/+/, '');
    const apiBase = API_URL.replace(/\/+$/g, '');
    if (apiBase.startsWith('http')) {
        const base = apiBase.replace(/\/api$/i, '') || apiBase;
        return `${base}/${sanitized}`;
    }
    return `/${sanitized}`;
};

const getInitials = (nome?: string | null, username?: string | null): string => {
    const fonte = nome?.trim() || username?.trim() || '';
    if (!fonte) return '';
    const partes = fonte.split(/\s+/).filter(Boolean);
    if (partes.length === 0) return '';
    return partes
        .slice(0, 2)
        .map((parte) => parte[0]?.toUpperCase() ?? '')
        .join('');
};

const formatRole = (user: SidebarUser | null): string => {
    if (!user) return 'Usuario';
    if (user.cargo?.nome) return user.cargo.nome;
    if (user.gerente) return 'Gerente';
    if (typeof user.tipo_usuario === 'string' && user.tipo_usuario.trim()) {
        const valor = user.tipo_usuario.trim();
        return valor.charAt(0).toUpperCase() + valor.slice(1).toLowerCase();
    }
    return 'Usuario';
};

const menuItems: MenuItem[] = [
    { id: 'dashboard', label: 'Dashboard', icon: Home, section: 'main', route: '/home' },
    { id: 'propostas', label: 'Propostas', icon: FileText, section: 'main', route: '/propostas' },
    { id: 'ordem-de-servicos', label: 'Ordem de Serviços', icon: Handshake, section: 'main', route: '/ordem-servicos' },
    { id: 'clientes', label: 'Clientes', icon: Users, section: 'main', route: '/clientes' },
    { id: 'funcionarios', label: 'Funcionários', icon: UserCheck, section: 'gestao', route: '/funcionarios' },
    { id: 'cargos', label: 'Cargos', icon: Briefcase, section: 'gestao', route: '/cargos' },
    { id: 'tipos-atividade', label: 'Tipos de Atividade', icon: Building2, section: 'gestao', route: '/tipos-atividade' },
    { id: 'regimes-tributarios', label: 'Regimes Tributários', icon: Shield, section: 'gestao', route: '/regimes-tributarios' },
    { id: 'servicos', label: 'Serviços', icon: Calculator, section: 'gestao', route: '/servicos' },
    { id: 'relatorios', label: 'Relatórios', icon: BarChart3, section: 'analise', route: '/relatorios' },
    { id: 'agenda', label: 'Agenda', icon: Calendar, section: 'analise', route: '/agenda' },
    { id: 'configuracoes', label: 'Configurações', icon: Settings, section: 'sistema', route: '/configuracoes' },
];

const Sidebar: React.FC = () => {
    const navigate = useNavigate();
    const { user } = useAuth();
    const sidebarUser = (user as SidebarUser | null) ?? null;
    const avatarUrl = resolveAvatarUrl(sidebarUser?.foto ?? null);
    const displayName = sidebarUser?.nome?.trim() || sidebarUser?.username?.trim() || 'Usuario';
    const roleLabel = formatRole(sidebarUser);
    const initials = avatarUrl ? '' : getInitials(sidebarUser?.nome ?? null, sidebarUser?.username ?? null);

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
                <h3 className="px-3 mb-2 text-xs font-semibold text-gray-400 uppercase tracking-wider">
                    {getSectionTitle(section)}
                </h3>
                {sectionItems.map((item) => {
                    const IconComponent = item.icon;

                    return (
                        <NavLink
                            key={item.id}
                            to={item.route}
                            className={({ isActive }) =>
                                `w-full flex items-center px-3 py-2 mb-1 text-sm font-medium rounded-lg transition-colors ${isActive
                                    ? 'bg-blue-50 text-blue-700 border-r-2 border-blue-700'
                                    : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
                                }`
                            }
                        >
                            <IconComponent className="w-4 h-4 mr-3 flex-shrink-0" />
                            <span>{item.label}</span>
                        </NavLink>
                    );
                })}
            </div>
        );
    };

    const logout = () => {
        localStorage.removeItem('access_token');
        localStorage.removeItem('refresh_token');
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        localStorage.removeItem('autenticado');
        navigate('/');
    };

    return (
        <div className="fixed inset-y-0 left-0 z-30 flex h-screen w-64 flex-col border-r border-gray-200 bg-white text-gray-900">
            <div className="flex items-center p-4 border-b border-gray-200">
                <div className="flex items-center">
                    <img
                        src="/logo contagest.png"
                        alt="Logo ContaGest"
                        className="w-12 h-12 rounded-full object-cover"
                    />
                    <div className="ml-3">
                        <h1 className="text-lg font-bold">ContaGest</h1>
                        <p className="text-xs text-gray-500">Sistema Gerenciador</p>
                    </div>
                </div>
            </div>

            {/* Navigation */}
            <div className="flex-1 overflow-y-auto py-4 px-3">
                {['main', 'gestao', 'analise', 'suporte', 'sistema'].map(renderMenuSection)}
            </div>

            {/* User Section */}
            <div className="border-t border-gray-200 p-3">
                <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center space-x-3">
                        {avatarUrl ? (
                            <img
                                src={avatarUrl}
                                alt={`Foto de ${displayName}`}
                                className="h-10 w-10 rounded-full border border-gray-200 object-cover"
                            />
                        ) : (
                            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gray-200 text-sm font-semibold text-gray-600">
                                {initials || <User className="h-5 w-5 text-gray-500" />}
                            </div>
                        )}
                        <div className="text-left">
                            <p className="text-sm font-medium text-gray-900">{displayName}</p>
                            <p className="text-xs text-gray-500">{roleLabel}</p>
                        </div>
                    </div>
                    <button className="relative p-2 text-gray-400 hover:text-gray-600 transition-colors rounded-lg hover:bg-gray-100">
                        <Bell className="w-5 h-5" />
                        <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 text-white text-xs rounded-full flex items-center justify-center">
                            1
                        </span>
                    </button>
                </div>
            </div>

            {/* Logout Button */}
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
    )
}

export default Sidebar;