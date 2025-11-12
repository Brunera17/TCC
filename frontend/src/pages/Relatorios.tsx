import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { BarChart3, Download, Eye, Calendar, Filter, Search, Plus, FileText, Calculator, DollarSign, Users } from 'lucide-react'; // Added Users here
import { apiService, ApiError } from '../lib/api';
import { PageLayout, PageHeader, DataTable, StateHandler, Card, type Column } from '../components/ui'; // Keep only UI components here
import { formatarData } from '../utils/formatters';
import { Button, Input, Select } from '../components/forms'; // Import Button, Input, and Select from forms index
import { Modal } from '../components/modals/Modal';
interface Relatorio {
  id: number;
  titulo: string;
  tipo: string; // 'vendas', 'clientes', 'propostas', etc.
  data_criacao: string;
  // Outros campos possíveis (filtros, campos, etc.) - a API não especifica
  filtros?: Record<string, any>;
  campos?: string[];
}

// Interface para os relatórios predefinidos
interface RelatorioPredefinido {
  tipo: string;
  nome: string;
  descricao: string;
  endpoint: string;
  icon: React.ElementType;
}

const relatoriosPredefinidos: RelatorioPredefinido[] = [
  { tipo: 'clientes', nome: 'Relatório de Clientes', descricao: 'Visão geral dos clientes cadastrados.', endpoint: '/api/relatorios/clientes', icon: Users },
  { tipo: 'propostas', nome: 'Relatório de Propostas', descricao: 'Análise das propostas criadas.', endpoint: '/api/relatorios/propostas', icon: FileText },
  { tipo: 'agendamentos', nome: 'Relatório de Agendamentos', descricao: 'Acompanhamento de agendamentos.', endpoint: '/api/relatorios/agendamentos', icon: Calendar },
  { tipo: 'servicos', nome: 'Relatório de Serviços', descricao: 'Detalhes sobre os serviços oferecidos.', endpoint: '/api/relatorios/servicos', icon: Calculator },
  { tipo: 'financeiro', nome: 'Relatório Financeiro', descricao: 'Visão geral financeira (propostas).', endpoint: '/api/relatorios/financeiro', icon: DollarSign },
];

