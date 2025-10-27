import React, { useState, useEffect } from "react";
import {
  TrendingUp,
  Users,
  FileText,
  DollarSign,
  UserCheck,
  CheckCircle,
  Clock,
  AlertCircle,
  BarChart3,
  Calendar
} from "lucide-react";
import { apiService } from "../lib/api"; // ✅ CORRIGIDO
import { LoadingSpinner } from "../components/common/LoadingSpinner"; // ✅ CORRIGIDO  
import type { Proposta } from '../types';

interface DashboardStats {
  totalClientes: number;
  totalPropostas: number;
  propostasAbertas: number;
  valorTotalPropostas: number;
  propostas: Proposta[];
}

const StatCard: React.FC<{
  title: string;
  value: string | number;
  icon: React.ComponentType<{ className?: string }>;
  color: string;
  trend?: { value: number; label: string };
}> = ({ title, value, icon: Icon, color, trend }) => (
  <div className="bg-white rounded-lg shadow-sm p-6 border border-gray-200">
    <div className="flex items-center justify-between">
      <div>
        <p className="text-sm font-medium text-gray-600">{title}</p>
        <p className="text-2xl font-bold text-gray-900 mt-1">{value}</p>
        {trend && (
          <p className={`text-sm mt-1 ${trend.value >= 0 ? 'text-green-600' : 'text-red-600'}`}>
            {trend.value >= 0 ? '+' : ''}{trend.value}% {trend.label}
          </p>
        )}
      </div>
      <div className={`${color} p-3 rounded-lg`}>
        <Icon className="w-6 h-6 text-white" />
      </div>
    </div>
  </div>
);

interface DashboardPageProps {
  onNavigate?: (page: string, options?: { openModal?: boolean }) => void;
}

