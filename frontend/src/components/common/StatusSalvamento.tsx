import { CheckCircle, AlertCircle, Loader2 } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import type { EstadoSalvamento } from '../../types';

interface StatusSalvamentoProps {
  estado: EstadoSalvamento;
  onTentarNovamente?: () => void;
  className?: string;
}

export const StatusSalvamento: React.FC<StatusSalvamentoProps> = ({
  estado,
  onTentarNovamente,
  className = ''
}) => {
  if (!estado.propostaSalva && !estado.salvando && !estado.erro) {
    return null;
  }

  return (
    <div className={`flex items-center space-x-2 text-xs ${className}`}>
      {estado.salvando && (
        <div className="flex items-center text-custom-blue">
          <Loader2 className="w-3 h-3 animate-spin mr-1" />
          <span>Salvando proposta...</span>
        </div>
      )}

      {estado.ultimoSalvamento && !estado.salvando && (
        <div className="flex items-center text-green-600">
          <CheckCircle className="w-3 h-3 mr-1" />
          <span>
            Rascunho salvo {formatDistanceToNow(estado.ultimoSalvamento, {
              locale: ptBR,
              addSuffix: true
            })}
          </span>
        </div>
      )}

      {estado.erro && (
        <div
          className={`flex items-center text-orange-600 ${onTentarNovamente ? 'cursor-pointer hover:text-orange-700' : ''}`}
          onClick={onTentarNovamente}
          title={onTentarNovamente ? "Clique para tentar novamente" : undefined}
        >
          <AlertCircle className="w-3 h-3 mr-1" />
          <span>Erro no salvamento {onTentarNovamente && "(clique para repetir)"}</span>
        </div>
      )}
    </div>
  );
};