export const RelatoriosPage: React.FC = () => {
  const [relatoriosSalvos, setRelatoriosSalvos] = useState<Relatorio[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [tipoFiltro, setTipoFiltro] = useState('');
  // Estado para modal de agendamentos
  const [isAgendamentoModalOpen, setIsAgendamentoModalOpen] = useState(false);
  const [agendamentoInicio, setAgendamentoInicio] = useState<string>('');
  const [agendamentoFim, setAgendamentoFim] = useState<string>('');
  const [pendingRelatorio, setPendingRelatorio] = useState<RelatorioPredefinido | null>(null);

  const fetchRelatoriosSalvos = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      // A API_URL já inclui /api, então removemos duplicidade
      // Assumindo que apiService.getRelatorios() busca /api/relatorios (relatórios salvos)
      const response = await apiService.getRelatorios(); // Usar método genérico getRelatorios
      // A API /api/relatorios não foi detalhada na estrutura de resposta, assumindo array direto
      setRelatoriosSalvos(Array.isArray(response) ? response : []);
    } catch (err) {
      console.error('Erro ao buscar relatórios salvos:', err);
      const message = err instanceof ApiError
        ? `Erro ${err.status}: ${JSON.stringify(err.details)}`
        : err instanceof Error
          ? err.message
          : 'Erro desconhecido';
      setError(`Falha ao carregar relatórios salvos: ${message}`);
      setRelatoriosSalvos([]); // Limpa em caso de erro
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchRelatoriosSalvos();
  }, [fetchRelatoriosSalvos]);

  // Filtrar relatórios salvos localmente (API não especifica filtros no GET /relatorios)
  const relatoriosFiltrados = relatoriosSalvos.filter(relatorio => {
    const termo = searchTerm.toLowerCase();
    const tipoMatch = !tipoFiltro || relatorio.tipo.toLowerCase() === tipoFiltro.toLowerCase();
    const searchMatch = !termo ||
      relatorio.titulo.toLowerCase().includes(termo) ||
      relatorio.tipo.toLowerCase().includes(termo);
    return tipoMatch && searchMatch;
  });

  const handleGerarRelatorioPredefinido = async (relatorio: RelatorioPredefinido) => {
    setError(null);
    setLoading(true);
    try {
      // Chama a rota Flask correspondente e espera um PDF
      // Garante que o endpoint seja /reports/<tipo> e use o backend Flask
      const backendUrl = 'http://localhost:5000';
      // Remove qualquer /api ou /relatorios do endpoint e monta a rota correta
      const tipo = relatorio.tipo;
      let url = `${backendUrl}/reports/${tipo}`;

      // Caso especial: agendamentos -> abrir modal para informar período
      if (tipo === 'agendamentos') {
        // abrir modal controlado com campos de data
        setPendingRelatorio(relatorio);
        setAgendamentoInicio('2025-01-01');
        setAgendamentoFim('2025-12-31');
        setIsAgendamentoModalOpen(true);
        setLoading(false);
        return;
      }
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Accept': 'application/pdf',
        },
      });
      if (response.status === 204) {
        setError('Relatório ainda não implementado.');
        return;
      }
      if (response.ok && response.headers.get('content-type')?.includes('application/pdf')) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${relatorio.nome}.pdf`;
        document.body.appendChild(a);
        a.click();
        a.remove();
        window.URL.revokeObjectURL(url);
      } else {
        // Tenta extrair mensagem de erro JSON do backend para exibir informação mais útil
        try {
          const errorJson = await response.json();
          const msg = errorJson && (errorJson.error || errorJson.message || JSON.stringify(errorJson));
          setError(msg || 'Falha ao gerar relatório ou formato inválido.');
        } catch (e) {
          setError('Falha ao gerar relatório ou formato inválido.');
        }
      }
    } catch (err) {
      setError(`Erro ao gerar ${relatorio.nome}`);
    } finally {
      setLoading(false);
    }
  };

  const handleExportarRelatorio = (relatorio: Relatorio) => {
    alert(`Exportando ${relatorio.titulo}... (Funcionalidade de exemplo)`);
    // Aqui você chamaria POST /api/relatorios/export com os dados do relatório
  };

  const handleCriarRelatorio = () => {
    alert('Abrir modal/página para criar relatório customizado... (Funcionalidade de exemplo)');
    // Implementar lógica para POST /api/relatorios/custom
  };

  const colunasRelatoriosSalvos: Column<Relatorio>[] = [
    {
      key: 'titulo',
      label: 'Título',
      render: (item) => <span className="font-medium">{item.titulo}</span>,
    },
    {
      key: 'tipo',
      label: 'Tipo',
      render: (item) => <span className="capitalize">{item.tipo}</span>,
    },
    {
      key: 'data_criacao',
      label: 'Criado em',
      render: (item) => formatarData(item.data_criacao)
    },
    // Adicionar mais colunas se a API retornar mais dados (ex: filtros usados)
  ];

  const tiposDisponiveis = useMemo(() => {
    const tipos = new Set(relatoriosPredefinidos.map(r => r.tipo));
    return Array.from(tipos).map(tipo => ({ value: tipo, label: tipo.charAt(0).toUpperCase() + tipo.slice(1) }));
  }, []);

  return (
    <PageLayout>
      <PageHeader
        title="Relatórios"
        subtitle="Gere e visualize relatórios sobre clientes, propostas e mais"
      >
        <Button onClick={handleCriarRelatorio} leftIcon={<Plus className="w-4 h-4" />}>
          Criar Relatório Personalizado
        </Button>
      </PageHeader>

      {/* Relatórios Predefinidos */}
      <Card>
        <h2 className="text-xl font-semibold text-gray-800 mb-4 flex items-center">
          <BarChart3 className="w-5 h-5 mr-2 text-blue-600" />
          Relatórios Predefinidos
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {relatoriosPredefinidos.map((relatorio) => (
            <Card key={relatorio.tipo} className="hover:shadow-md transition-shadow border-gray-200">
              <div className="flex items-center mb-2">
                <relatorio.icon className="w-6 h-6 text-blue-500 mr-3" />
                <h3 className="font-semibold text-gray-700">{relatorio.nome}</h3>
              </div>
              <p className="text-sm text-gray-500 mb-4">{relatorio.descricao}</p>
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleGerarRelatorioPredefinido(relatorio)}
                leftIcon={<Download className="w-4 h-4" />}
              >
                Gerar Agora
              </Button>
            </Card>
          ))}
        </div>
      </Card>

      {/* Relatórios Salvos / Personalizados */}
      <Card>
        <h2 className="text-xl font-semibold text-gray-800 mb-4 flex items-center">
          <Calendar className="w-5 h-5 mr-2 text-purple-600" />
          Relatórios Salvos / Personalizados
        </h2>

        {/* Filtros e Busca */}
        <div className="flex flex-col md:flex-row gap-4 mb-4 p-4 bg-gray-50 rounded-lg border">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <Input
              placeholder="Buscar por título ou tipo..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 w-full"
            />
          </div>
          <div className="relative w-full md:w-64">
            <Filter className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <Select
              options={[{ value: '', label: 'Filtrar por tipo...' }, ...tiposDisponiveis]}
              value={tipoFiltro}
              onChange={(value) => setTipoFiltro(value)}
              className="pl-10 w-full bg-white" // Ensure select background is white
            />
          </div>
        </div>

        <StateHandler
          loading={loading}
          error={error || undefined}
          onErrorDismiss={() => setError(null)}
          isEmpty={relatoriosFiltrados.length === 0 && !loading}
          emptyState={
            <div className="text-center py-8 text-gray-500">
              Nenhum relatório salvo encontrado {searchTerm || tipoFiltro ? 'com os filtros aplicados' : ''}.
            </div>
          }
        >
          <DataTable
            data={relatoriosFiltrados}
            columns={colunasRelatoriosSalvos}
            actions={(item) => (
              <div className="flex space-x-2">
                <Button variant="ghost" size="sm" onClick={() => alert(`Visualizando ${item.titulo}...`)} title="Visualizar">
                  <Eye className="w-4 h-4" />
                </Button>
                <Button variant="ghost" size="sm" onClick={() => handleExportarRelatorio(item)} title="Exportar">
                  <Download className="w-4 h-4" />
                </Button>
              </div>
            )}
          />
        </StateHandler>
      </Card>

    </PageLayout>
  );
};

// Exportar como default se for o único export do arquivo
export default RelatoriosPage;