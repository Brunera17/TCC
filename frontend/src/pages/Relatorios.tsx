import React, { useState } from 'react';
import { BarChart3, Download, Calendar, FileText, Calculator, DollarSign, Users } from 'lucide-react';
import { PageLayout, PageHeader, Card } from '../components/ui';
import { ErrorMessage } from '../components/ui/ErrorMessage';
import { Button, Input } from '../components/forms';
import { Modal } from '../components/modals/Modal';

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
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // Estado para modal de agendamentos
  const [isAgendamentoModalOpen, setIsAgendamentoModalOpen] = useState(false);
  const [agendamentoInicio, setAgendamentoInicio] = useState<string>('');
  const [agendamentoFim, setAgendamentoFim] = useState<string>('');
  const [pendingRelatorio, setPendingRelatorio] = useState<RelatorioPredefinido | null>(null);

  const handleGerarRelatorioPredefinido = async (relatorio: RelatorioPredefinido) => {
    setError(null);
    setLoading(true);
    try {
      // Chama a rota Flask correspondente e espera um PDF
      // Garante que o endpoint seja /reports/<tipo> e use o backend Flask
      // Remove qualquer /api ou /relatorios do endpoint e monta a rota correta
      const backendUrl = 'http://localhost:5000';
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
        } catch {
          setError('Falha ao gerar relatório ou formato inválido.');
        }
      }
    } catch (err) {
      setError(`Erro ao gerar ${relatorio.nome}`);
    } finally {
      setLoading(false);
    }
  };

  const fecharModalAgendamento = () => {
    setIsAgendamentoModalOpen(false);
    setPendingRelatorio(null);
    setError(null);
  };

  const confirmarGerarAgendamento = async () => {
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (agendamentoInicio && !dateRegex.test(agendamentoInicio)) { setError('Formato de data inválido para início. Use YYYY-MM-DD'); return; }
    if (agendamentoFim && !dateRegex.test(agendamentoFim)) { setError('Formato de data inválido para fim. Use YYYY-MM-DD'); return; }
    if (!pendingRelatorio) { setError('Relatório inválido'); fecharModalAgendamento(); return; }

    setIsAgendamentoModalOpen(false);
    setLoading(true);
    setError(null);
    try {
      const backendUrl = 'http://localhost:5000';
      const tipo = pendingRelatorio.tipo;
      let url = `${backendUrl}/reports/${tipo}`;
      const params = new URLSearchParams();
      if (agendamentoInicio) params.append('inicio', agendamentoInicio);
      if (agendamentoFim) params.append('fim', agendamentoFim);
      const qs = params.toString();
      if (qs) url = `${url}?${qs}`;

      const response = await fetch(url, { method: 'GET', headers: { 'Accept': 'application/pdf' } });
      if (response.status === 204) { setError('Relatório ainda não implementado.'); return; }
      if (response.ok && response.headers.get('content-type')?.includes('application/pdf')) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${pendingRelatorio.nome}.pdf`;
        document.body.appendChild(a);
        a.click();
        a.remove();
        window.URL.revokeObjectURL(url);
      } else {
        try {
          const errorJson = await response.json();
          const msg = errorJson && (errorJson.error || errorJson.message || JSON.stringify(errorJson));
          setError(msg || 'Falha ao gerar relatório ou formato inválido.');
        } catch (e) {
          setError('Falha ao gerar relatório ou formato inválido.');
        }
      }
    } catch (err) {
      setError('Erro ao gerar relatório de agendamentos');
    } finally {
      setLoading(false);
      setPendingRelatorio(null);
    }
  };

  return (
    <PageLayout>
      <PageHeader
        title="Relatórios"
        subtitle="Gere e visualize relatórios sobre clientes, propostas e mais"
      >
      </PageHeader>

      {error && (
        <ErrorMessage message={error} onDismiss={() => setError(null)} className="mb-4" />
      )}

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
                disabled={loading}
                leftIcon={<Download className="w-4 h-4" />}
              >
                Gerar Agora
              </Button>
            </Card>
          ))}
        </div>
      </Card>

      {/* Modal para informar período de agendamentos */}
      <Modal isOpen={isAgendamentoModalOpen} onClose={fecharModalAgendamento} title="Relatório de Agendamentos">
        <div className="grid grid-cols-1 gap-3">
          <label className="text-sm text-gray-700">Informe data de início (YYYY-MM-DD) — deixar vazio para sem filtro</label>
          <Input type="date" value={agendamentoInicio} onChange={(e) => setAgendamentoInicio(e.target.value)} />
          <label className="text-sm text-gray-700">Informe data de fim (YYYY-MM-DD) — deixar vazio para sem filtro</label>
          <Input type="date" value={agendamentoFim} onChange={(e) => setAgendamentoFim(e.target.value)} />
          <div className="flex justify-end gap-2 mt-4">
            <Button variant="ghost" onClick={fecharModalAgendamento}>Cancelar</Button>
            <Button onClick={confirmarGerarAgendamento}>Gerar PDF</Button>
          </div>
        </div>
      </Modal>
    </PageLayout>
  );
};

// Exportar como default se for o único export do arquivo
export default RelatoriosPage;
