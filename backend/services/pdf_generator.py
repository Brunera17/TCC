from datetime import datetime
from pathlib import Path
from typing import Dict, List, Optional

from repositories.ordemServico_repository import OrdemServicoRepository
from services.ordem_servico_pdf_service import OrdemServicoPDFService


class OrdemServicoPDFGenerator:
    """Gera e gerencia arquivos PDF de Ordens de Serviço."""

    def __init__(
        self,
        pdf_service: Optional[OrdemServicoPDFService] = None,
        ordem_servico_repo: Optional[OrdemServicoRepository] = None,
    ) -> None:
        self.pdf_service = pdf_service if pdf_service is not None else OrdemServicoPDFService()
        self.ordem_servico_repo = ordem_servico_repo if ordem_servico_repo is not None else OrdemServicoRepository()
        self.output_dir = Path.cwd() / "uploads" / "pdfs"
        self.output_dir.mkdir(parents=True, exist_ok=True)

    def gerar_pdf(self, ordem_servico_id: int) -> str:
        """Gera o PDF da ordem de serviço e persiste o arquivo em disco."""
        ordem = self.ordem_servico_repo.get_by_id(ordem_servico_id)
        if not ordem:
            raise ValueError(f"Ordem de Serviço {ordem_servico_id} não encontrada")

        pdf_bytes = self.pdf_service.gerar_pdf(ordem)
        filename = f"ordem_servico_{ordem_servico_id}.pdf"
        destino = self.output_dir / filename
        destino.write_bytes(pdf_bytes)
        return str(destino)

    def listar_pdfs(self) -> List[Dict[str, str]]:
        """Retorna metadados dos PDFs de Ordens de Serviço disponíveis."""
        arquivos: List[Dict[str, str]] = []
        for arquivo in sorted(self.output_dir.glob("*.pdf")):
            stat = arquivo.stat()
            arquivos.append(
                {
                    "nome": arquivo.name,
                    "caminho": str(arquivo),
                    "tamanho": str(stat.st_size),
                    "data_criacao": datetime.fromtimestamp(stat.st_ctime).strftime("%d/%m/%Y %H:%M:%S"),
                }
            )
        return arquivos

    def remover_pdf(self, nome_arquivo: str) -> bool:
        """Remove o PDF especificado caso exista."""
        arquivo = self.output_dir / nome_arquivo
        if arquivo.exists():
            arquivo.unlink()
            return True
        return False


__all__ = ["OrdemServicoPDFGenerator"]