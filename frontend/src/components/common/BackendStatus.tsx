import { useState, useEffect, useCallback } from 'react';
import { AlertTriangle, CheckCircle, Loader2, ExternalLink } from 'lucide-react';
import { checkBackendHealth } from '../../utils/backend-check';

interface BackendStatusProps {
  onStatusChange?: (isRunning: boolean) => void;
}

export const BackendStatus: React.FC<BackendStatusProps> = ({ onStatusChange }) => {
  const [status, setStatus] = useState<{
    isRunning: boolean;
    message: string;
    instructions?: string[];
    isChecking: boolean;
  }>({
    isRunning: false,
    message: '',
    instructions: [],
    isChecking: true,
  });

  const checkStatus = useCallback(async () => {
    setStatus(prev => ({ ...prev, isChecking: true }));
    
    try {
      const health = await checkBackendHealth();
      setStatus({
        ...health,
        isChecking: false,
      });
      
      onStatusChange?.(health.isRunning);
    } catch (error: unknown) {
      console.error('Erro ao verificar backend:', error);
      setStatus({
        isRunning: false,
        message: 'Erro ao verificar status do backend',
        isChecking: false,
      });
      
      onStatusChange?.(false);
    }
  }, [onStatusChange]);

  useEffect(() => {
    checkStatus();
    
    // Recheck every 30 seconds
    const interval = setInterval(checkStatus, 30000);
    
    return () => clearInterval(interval);
  }, [checkStatus]);

  if (status.isChecking) {
    return (
      <div className="fixed top-4 right-4 bg-blue-50 border border-blue-200 rounded-lg p-4 shadow-lg z-50 max-w-md">
        <div className="flex items-center">
          <Loader2 className="w-5 h-5 text-blue-500 animate-spin mr-3" />
          <span className="text-blue-700 text-sm font-medium">
            Verificando conexão com backend...
          </span>
        </div>
      </div>
    );
  }

  if (status.isRunning) {
    return (
      <div className="fixed top-4 right-4 bg-green-50 border border-green-200 rounded-lg p-4 shadow-lg z-50 max-w-md">
        <div className="flex items-center">
          <CheckCircle className="w-5 h-5 text-green-500 mr-3" />
          <span className="text-green-700 text-sm font-medium">
            Backend conectado
          </span>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed top-4 right-4 bg-red-50 border border-red-200 rounded-lg p-4 shadow-lg z-50 max-w-md">
      <div className="flex items-start">
        <AlertTriangle className="w-5 h-5 text-red-500 mr-3 mt-0.5 flex-shrink-0" />
        <div className="flex-1">
          <p className="text-red-700 text-sm font-medium mb-2">
            Backend não disponível
          </p>
          <p className="text-red-600 text-xs mb-3">
            {status.message}
          </p>
          
          {status.instructions && (
            <details className="mb-3">
              <summary className="text-red-700 text-xs font-medium cursor-pointer hover:text-red-800">
                Como resolver (clique para expandir)
              </summary>
              <div className="mt-2 space-y-1">
                {status.instructions.map((instruction, index) => (
                  <p key={index} className="text-red-600 text-xs font-mono">
                    {instruction}
                  </p>
                ))}
              </div>
            </details>
          )}
          
          <div className="flex items-center space-x-2">
            <button
              onClick={checkStatus}
              className="text-red-700 text-xs font-medium hover:text-red-800 underline"
            >
              Tentar novamente
            </button>
            <a
              href="http://localhost:5000"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center text-red-700 text-xs font-medium hover:text-red-800 underline"
            >
              Testar diretamente
              <ExternalLink className="w-3 h-3 ml-1" />
            </a>
          </div>
        </div>
      </div>
    </div>
  );
};