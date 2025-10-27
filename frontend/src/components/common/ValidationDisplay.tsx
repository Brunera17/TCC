import { AlertTriangle, Info, CheckCircle } from 'lucide-react';
import type { ValidationError } from '../../utils/data-validation';

interface ValidationDisplayProps {
  errors: ValidationError[];
  warnings: ValidationError[];
  className?: string;
}

export const ValidationDisplay: React.FC<ValidationDisplayProps> = ({
  errors,
  warnings,
  className = ''
}) => {
  if (errors.length === 0 && warnings.length === 0) {
    return null;
  }

  return (
    <div className={`space-y-2 ${className}`}>
      {errors.length > 0 && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-3">
          <div className="flex items-center mb-2">
            <AlertTriangle className="w-4 h-4 text-red-500 mr-2" />
            <h4 className="text-sm font-medium text-red-800">
              Erros encontrados ({errors.length})
            </h4>
          </div>
          <ul className="space-y-1">
            {errors.map((error, index) => (
              <li key={index} className="text-sm text-red-700">
                <span className="font-medium">{error.field}:</span> {error.message}
                {error.value !== undefined && (
                  <span className="text-red-600 ml-1">
                    (valor: {JSON.stringify(error.value)})
                  </span>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}

      {warnings.length > 0 && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
          <div className="flex items-center mb-2">
            <Info className="w-4 h-4 text-yellow-500 mr-2" />
            <h4 className="text-sm font-medium text-yellow-800">
              Avisos encontrados ({warnings.length})
            </h4>
          </div>
          <ul className="space-y-1">
            {warnings.map((warning, index) => (
              <li key={index} className="text-sm text-yellow-700">
                <span className="font-medium">{warning.field}:</span> {warning.message}
                {warning.value !== undefined && (
                  <span className="text-yellow-600 ml-1">
                    (valor: {JSON.stringify(warning.value)})
                  </span>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
};

interface ValidationSummaryProps {
  isValid: boolean;
  errorCount: number;
  warningCount: number;
  className?: string;
}

export const ValidationSummary: React.FC<ValidationSummaryProps> = ({
  isValid,
  errorCount,
  warningCount,
  className = ''
}) => {
  if (isValid && warningCount === 0) {
    return (
      <div className={`flex items-center text-green-700 ${className}`}>
        <CheckCircle className="w-4 h-4 mr-2" />
        <span className="text-sm font-medium">Dados válidos</span>
      </div>
    );
  }

  return (
    <div className={`flex items-center ${className}`}>
      {!isValid && (
        <div className="flex items-center text-red-700 mr-4">
          <AlertTriangle className="w-4 h-4 mr-1" />
          <span className="text-sm font-medium">
            {errorCount} erro{errorCount !== 1 ? 's' : ''}
          </span>
        </div>
      )}
      
      {warningCount > 0 && (
        <div className="flex items-center text-yellow-700">
          <Info className="w-4 h-4 mr-1" />
          <span className="text-sm font-medium">
            {warningCount} aviso{warningCount !== 1 ? 's' : ''}
          </span>
        </div>
      )}
    </div>
  );
};