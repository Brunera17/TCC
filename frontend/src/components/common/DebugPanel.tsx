import { useState } from 'react';
import { Bug, ChevronDown, ChevronUp, Copy, ExternalLink } from 'lucide-react';
import { debugApiCall, validateToken } from '../../utils/data-validation';

interface DebugPanelProps {
  endpoint?: string;
  data?: any;
  method?: string;
  className?: string;
}

export const DebugPanel: React.FC<DebugPanelProps> = ({
  endpoint = '',
  data = {},
  method = 'POST',
  className = ''
}) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [debugInfo, setDebugInfo] = useState<any>(null);

  const runDebug = () => {
    // Captura informações de debug
    const tokenValidation = validateToken();
    
    const info = {
      timestamp: new Date().toISOString(),
      endpoint,
      method,
      data,
      token: tokenValidation,
      headers: {
        'Content-Type': 'application/json',
        ...(tokenValidation.isValid ? { 'Authorization': `Bearer ${localStorage.getItem('access_token')}` } : {})
      },
      url: {
        development: `http://localhost:5174/api${endpoint}`,
        backend: `http://localhost:5000/api${endpoint}`
      }
    };

    setDebugInfo(info);
    debugApiCall(endpoint, data, method);
    setIsExpanded(true);
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
  };

  const openBackendUrl = () => {
    window.open(`http://localhost:5000/api${endpoint}`, '_blank');
  };

  return (
    <div className={`bg-gray-50 border rounded-lg ${className}`}>
      <div className="p-3 border-b">
        <div className="flex items-center justify-between">
          <div className="flex items-center">
            <Bug className="w-4 h-4 text-gray-500 mr-2" />
            <span className="text-sm font-medium text-gray-700">
              Debug API Call
            </span>
          </div>
          <div className="flex items-center space-x-2">
            <button
              onClick={runDebug}
              className="px-3 py-1 bg-blue-500 text-white text-xs rounded hover:bg-blue-600"
            >
              Debug
            </button>
            <button
              onClick={() => setIsExpanded(!isExpanded)}
              className="p-1 text-gray-500 hover:text-gray-700"
            >
              {isExpanded ? (
                <ChevronUp className="w-4 h-4" />
              ) : (
                <ChevronDown className="w-4 h-4" />
              )}
            </button>
          </div>
        </div>
      </div>

      {isExpanded && debugInfo && (
        <div className="p-3 space-y-3">
          {/* Token Status */}
          <div className="bg-white rounded border p-2">
            <div className="flex items-center justify-between mb-2">
              <h4 className="text-xs font-medium text-gray-700">Token Status</h4>
              <span className={`px-2 py-1 text-xs rounded ${
                debugInfo.token.isValid 
                  ? 'bg-green-100 text-green-800' 
                  : 'bg-red-100 text-red-800'
              }`}>
                {debugInfo.token.isValid ? 'Válido' : 'Inválido'}
              </span>
            </div>
            {!debugInfo.token.isValid && (
              <p className="text-xs text-red-600">{debugInfo.token.error}</p>
            )}
          </div>

          {/* Request Info */}
          <div className="bg-white rounded border p-2">
            <div className="flex items-center justify-between mb-2">
              <h4 className="text-xs font-medium text-gray-700">Request</h4>
              <div className="flex items-center space-x-1">
                <button
                  onClick={openBackendUrl}
                  className="p-1 text-gray-400 hover:text-gray-600"
                  title="Abrir URL do backend"
                >
                  <ExternalLink className="w-3 h-3" />
                </button>
                <button
                  onClick={() => copyToClipboard(JSON.stringify(debugInfo, null, 2))}
                  className="p-1 text-gray-400 hover:text-gray-600"
                  title="Copiar debug info"
                >
                  <Copy className="w-3 h-3" />
                </button>
              </div>
            </div>
            <div className="text-xs space-y-1">
              <div><span className="font-medium">Método:</span> {debugInfo.method}</div>
              <div><span className="font-medium">Endpoint:</span> {debugInfo.endpoint}</div>
              <div><span className="font-medium">URL Dev:</span> {debugInfo.url.development}</div>
              <div><span className="font-medium">URL Backend:</span> {debugInfo.url.backend}</div>
            </div>
          </div>

          {/* Headers */}
          <div className="bg-white rounded border p-2">
            <h4 className="text-xs font-medium text-gray-700 mb-2">Headers</h4>
            <pre className="text-xs text-gray-600 overflow-x-auto">
              {JSON.stringify(debugInfo.headers, null, 2)}
            </pre>
          </div>

          {/* Request Body */}
          <div className="bg-white rounded border p-2">
            <h4 className="text-xs font-medium text-gray-700 mb-2">Request Body</h4>
            <pre className="text-xs text-gray-600 overflow-x-auto max-h-32">
              {JSON.stringify(debugInfo.data, null, 2)}
            </pre>
          </div>

          {/* Instructions */}
          <div className="bg-blue-50 rounded border p-2">
            <h4 className="text-xs font-medium text-blue-800 mb-1">Troubleshooting</h4>
            <ul className="text-xs text-blue-700 space-y-1">
              <li>• Verifique se o backend está rodando em localhost:5000</li>
              <li>• Confirme se o token não expirou</li>
              <li>• Valide os dados antes do envio</li>
              <li>• Verifique os logs do console para mais detalhes</li>
            </ul>
          </div>
        </div>
      )}
    </div>
  );
};