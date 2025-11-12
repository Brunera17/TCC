import os
import base64
from datetime import datetime, date
from pathlib import Path
from typing import Optional

from flask import current_app
from jinja2 import Environment, FileSystemLoader, select_autoescape
from config import db
from models.ordemServico import OrdemServico


class OrdemServicoPDFService:
    """Gera PDFs de ordem de serviço com layout moderno e cálculos completos."""

    def __init__(self):
        template_dir = os.path.join(os.path.dirname(__file__), '..', 'templates')
        self._template_dir = os.path.abspath(template_dir)
        self._base_url = os.path.abspath(os.path.join(os.path.dirname(__file__), '..'))

        self.jinja_env = Environment(
            loader=FileSystemLoader(self._template_dir),
            autoescape=select_autoescape(['html', 'xml'])
        )
        self._register_filters()

        # Dados fixos da empresa
        self.empresa_contexto = {
            'nome': 'Christino Consultoria',
            'cnpj': '00.000.000/0001-00',
            'endereco': 'Rua Exemplo, 123 - Cidade - Estado',
            'cep': '00000-000',
            'telefone': '(00) 0000-0000',
            'celular': '(00) 9 0000-0000',
            'email': 'contato@christinoconsultoria.com',
            'site': 'www.christinoconsultoria.com',
            'horario_funcionamento': 'Segunda a sexta, 8h às 17h30',
            'logo_path': self._find_logo_path(),
        }

    # ---------------------- #
    #     FILTROS JINJA     #
    # ---------------------- #
    def _register_filters(self):
        def currency(value):
            try:
                value = float(value or 0)
            except (TypeError, ValueError):
                value = 0
            return f"R$ {value:,.2f}".replace(",", "X").replace(".", ",").replace("X", ".")

        def data_br(value):
            if not value:
                return "-"
            if isinstance(value, (datetime, date)):
                return value.strftime("%d/%m/%Y")
            try:
                return datetime.fromisoformat(str(value)).strftime("%d/%m/%Y")
            except Exception:
                return str(value)

        def datetime_br(value):
            if not value:
                return "-"
            if isinstance(value, datetime):
                return value.strftime("%d/%m/%Y %H:%M")
            try:
                return datetime.fromisoformat(str(value)).strftime("%d/%m/%Y %H:%M")
            except Exception:
                return str(value)

        self.jinja_env.filters.update({
            "currency": currency,
            "data_br": data_br,
            "datetime_br": datetime_br,
        })

    def _find_logo_path(self) -> Optional[str]:
        static_dir = os.path.join(self._base_url, "static")
        for name in ("logo.png", "logo.jpg", "logo.jpeg"):
            candidate = os.path.join(static_dir, name)
            if os.path.exists(candidate):
                return candidate
        return None

    # ------------------------------ #
    #       QR CODE PIX LOCAL        #
    # ------------------------------ #
    def _gerar_pagamento_pix(self, ordem, cliente_contexto, valor_total):
        if valor_total <= 0:
            current_app.logger.info(
                "Ordem %s possui valor total %.2f, QR Code PIX não será buscado.",
                getattr(ordem, 'id', '<sem-id>'), valor_total
            )
            return None

        uploads_root = Path(current_app.config.get('UPLOAD_FOLDER') or
                            os.path.join(os.path.dirname(__file__), '..', 'uploads'))
        pix_dir = uploads_root / 'pix'
        pix_dir.mkdir(parents=True, exist_ok=True)

        base_name = f"ordem_{getattr(ordem, 'id', '0')}"
        img_path = pix_dir / f"{base_name}_pix.png"
        txt_path = pix_dir / f"{base_name}_pix.txt"

        if img_path.exists() or txt_path.exists():
            try:
                imagem_data_uri = None
                copia_cola = None
                if img_path.exists():
                    b64 = base64.b64encode(img_path.read_bytes()).decode('ascii')
                    imagem_data_uri = f"data:image/png;base64,{b64}"
                if txt_path.exists():
                    copia_cola = txt_path.read_text(encoding='utf-8')
                return {
                    "imagem_data_uri": imagem_data_uri,
                    "copia_cola": copia_cola,
                    "valor": valor_total,
                    "descricao": f"Ordem de Serviço {getattr(ordem, 'protocolo', '')}",
                }
            except Exception as e:
                current_app.logger.exception("Falha ao ler QR PIX: %s", e)
        return None

    # ------------------------------ #
    #        GERAÇÃO DO PDF          #
    # ------------------------------ #
    def gerar_pdf(
        self,
        ordem: OrdemServico,
        cliente_contexto: Optional[dict] = None,
        itens: Optional[list] = None,
        valor_total: Optional[float] = None
    ) -> bytes:
        """Gera o PDF completo da ordem de serviço."""

        # --- Cliente ---
        if cliente_contexto is None:
            cliente_contexto = getattr(ordem, "cliente", None)

        # --- Itens ---
        if itens is None:
            itens = getattr(ordem, "itens", None)
            if not itens:
                from models import ItemOrdemServico
                itens = db.session.query(ItemOrdemServico).filter_by(ordem_servico_id=ordem.id).all()

        valor_total = valor_total or getattr(ordem, "valor_total_os", 0)

        # --- Calcula valores dos itens ---
        for item in itens:
            try:
                item.servico_nome = getattr(item.servico, "nome", str(item.servico))
                item.descricao = getattr(item.servico, "descricao", "") or "-"
            except Exception:
                item.servico_nome = str(item.servico)
                item.descricao = "-"

            valor_unit = float(getattr(item, "valor_unitario", 0) or 0)
            qtd = float(getattr(item, "quantidade", 1) or 1)
            desconto = float(getattr(item, "desconto", 0) or 0)

            subtotal = valor_unit * qtd
            desconto_valor = subtotal * (desconto / 100)
            item.valor_total = subtotal - desconto_valor
            item.desconto_valor = desconto_valor

        # --- Totais gerais ---
        subtotal_sem_desconto = sum(item.quantidade * item.valor_unitario for item in itens)
        desconto_total = sum(item.desconto_valor for item in itens)
        total_geral = subtotal_sem_desconto - desconto_total

        totais = {
            "subtotal_sem_desconto": subtotal_sem_desconto,
            "desconto_total": desconto_total,
            "total_geral": total_geral,
        }

        pix_pagamento = self._gerar_pagamento_pix(ordem, cliente_contexto, total_geral)

        # --- Contexto ---
        contexto = {
            "ordem": ordem,
            "cliente": cliente_contexto,
            "itens": itens,
            "valor_total": total_geral,
            "totais": totais,
            "empresa": self.empresa_contexto,
            "pix_pagamento": pix_pagamento,
            "gerado_em": datetime.now(),
        }

        # --- Renderização HTML ---
        template = self.jinja_env.get_template("ordem_servico_pdf.html")
        html = template.render(**contexto)

        try:
            from weasyprint import HTML, CSS
            css_path = os.path.join(self._template_dir, "ordem-servico.css")
            stylesheets = [CSS(filename=css_path)] if os.path.exists(css_path) else []
            return HTML(string=html).write_pdf(stylesheets=stylesheets)
        except Exception as exc:
            current_app.logger.exception("Erro ao gerar PDF da ordem de serviço: %s", exc)
            raise
