import { useState } from 'react';
import { Eye, X, Download, RotateCcw } from 'lucide-react';
import { Modal } from '../components/modals/Modal';
import { LoadingSpinner } from '../components/common/LoadingSpinner';
import { apiService } from '../lib/api';

interface PropostaPDFViewerProps {
  propostaId: number;
  isOpen: boolean;
  onClose: () => void;
  pdfUrl?: string;
}

export const PropostaPDFViewer: React.FC<PropostaPDFViewerProps> = ({
  propostaId,
  isOpen,
  onClose,
  pdfUrl
}) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pdfBlob, setPdfBlob] = useState<Blob | null>(null);

  const handleVisualizarPDF = async () => {
    setLoading(true);
    setError(null);

    try {
      const blob = await apiService.visualizarPDFProposta(propostaId);
      setPdfBlob(blob);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao carregar PDF');
    } finally {
      setLoading(false);
    }
  };

  const handleDownloadPDF = () => {
    if (pdfBlob) {
      const url = URL.createObjectURL(pdfBlob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `proposta_${propostaId}.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }
  };

  const handleClose = () => {
    setPdfBlob(null);
    setError(null);
    onClose();
  };

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title="Visualizar PDF da Proposta">
      <div className="p-6">
        {loading && (
          <div className="flex items-center justify-center py-8">
            <LoadingSpinner size="lg" />
            <span className="ml-3 text-gray-600">Carregando PDF...</span>
          </div>
        )}

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4">
            <p className="text-red-700">{error}</p>
          </div>
        )}

        {!loading && !error && !pdfBlob && (
          <div className="text-center py-8">
            <p className="text-gray-600 mb-4">Clique no botão abaixo para visualizar o PDF</p>
            <button
              onClick={handleVisualizarPDF}
              className="bg-custom-blue text-white px-6 py-2 rounded-lg hover:bg-custom-blue-light transition-colors"
            >
              Visualizar PDF
            </button>
          </div>
        )}

        {pdfBlob && (
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-semibold">PDF da Proposta</h3>
              <button
                onClick={handleDownloadPDF}
                className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors"
              >
                Download
              </button>
            </div>

            <div className="border border-gray-300 rounded-lg overflow-hidden">
              <iframe
                src={URL.createObjectURL(pdfBlob)}
                className="w-full h-96"
                title="PDF Viewer"
              />
            </div>
          </div>
        )}

        <div className="flex justify-end mt-6 space-x-3">
          <button
            onClick={handleClose}
            className="px-4 py-2 text-gray-600 hover:text-gray-800 transition-colors"
          >
            Fechar
          </button>
        </div>
      </div>
    </Modal>
  );
};
