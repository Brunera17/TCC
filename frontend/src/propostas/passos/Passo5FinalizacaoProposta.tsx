import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
    CheckCircle,
    ArrowLeft,
    AlertTriangle,
    User,
    Building,
    Settings,
    List,
    Calculator,
    MessageSquare,
    FileDown,
    FileText,
    Info,
    Save,
    RefreshCw
} from 'lucide-react';
import { apiService } from '../../lib/api';
import { LoadingSpinner } from '../../components/common/LoadingSpinner';
import type { Cliente } from '../../types';
import { useToast } from '../../context/ToastContext';

// Interfaces TypeScript
interface TipoAtividade {
    id: number;
    codigo: string;
    nome: string;
    aplicavel_pf: boolean;
    aplicavel_pj: boolean;
    ativo: boolean;
}

interface RegimeTributario {
    id: number;
    codigo: string;
    nome: string;
    aplicavel_pf: boolean;
    aplicavel_pj: boolean;
    requer_definicoes_fiscais: boolean;
    ativo: boolean;
}

interface FaixaFaturamento {
    id: number;
    nome: string;
    valor_inicial: number;
    valor_final?: number;
    aliquota: number;
    regime_tributario_id: number;
    ativo: boolean;
}

interface Servico {
    id: number;
    codigo: string;
    nome: string;
    categoria: string;
    tipo_cobranca: string;
    valor_base: number;
    descricao: string;
    ativo: boolean;
}

interface ServicoSelecionado {
    servico_id: number;
    quantidade: number;
    valor_unitario: number;
    subtotal: number;
    extras?: Record<string, any>;
}

interface PropostaCompleta {
    cliente: Cliente;
    tipoAtividade: TipoAtividade;
    regimeTributario: RegimeTributario;
    faixaFaturamento?: FaixaFaturamento;
    servicosSelecionados: ServicoSelecionado[];
}

interface PropostaComDesconto extends PropostaCompleta {
    id?: number;
    percentualDesconto: number;
    valorDesconto: number;
    totalFinal: number;
    requerAprovacao: boolean;
    observacoes?: string;
}

interface PropostaResponse {
    id: number;
    numero: string;
    cliente_id: number;
    funcionario_responsavel_id?: number;
    tipo_atividade_id: number;
    regime_tributario_id: number;
    faixa_faturamento_id?: number;
    valor_total: number;
    status: string;
    data_criacao: string;
    data_atualizacao: string;
    ativo: boolean;
    pdf_gerado?: boolean;
    pdf_caminho?: string;
    pdf_data_geracao?: string;
}

interface Passo5Props {
    dadosCompletos: PropostaComDesconto;
    proposta: PropostaResponse;
    onVoltar: () => void;
    onNovaProposta: () => void;
}

// Função para formatar moeda
const formatarMoeda = (valor: number): string => {
    return new Intl.NumberFormat('pt-BR', {
        style: 'currency',
        currency: 'BRL'
    }).format(valor);
};

// Função para calcular taxa de abertura
const calcularTaxaAbertura = (cliente: Cliente, regimeTributario: RegimeTributario): number => {
    if (!cliente.abertura_empresa) return 0;

    // Taxa base para abertura de empresa
    let taxa = 500;

    // Ajuste baseado no regime tributário
    if (regimeTributario.codigo === 'SN') {
        taxa = 400; // Simples Nacional - taxa menor
    } else if (regimeTributario.codigo === 'LP') {
        taxa = 600; // Lucro Presumido - taxa maior
    } else if (regimeTributario.codigo === 'LR') {
        taxa = 700; // Lucro Real - taxa maior
    }

    return taxa;
};

