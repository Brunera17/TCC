import os
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
from config import db
import datetime as _dt_mod


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
        departamento = ordem.departamento

        itens = []
        subtotal = 0.0
        subtotal_sem_desconto = 0.0

        for item in ordem.itens:
            if not item.ativo:
                continue

            valor_total = float(item.valor_total or 0)
            valor_unitario = float(item.valor_unitario or 0)
            quantidade = item.quantidade or 0
            subtotal += valor_total
            subtotal_sem_desconto += valor_unitario * quantidade

            itens.append({
                'servico': item.servico.nome if item.servico else 'Serviço não informado',
                'descricao': item.servico.descricao if item.servico and item.servico.descricao else None,
                'quantidade': quantidade,
                'valor_unitario': valor_unitario,
                'desconto_percentual': item.desconto or 0,
                'valor_total': valor_total,
            })

        desconto_total = max(subtotal_sem_desconto - subtotal, 0.0)
        status_map = {
            'aberta': 'Aberta',
            'em_andamento': 'Em andamento',
            'pausada': 'Pausada',
            'concluida': 'Concluída',
            'cancelada': 'Cancelada',
        }

        ordem_contexto = {
            'id': ordem.id,
            'protocolo': ordem.protocolo,
            'status': ordem.status,
            'status_label': status_map.get(ordem.status, ordem.status.title()),
            'data_abertura': ordem.data_abertura,
            'vencimento': ordem.vencimento,
            'data_fechamento': ordem.data_fechamento,
            'observacao': ordem.observacao,
            'valor_total': subtotal,
            'departamento': departamento.nome if departamento else None,
        }

        responsavel_contexto = None
        if responsavel:
            cargo_nome = responsavel.cargo.nome if responsavel.cargo else None
            responsavel_contexto = {
                'nome': responsavel.nome,
                'email': responsavel.email,
                'cargo': cargo_nome,
            }

        cliente_contexto = None
        if cliente:
            cliente_contexto = {
                'nome': cliente.nome,
                'cpf': cliente.formatar_cpf() if hasattr(cliente, 'formatar_cpf') else cliente.cpf,
                'email': cliente.email,
                'telefone': cliente.telefone,
                'endereco': cliente.endereco,
            }

        empresa_cliente_contexto = None
        if empresa_cliente:
            empresa_cliente_contexto = {
                'razao_social': empresa_cliente.razao_social,
                'nome_fantasia': empresa_cliente.nome_fantasia,
                'cnpj': empresa_cliente.cnpj,
                'contato': empresa_cliente.contato,
                'status': empresa_cliente.status,
                'inscricao_estadual': empresa_cliente.inscricao_estadual,
            }

        pix_pagamento = self._gerar_pagamento_pix(ordem, cliente_contexto, subtotal)

        return {
            'gerado_em': datetime.now(),
            'empresa': self.empresa_contexto,
            'ordem': ordem_contexto,
            'responsavel': responsavel_contexto,
            'cliente': cliente_contexto,
            'empresa_cliente': empresa_cliente_contexto,
            'itens': itens,
            'totais': {
                'subtotal_sem_desconto': subtotal_sem_desconto,
                'desconto_total': desconto_total,
                'total_geral': subtotal,
            },
            'pix_pagamento': pix_pagamento,
        }

    # ------------------------ #
    #        PAGAMENTO PIX     #
    # ------------------------ #
    def _gerar_pagamento_pix(
        self,
        ordem: OrdemServico,
        cliente_contexto: dict | None,
        valor_total: float,
    ) -> dict | None:
        if valor_total <= 0:
            current_app.logger.info(
                "Ordem %s possui valor total %.2f, QR Code PIX não será gerado.",
                ordem.id,
                valor_total,
            )
            return None

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
