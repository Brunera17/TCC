import os
import base64
from datetime import datetime, date
from pathlib import Path
from typing import Optional

from flask import current_app
from jinja2 import Environment, FileSystemLoader, select_autoescape

from models.ordemServico import OrdemServico
from services.gerarQRCode import MercadoPagoQRCodeError, gerar_qrcode_pix


class OrdemServicoPDFService:
    """Gera PDFs de ordem de serviço com layout moderno."""

    def __init__(self) -> None:
        template_dir = os.path.join(os.path.dirname(__file__), '..', 'templates')
        self._template_dir = os.path.abspath(template_dir)
        self._base_url = os.path.abspath(os.path.join(os.path.dirname(__file__), '..'))

        # Configuração do ambiente Jinja2
        self.jinja_env = Environment(
            loader=FileSystemLoader(self._template_dir),
            autoescape=select_autoescape(['html', 'xml'])
        )

        # Registrar função url_for, se disponível
        try:
            from flask import url_for  # type: ignore
            self.jinja_env.globals['url_for'] = url_for
        except Exception:
            def _simple_url_for(endpoint, **kwargs):
                if endpoint == 'static':
                    filename = kwargs.get('filename', '')
                    return os.path.join(self._base_url, 'static', filename).replace('\\', '/')
                return '#'
            self.jinja_env.globals['url_for'] = _simple_url_for

        # Registrar filtros personalizados
        self._register_filters()

        # Informações da empresa (pode vir do config futuramente)
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

    # -------------------------------------------------
    # FILTROS JINJA
    # -------------------------------------------------
    def _register_filters(self) -> None:
        def currency(value) -> str:
            try:
                numeric_value = float(value or 0)
            except (TypeError, ValueError):
                numeric_value = 0.0
            return f"R$ {numeric_value:,.2f}".replace(',', 'X').replace('.', ',').replace('X', '.')

        def format_date(value) -> str:
            if not value:
                return '-'
            if isinstance(value, (datetime, date)):
                return value.strftime('%d/%m/%Y')
            try:
                parsed = datetime.fromisoformat(str(value))
                return parsed.strftime('%d/%m/%Y')
            except ValueError:
                return str(value)

        def format_datetime(value) -> str:
            if not value:
                return '-'
            if isinstance(value, datetime):
                return value.strftime('%d/%m/%Y %H:%M')
            try:
                parsed = datetime.fromisoformat(str(value))
                return parsed.strftime('%d/%m/%Y %H:%M')
            except ValueError:
                return str(value)

        self.jinja_env.filters['currency'] = currency
        self.jinja_env.filters['format_date'] = format_date
        self.jinja_env.filters['format_datetime'] = format_datetime

    def _find_logo_path(self) -> Optional[str]:
        """Procura o logo da empresa no diretório 'static'."""
        static_dir = os.path.join(self._base_url, 'static')
        for name in ('logo.png', 'logo.jpg', 'logo.jpeg'):
            candidate = os.path.join(static_dir, name)
            if os.path.exists(candidate):
                return candidate
        return None

    # -------------------------------------------------
    # GERAÇÃO DO PAGAMENTO PIX
    # -------------------------------------------------
    def _gerar_pagamento_pix(
        self,
        ordem: OrdemServico,
        cliente_contexto: Optional[dict],
        valor_total: float,
    ) -> Optional[dict]:
        """Gera ou reutiliza um QR Code PIX para a ordem usando arquivos em uploads/pix."""

        if valor_total <= 0:
            current_app.logger.info(
                "Ordem %s possui valor total %.2f, QR Code PIX não será gerado.",
                getattr(ordem, 'id', '<sem-id>'),
                valor_total,
            )
            return None

        uploads_root = Path(current_app.config.get('UPLOAD_FOLDER') or
                            os.path.join(os.path.dirname(__file__), '..', 'uploads'))
        pix_dir = uploads_root / 'pix'
        try:
            pix_dir.mkdir(parents=True, exist_ok=True)
        except Exception:
            current_app.logger.warning("Não foi possível criar pasta de uploads/pix: %s", pix_dir)

        base_name = f"ordem_{getattr(ordem, 'id', '0')}"
        img_path = pix_dir / f"{base_name}_pix.png"
        txt_path = pix_dir / f"{base_name}_pix.txt"

        # Se já existe, reutiliza
        if img_path.exists() or txt_path.exists():
            try:
                imagem_data_uri = None
                copia_cola = None
                if img_path.exists():
                    data = img_path.read_bytes()
                    b64 = base64.b64encode(data).decode('ascii')
                    imagem_data_uri = f"data:image/png;base64,{b64}"
                if txt_path.exists():
                    copia_cola = txt_path.read_text(encoding='utf-8')
                return {
                    'imagem_data_uri': imagem_data_uri,
                    'copia_cola': copia_cola,
                    'valor': valor_total,
                    'descricao': f"Ordem de Serviço {getattr(ordem, 'protocolo', '')}",
                }
            except Exception as exc:
                current_app.logger.exception(
                    "Falha ao ler arquivos PIX salvos para OS %s: %s",
                    getattr(ordem, 'id', '<id>'),
                    exc
                )

        # Gerar via Mercado Pago
        email_cliente = cliente_contexto.get('email') if cliente_contexto else None
        nome_cliente = cliente_contexto.get('nome') if cliente_contexto else None
        descricao = f"Ordem de Serviço {getattr(ordem, 'protocolo', '')}"
        metadata = {
            'ordem_servico_id': getattr(ordem, 'id', None),
            'protocolo': getattr(ordem, 'protocolo', None),
        }

        try:
            pix = gerar_qrcode_pix(
                valor=valor_total,
                descricao=descricao,
                email_pagador=email_cliente,
                nome_pagador=nome_cliente,
                metadata=metadata,
            )
        except MercadoPagoQRCodeError as exc:
            current_app.logger.error("Erro ao gerar QR Code PIX para OS %s: %s", getattr(ordem, 'id', '<id>'), exc)
            return None
        except Exception as exc:
            current_app.logger.error("Erro inesperado ao integrar com Mercado Pago na OS %s: %s", getattr(ordem, 'id', '<id>'), exc)
            return None

        # Persistir arquivos locais
        imagem = pix.get('imagem_data_uri')
        copia = pix.get('copia_cola')
        try:
            if imagem:
                if imagem.startswith('data:'):
                    _, _, b64data = imagem.partition('base64,')
                    b64data = ''.join(b64data.split())
                    img_bytes = base64.b64decode(b64data)
                else:
                    img_bytes = base64.b64decode(imagem)
                img_path.write_bytes(img_bytes)
            if copia:
                txt_path.write_text(copia, encoding='utf-8')
        except Exception:
            current_app.logger.exception("Erro ao persistir arquivos PIX para OS %s", getattr(ordem, 'id', '<id>'))

        return {
            'imagem_data_uri': imagem,
            'copia_cola': copia,
            'ticket_url': pix.get('ticket_url'),
            'expiracao': pix.get('expiracao'),
            'pagamento_id': pix.get('payment_id'),
            'valor': pix.get('valor'),
            'descricao': pix.get('descricao'),
        }