export const Passo5FinalizacaoProposta: React.FC<Passo5Props> = ({
    dadosCompletos,
    proposta,
    onVoltar,
    onNovaProposta
}) => {
    const { showSuccess, showError } = useToast();
    const [gerandoPDF, setGerandoPDF] = useState(false);
    const [todosServicos, setTodosServicos] = useState<Servico[]>([]);
    const [loading, setLoading] = useState(true);

    // Carregar todos os serviços
    useEffect(() => {
        const carregarServicos = async () => {
            try {
                setLoading(true);
                const servicosResponse = await apiService.getServicos({ ativo: true, per_page: 1000 });
                const servicos = servicosResponse?.items || [];
                setTodosServicos(servicos);
            } catch (error) {
                console.error('Erro ao carregar serviços:', error);
            } finally {
                setLoading(false);
            }
        };

        carregarServicos();
    }, []);

    // Função para gerar PDF
    const gerarPDFProposta = async () => {
        try {
            setGerandoPDF(true);

            console.log('✅ Iniciando geração de PDF pelo backend...');
            console.log('📋 Proposta:', proposta.numero);
            console.log('👤 Cliente:', dadosCompletos.cliente.nome);
            console.log('💰 Valor total:', formatarMoeda(dadosCompletos.totalFinal));

            // Chamada real para o backend gerar o PDF
            const response = await apiService.gerarPDFProposta(proposta.id);

            console.log('✅ PDF gerado com sucesso:', response);

            // Mostrar sucesso
            showSuccess('PDF Gerado', 'PDF gerado com sucesso! O arquivo foi salvo no servidor.');

            // Opcional: abrir PDF em nova aba
            // window.open(`/api/propostas/${proposta.id}/pdf`, '_blank');

        } catch (error) {
            console.error('❌ Erro ao gerar PDF:', error);
            showError('Erro ao Gerar PDF', 'Erro ao gerar PDF: ' + (error instanceof Error ? error.message : 'Erro desconhecido'));
        } finally {
            setGerandoPDF(false);
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center py-16">
                <div className="flex items-center">
                    <LoadingSpinner size="md" />
                    <span className="ml-3 text-gray-500">Carregando dados...</span>
                </div>
            </div>
        );
    }

    return (
        <div className="max-w-2xl mx-auto p-6 text-center">
            {/* Ícone de sucesso */}
            <div className="mx-auto mb-6 w-16 h-16 bg-green-100 rounded-full flex items-center justify-center">
                <CheckCircle className="w-10 h-10 text-green-600" />
            </div>

            {/* Título */}
            <h1 className="text-3xl font-bold text-gray-900 mb-2">
                Proposta Finalizada com Sucesso!
            </h1>

            {/* Subtítulo */}
            <p className="text-gray-600 mb-8">
                A proposta foi salva e está pronta para ser enviada ao cliente.
            </p>

            {/* Informações da proposta */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-8">
                <div className="space-y-3">
                    <div className="flex justify-between">
                        <span className="text-gray-600">Número da proposta:</span>
                        <span className="font-medium text-gray-900">#{proposta.numero}</span>
                    </div>
                    <div className="flex justify-between">
                        <span className="text-gray-600">Cliente:</span>
                        <span className="font-medium text-gray-900">{dadosCompletos.cliente.nome}</span>
                    </div>
                    <div className="flex justify-between">
                        <span className="text-gray-600">Valor total:</span>
                        <span className="font-bold text-green-600 text-lg">{formatarMoeda(dadosCompletos.totalFinal)}</span>
                    </div>
                    <div className="flex justify-between">
                        <span className="text-gray-600">Status:</span>
                        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                            {proposta.status}
                        </span>
                    </div>
                    {dadosCompletos.requerAprovacao && (
                        <div className="bg-orange-50 border border-orange-200 rounded-lg p-3 mt-4">
                            <div className="flex items-center justify-center space-x-2">
                                <AlertTriangle className="w-4 h-4 text-orange-600" />
                                <span className="text-orange-800 text-sm">
                                    Esta proposta requer aprovação administrativa devido ao desconto aplicado
                                </span>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* Ações */}
            <div className="space-y-4">
                <button
                    onClick={gerarPDFProposta}
                    disabled={gerandoPDF}
                    className="w-full bg-custom-blue text-white py-3 px-6 rounded-lg hover:bg-custom-blue-light disabled:opacity-50 transition-colors flex items-center justify-center space-x-2"
                >
                    {gerandoPDF ? (
                        <>
                            <RefreshCw className="w-5 h-5 animate-spin" />
                            <span>Gerando PDF...</span>
                        </>
                    ) : (
                        <>
                            <FileDown className="w-5 h-5" />
                            <span>Gerar PDF</span>
                        </>
                    )}
                </button>

                <div className="flex space-x-4">
                    <button
                        onClick={onVoltar}
                        className="flex-1 bg-gray-100 text-gray-700 py-3 px-6 rounded-lg hover:bg-gray-200 transition-colors flex items-center justify-center space-x-2"
                    >
                        <ArrowLeft className="w-5 h-5" />
                        <span>Voltar</span>
                    </button>

                    <button
                        onClick={onNovaProposta}
                        className="flex-1 bg-green-600 text-white py-3 px-6 rounded-lg hover:bg-green-700 transition-colors flex items-center justify-center space-x-2"
                    >
                        <FileText className="w-5 h-5" />
                        <span>Nova Proposta</span>
                    </button>
                </div>
            </div>

            {/* Informações adicionais */}
            <div className="mt-8 text-sm text-gray-500">
                <p>O PDF será gerado usando o template profissional da Christino Consultoria Contábil LTDA.</p>
            </div>
        </div>
    );
};
