import { useState, useCallback } from 'react';

export interface ApiState<T> {
    data: T | null;
    loading: boolean;
    error: string | null;
}

export interface UseApiReturn<T> extends ApiState<T> {
    execute: (...args: any[]) => Promise<T | null>;
    reset: () => void;
    setData: (data: T) => void;
}

export function useApi<T = any>(
    apiFunction: (...args: any[]) => Promise<T>,
    initialData: T | null = null
): UseApiReturn<T> {
    const [state, setState] = useState<ApiState<T>>({
        data: initialData,
        loading: false,
        error: null
    });

    const execute = useCallback(async (...args: any[]) => {
        setState(prev => ({ ...prev, loading: true, error: null }));

        try {
            const result = await apiFunction(...args);
            setState(prev => ({ ...prev, data: result, loading: false }));
            return result;
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
            setState(prev => ({ ...prev, error: errorMessage, loading: false }));
            return null;
        }
    }, [apiFunction]);

    const reset = useCallback(() => {
        setState({
            data: initialData,
            loading: false,
            error: null
        });
    }, [initialData]);

    const setData = useCallback((data: T) => {
        setState(prev => ({ ...prev, data }));
    }, []);

    return {
        ...state,
        execute,
        reset,
        setData
    };
}
