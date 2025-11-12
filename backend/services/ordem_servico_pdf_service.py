import os
import base64
from datetime import datetime, date
from typing import Tuple
from jinja2 import Environment, FileSystemLoader, select_autoescape

WEASYPRINT_AVAILABLE = False
WEASYPRINT_IMPORT_ERROR: str | None = None

try:
    import weasyprint
    WEASYPRINT_AVAILABLE = True
except Exception as exc:  # noqa: BLE001 - Precisamos capturar OSError/ImportError
    WEASYPRINT_AVAILABLE = False
    WEASYPRINT_IMPORT_ERROR = (
        "WeasyPrint não está disponível no ambiente atual. "
        "Siga as instruções de instalação em "
        "https://doc.courtbouillon.org/weasyprint/stable/first_steps.html#installation. "
        f"Detalhes: {exc}"
    )

from flask import current_app
from models.ordemServico import OrdemServico
from services.gerarQRCode import MercadoPagoQRCodeError, gerar_qrcode_pix
from pathlib import Path

class OrdemServicoPDFService:
    """Gera PDFs de ordem de serviço com layout moderno."""

    def __init__(self) -> None:
        template_dir = os.path.join(os.path.dirname(__file__), '..', 'templates')
        self._template_dir = os.path.abspath(template_dir)
        self._base_url = os.path.abspath(os.path.join(os.path.dirname(__file__), '..'))

        self.jinja_env = Environment(
            loader=FileSystemLoader(self._template_dir),
            autoescape=select_autoescape(['html', 'xml'])
        )

        # Tenta usar url_for real, se disponível
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

        self._register_filters()

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

    # ------------------------ #
    #     FILTROS JINJA       #
    # ------------------------ #
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
        self.jinja_env.filters['data_br'] = format_date
        self.jinja_env.filters['datetime_br'] = format_datetime

    # ------------------------ #
    #     LOGO DA EMPRESA     #
    # ------------------------ #
    def _find_logo_path(self) -> str | None:
        possible_paths = [
            os.path.join(self._base_url, 'static', 'images', 'logo.png'),
            os.path.join(self._base_url, 'app', 'static', 'images', 'logo.png'),
            os.path.join(self._base_url, 'assets', 'logo.png'),
            os.path.join(os.getcwd(), 'logo.png'),
        ]
        for path in possible_paths:
            if os.path.exists(path):
                return path
        return None

    # ------------------------ #
    #       GERAR PDF         #
    # ------------------------ #
    def gerar_pdf(self, ordem_servico_id: int) -> Tuple[bytes, str]:
        if not WEASYPRINT_AVAILABLE:
            raise RuntimeError(WEASYPRINT_IMPORT_ERROR or (
                'WeasyPrint não está instalado. Execute "pip install weasyprint".'
            ))

        with current_app.app_context():
            ordem = OrdemServico.query.filter_by(id=ordem_servico_id, ativo=True).first()
            if not ordem:
                raise ValueError('Ordem de Serviço não encontrada ou inativa.')

            contexto = self._preparar_contexto(ordem)

        # Usa o novo template moderno
        template = self.jinja_env.get_template('ordem_servico_pdf.html')
        html_content = template.render(**contexto)

        # Carrega CSS moderno externo
        css_path = os.path.join(self._template_dir, "ordem-servico.css")
        if not os.path.exists(css_path):
            raise FileNotFoundError(f"Arquivo CSS não encontrado: {css_path}")

        pdf_bytes = weasyprint.HTML(
            string=html_content,
            base_url=self._base_url
        ).write_pdf(
            stylesheets=[weasyprint.CSS(css_path)]
        )

        filename = f"ordem_servico_{contexto['ordem']['protocolo']}_{datetime.now().strftime('%Y%m%d_%H%M%S')}.pdf"
        return pdf_bytes, filename

    # ------------------------ #
    #     PREPARAR CONTEXTO   #
    # ------------------------ #
    def _preparar_contexto(self, ordem: OrdemServico) -> dict:
        cliente = ordem.cliente
        empresa_cliente = ordem.empresa
        responsavel = ordem.usuario
        descricao = f"Ordem de Serviço {ordem.protocolo}"
        metadata = {
            'ordem_servico_id': ordem.id,
            'protocolo': ordem.protocolo,
        }

        # Se não houver arquivo salvo, gera via Mercado Pago (ou retorna None em caso de erro)
        try:
            pix = gerar_qrcode_pix(
                valor=valor_total,
                descricao=descricao,
                email_pagador=email_cliente,
                nome_pagador=nome_cliente,
                metadata=metadata,
            )
        except MercadoPagoQRCodeError as exc:
            current_app.logger.error(
                "Erro ao gerar QR Code PIX para OS %s: %s",
                ordem.id,
                exc,
            )
            return None
        except Exception as exc:  # noqa: BLE001
            current_app.logger.error(
                "Erro inesperado ao integrar com Mercado Pago na OS %s: %s",
                ordem.id,
                exc,
            )
            return None
        if valor_total <= 0:
            current_app.logger.info(
                "Ordem %s possui valor total %.2f, QR Code PIX não será gerado.",
                ordem.id,
                valor_total,
            )
            return None

        # Prepare paths em uploads/pix
        uploads_root = Path(current_app.config.get('UPLOAD_FOLDER') or os.path.join(os.path.dirname(__file__), '..', 'uploads'))
        pix_dir = uploads_root / 'pix'
        try:
            pix_dir.mkdir(parents=True, exist_ok=True)
        except Exception:
            # se falhar ao criar pasta, apenas loga e prossegue (usará data URI)
            current_app.logger.warning("Não foi possível criar pasta de uploads/pix: %s", pix_dir)

        base_name = f"ordem_{ordem.id}"
        img_path = pix_dir / f"{base_name}_pix.png"
        txt_path = pix_dir / f"{base_name}_pix.txt"

        # Se existir arquivo salvo, reutiliza (imagem + texto)
        if img_path.exists() or txt_path.exists():
            imagem_data_uri = None
            copia_cola = None
            try:
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
                    'descricao': f"Ordem de Serviço {ordem.protocolo}",
                }
            except Exception as exc:
                current_app.logger.exception("Falha ao ler arquivos PIX salvos para OS %s: %s", ordem.id, exc)

        # Caso não exista arquivo salvo, gera via Mercado Pago
        email_cliente = cliente_contexto.get('email') if cliente_contexto else None
        nome_cliente = cliente_contexto.get('nome') if cliente_contexto else None

        descricao = f"Ordem de Serviço {ordem.protocolo}"
        metadata = {
            'ordem_servico_id': ordem.id,
            'protocolo': ordem.protocolo,
        }
        # Se já existe um PIX persistido e não expirou, reutiliza
        try:
            if ordem.pix_copia_cola and ordem.pix_imagem_data_uri and ordem.pix_expiracao:
                try:
                    expiracao = ordem.pix_expiracao
                    now = _dt_mod.datetime.utcnow()
                    # Se expiracao for timezone-aware, normaliza para UTC naive para comparação
                    if hasattr(expiracao, 'tzinfo') and expiracao.tzinfo is not None:
                        try:
                            expiracao = expiracao.astimezone(_dt_mod.timezone.utc).replace(tzinfo=None)
                        except Exception:
                            # se não for possível normalizar, ignore e deixe como está
                            pass
                    if expiracao and expiracao > now:
                        current_app.logger.info(
                            "Reutilizando PIX persistido para OS %s (expira %s).",
                            ordem.id,
                            ordem.pix_expiracao,
                        )
                        return {
                            'imagem_data_uri': ordem.pix_imagem_data_uri,
                            'copia_cola': ordem.pix_copia_cola,
                            'ticket_url': None,
                            'expiracao': ordem.pix_expiracao,
                            'pagamento_id': ordem.pix_payment_id,
                            'valor': valor_total,
                            'descricao': descricao,
                        }
                except Exception:
                    # Se qualquer erro ao validar expiracao, prossegue para gerar novo PIX
                    current_app.logger.warning(
                        "Não foi possível validar expiracao do PIX persistido para OS %s; gerando novo.",
                        ordem.id,
                    )

            # Caso não exista ou tenha expirado, gera novo PIX via Mercado Pago
            pix = gerar_qrcode_pix(
                valor=valor_total,
                descricao=descricao,
                email_pagador=email_cliente,
                nome_pagador=nome_cliente,
                metadata=metadata,
            )

            # Persiste dados retornados no registro da ordem
            try:
                ordem.pix_copia_cola = pix.get('copia_cola')
                ordem.pix_imagem_data_uri = pix.get('imagem_data_uri')
                ordem.pix_payment_id = pix.get('payment_id') or pix.get('pagamento_id')
                ordem.pix_external_reference = pix.get('external_reference')

                # expiração pode vir como string ISO ou datetime
                expiracao_val = pix.get('expiracao')
                parsed_exp = None
                if isinstance(expiracao_val, str):
                    try:
                        val = expiracao_val
                        # aceitar final 'Z'
                        if val.endswith('Z'):
                            val = val[:-1] + '+00:00'
                        parsed_exp = _dt_mod.datetime.fromisoformat(val)
                    except Exception:
                        parsed_exp = None
                elif isinstance(expiracao_val, _dt_mod.datetime):
                    parsed_exp = expiracao_val

                ordem.pix_expiracao = parsed_exp
                ordem.pix_gerado_em = _dt_mod.datetime.utcnow()

                db.session.add(ordem)
                db.session.commit()
            except Exception as exc:
                current_app.logger.exception(
                    "Falha ao persistir dados PIX para OS %s: %s", ordem.id, exc
                )

            return {
                'imagem_data_uri': pix.get('imagem_data_uri'),
                'copia_cola': pix.get('copia_cola'),
                'ticket_url': pix.get('ticket_url'),
                'expiracao': parsed_exp or pix.get('expiracao'),
                'pagamento_id': pix.get('payment_id'),
                'valor': pix.get('valor'),
                'descricao': pix.get('descricao'),
            }
        except MercadoPagoQRCodeError as exc:
            current_app.logger.error(
                "Erro ao gerar QR Code PIX para OS %s: %s",
                ordem.id,
                exc,
            )
            return None
        except Exception as exc:  # noqa: BLE001
            current_app.logger.error(
                "Erro inesperado ao integrar com Mercado Pago na OS %s: %s",
                ordem.id,
                exc,
            )
            return None
        
        imagem = pix.get('imagem_data_uri')
        copia = pix.get('copia_cola')

        # Persistir em disco: imagem PNG e arquivo TXT com copia e cola
        try:
            if imagem:
                # imagem pode ser data URI ou base64 puro
                if imagem.startswith('data:'):
                    _, _, b64data = imagem.partition('base64,')
                    b64data = ''.join(b64data.split())
                    img_bytes = base64.b64decode(b64data)
                else:
                    # assume base64 puro
                    b64data = ''.join(imagem.split())
                    img_bytes = base64.b64decode(b64data)
                try:
                    img_path.write_bytes(img_bytes)
                except Exception:
                    current_app.logger.exception("Falha ao salvar imagem PIX em %s", img_path)

            if copia:
                try:
                    txt_path.write_text(copia, encoding='utf-8')
                except Exception:
                    current_app.logger.exception("Falha ao salvar copia e cola PIX em %s", txt_path)
        except Exception:
            current_app.logger.exception("Erro ao persistir arquivos PIX para OS %s", ordem.id)

        return {
            'imagem_data_uri': imagem,
            'copia_cola': copia,
            'ticket_url': pix.get('ticket_url'),
            'expiracao': pix.get('expiracao'),
            'pagamento_id': pix.get('payment_id'),
            'valor': pix.get('valor'),
            'descricao': pix.get('descricao'),
        }
