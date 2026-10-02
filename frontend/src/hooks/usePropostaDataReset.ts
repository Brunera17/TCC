import { useCallback } from 'react';

/**
 * Hook personalizado para gerenciar o reset automático de dados de propostas
 * Limpa dados salvos quando o usuário sai do contexto de criação de propostas
 */
export const usePropostaDataReset = () => {
    // Chaves de dados salvos nos passos
    const PROPOSTA_KEYS = [
        'proposta_passo1_backup',
        'proposta_passo2_backup',
        'proposta_passo3_backup',
        'proposta_passo4_backup',
        'proposta_passo5_backup',
        'proposta_completa_backup',
        'proposta_cliente_selecionado',
        'proposta_configuracoes_tributarias',
        'proposta_servicos_selecionados',
        'proposta_dados_finais'
    ];

    /**
     * Limpa todos os dados de propostas salvos no localStorage
     */
    const limparTodosDadosProposta = useCallback(() => {

        let dadosRemovidos = 0;

        PROPOSTA_KEYS.forEach(key => {
            const dadosExistentes = localStorage.getItem(key);
            if (dadosExistentes) {
                localStorage.removeItem(key);
                dadosRemovidos++;
            }
        });

        // Limpa também dados relacionados que podem ter sido criados
        const todasChaves = Object.keys(localStorage);
        const chavesProposta = todasChaves.filter(chave =>
            chave.includes('proposta_') ||
            chave.includes('cliente_') ||
            chave.includes('servico_') ||
            chave.includes('tributario_')
        );

        chavesProposta.forEach(chave => {
            if (!PROPOSTA_KEYS.includes(chave)) {
                localStorage.removeItem(chave);
                dadosRemovidos++;
            }
        });

        return dadosRemovidos;
    }, []);

    /**
     * Limpa dados específicos de um passo
     */
    const limparDadosPasso = useCallback((passo: number) => {
        const chavePasso = `proposta_passo${passo}_backup`;
        const dadosExistentes = localStorage.getItem(chavePasso);

        if (dadosExistentes) {
            localStorage.removeItem(chavePasso);
            return true;
        }

        return false;
    }, []);

    /**
     * Verifica se existem dados salvos de propostas
     */
    const verificarDadosExistentes = useCallback(() => {
        const dadosExistentes = PROPOSTA_KEYS.some(key => localStorage.getItem(key));
        return dadosExistentes;
    }, []);

    /**
     * Obtém informações sobre dados salvos (para debugging)
     */
    const obterInfoDadosSalvos = useCallback(() => {
        const info = PROPOSTA_KEYS.map(key => {
            const dados = localStorage.getItem(key);
            return {
                chave: key,
                existe: !!dados,
                tamanho: dados ? dados.length : 0,
                timestamp: dados ? new Date().toISOString() : null
            };
        });

        return info;
    }, []);

    return {
        limparTodosDadosProposta,
        limparDadosPasso,
        verificarDadosExistentes,
        obterInfoDadosSalvos,
        PROPOSTA_KEYS
    };
};

export default usePropostaDataReset;