export const DashboardPage: React.FC<DashboardPageProps> = ({ onNavigate }) => {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [isGerente, setIsGerente] = useState(false);

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        setLoading(true);

        // Fetch data from multiple endpoints
        const [clientesRes, propostasRes] = await Promise.all([
          apiService.getClientes({ per_page: 1 }),
          apiService.getPropostas({ per_page: 10 })
        ]);

        const totalClientes = clientesRes.total || 0;
        const totalPropostas = propostasRes.total || 0;
        const propostas = propostasRes.data || [];

        const propostasAbertas = propostas.filter(
          (p: Proposta) => p.status === 'RASCUNHO' || p.status === 'ENVIADA'
        ).length;

        const valorTotalPropostas = propostas.reduce(
          (sum: number, p: Proposta) => sum + (p.valor_total || 0),
          0
        );

        setStats({
          totalClientes,
          totalPropostas,
          propostasAbertas,
          valorTotalPropostas,
          propostas
        });

        // Por enquanto, assumir que o usuário é gerente
        // Em uma implementação real, você verificaria isso na API
        setIsGerente(true);

      } catch (err: unknown) {
        console.error('Dashboard error:', err);
        
        // Tratamento mais específico de erros
        if (err instanceof TypeError && err.message === 'Failed to fetch') {
          setError('Erro de conexão: Verifique se o backend está rodando na porta 5000');
        } else if (err instanceof Error) {
          setError(`Erro ao carregar dados: ${err.message}`);
        } else {
          setError('Erro desconhecido ao carregar dados do dashboard');
        }
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardData();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <LoadingSpinner />
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-lg">
        {error}
      </div>
    );
  }

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'APROVADA': return 'text-green-600 bg-green-100';
      case 'RASCUNHO': return 'text-yellow-600 bg-yellow-100';
      case 'ENVIADA': return 'text-blue-600 bg-blue-100';
      case 'REJEITADA': return 'text-red-600 bg-red-100';
      case 'CANCELADA': return 'text-gray-600 bg-gray-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'APROVADA': return CheckCircle;
      case 'RASCUNHO': return Clock;
      case 'ENVIADA': return AlertCircle;
      case 'REJEITADA': return AlertCircle;
      case 'CANCELADA': return AlertCircle;
      default: return Clock;
    }
  };

  // Funções de navegação para os botões de ação rápida
  const handleNovaPropostaClick = () => {
    if (onNavigate) {
      onNavigate('propostas', { openModal: true });
    }
  };

  const handleNovoClienteClick = () => {
    if (onNavigate) {
      onNavigate('clientes', { openModal: true });
    }
  };

  const handleRelatoriosClick = () => {
    if (onNavigate) {
      onNavigate('relatorios');
    }
  };

  const handleAgendaClick = () => {
    if (onNavigate) {
      onNavigate('agenda');
    }
  };

  const handleFuncionariosClick = () => {
    if (onNavigate) {
      onNavigate('funcionarios', { openModal: true });
    }
  };

  return (
    <div className="space-y-6">
      {/* Page Title */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
        <p className="text-sm text-gray-500">Visão geral do sistema e métricas principais</p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard
          title="Total de Clientes"
          value={stats?.totalClientes || 0}
          icon={Users}
          color="bg-blue-500"
          trend={{ value: 12, label: 'este mês' }}
        />
        <StatCard
          title="Total de Propostas"
          value={stats?.totalPropostas || 0}
          icon={FileText}
          color="bg-green-500"
          trend={{ value: 8, label: 'este mês' }}
        />
        <StatCard
          title="Propostas Abertas"
          value={stats?.propostasAbertas || 0}
          icon={Clock}
          color="bg-yellow-500"
        />
        <StatCard
          title="Valor Total"
          value={formatCurrency(stats?.valorTotalPropostas || 0)}
          icon={DollarSign}
          color="bg-purple-500"
          trend={{ value: 15, label: 'este mês' }}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Proposals */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200">
          <div className="p-6 border-b border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900 flex items-center">
              <FileText className="w-5 h-5 mr-2" />
              Propostas Recentes
            </h3>
          </div>
          <div className="p-6">
            {stats?.propostas.length === 0 ? (
              <p className="text-gray-500 text-center py-8">
                Nenhuma proposta encontrada
              </p>
            ) : (
              <div className="space-y-4">
                {stats?.propostas.slice(0, 5).map((proposta: Proposta) => {
                  const StatusIcon = getStatusIcon(proposta.status);
                  return (
                    <div key={proposta.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <div className="flex items-center space-x-3">
                        <StatusIcon className="w-4 h-4 text-gray-500" />
                        <div>
                          <p className="text-sm font-medium text-gray-900">
                            Proposta #{proposta.numero || proposta.id}
                          </p>
                          <p className="text-xs text-gray-500">
                            {proposta.cliente?.nome || 'Cliente não informado'}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(proposta.status)}`}>
                          {proposta.status}
                        </span>
                        <p className="text-sm font-medium text-gray-900">
                          {formatCurrency(proposta.valor_total || 0)}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Quick Actions */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200">
          <div className="p-6 border-b border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900 flex items-center">
              <TrendingUp className="w-5 h-5 mr-2" />
              Ações Rápidas
            </h3>
          </div>
          <div className="p-6">
            <div className="grid grid-cols-2 gap-4">
              <button
                onClick={handleNovaPropostaClick}
                className="p-4 border-2 border-dashed border-gray-300 rounded-lg hover:border-blue-500 hover:bg-blue-50 transition-colors group cursor-pointer"
              >
                <FileText className="w-8 h-8 text-gray-400 group-hover:text-blue-500 mx-auto mb-2" />
                <p className="text-sm font-medium text-gray-600 group-hover:text-blue-600">
                  Nova Proposta
                </p>
              </button>
              <button
                onClick={handleNovoClienteClick}
                className="p-4 border-2 border-dashed border-gray-300 rounded-lg hover:border-green-500 hover:bg-green-50 transition-colors group cursor-pointer"
              >
                <Users className="w-8 h-8 text-gray-400 group-hover:text-green-500 mx-auto mb-2" />
                <p className="text-sm font-medium text-gray-600 group-hover:text-green-600">
                  Novo Cliente
                </p>
              </button>
              {isGerente && (
                <button
                  onClick={handleFuncionariosClick}
                  className="p-4 border-2 border-dashed border-gray-300 rounded-lg hover:border-orange-500 hover:bg-orange-50 transition-colors group cursor-pointer"
                >
                  <UserCheck className="w-8 h-8 text-gray-400 group-hover:text-orange-500 mx-auto mb-2" />
                  <p className="text-sm font-medium text-gray-600 group-hover:text-orange-600">
                    Novo Funcionário
                  </p>
                </button>
              )}
              <button
                onClick={handleRelatoriosClick}
                className="p-4 border-2 border-dashed border-gray-300 rounded-lg hover:border-purple-500 hover:bg-purple-50 transition-colors group cursor-pointer"
              >
                <BarChart3 className="w-8 h-8 text-gray-400 group-hover:text-purple-500 mx-auto mb-2" />
                <p className="text-sm font-medium text-gray-600 group-hover:text-purple-600">
                  Relatórios
                </p>
              </button>
              <button
                onClick={handleAgendaClick}
                className="p-4 border-2 border-dashed border-gray-300 rounded-lg hover:border-yellow-500 hover:bg-yellow-50 transition-colors group cursor-pointer"
              >
                <Calendar className="w-8 h-8 text-gray-400 group-hover:text-yellow-500 mx-auto mb-2" />
                <p className="text-sm font-medium text-gray-600 group-hover:text-yellow-600">
                  Agenda
                </p>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};