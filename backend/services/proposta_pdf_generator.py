"""
Serviço para geração de PDFs das propostas usando templates Jinja2.
Mantém layout equivalente ao HTML original via WeasyPrint.
"""

import os
import shutil
from datetime import datetime, timedelta
from jinja2 import Environment, FileSystemLoader
from reportlab.lib import colors

try:
    from models.proposta import Proposta, ItemProposta
    from models.cliente import Cliente
    from models.servico import Servico
    MODELS_AVAILABLE = True
except ImportError:
    MODELS_AVAILABLE = False


class PropostaPDFGenerator:
    """Gerador de PDF para propostas utilizando HTML como base."""

    def __init__(self):
        self.upload_dir = os.path.join(os.getcwd(), "uploads", "pdfs")
        os.makedirs(self.upload_dir, exist_ok=True)

        template_dir = os.path.join(os.path.dirname(__file__), "..", "templates")
        self.jinja_env = Environment(loader=FileSystemLoader(template_dir))
        self._setup_flask_functions()

        self.empresa = {
            "nome": "Christino Consultoria Contábil LTDA",
            "cnpj": "49.666.494/0001-37",
            "endereco": "Rua Dr. Ataliba Leonel, 847 - Centro",
            "cidade": "Taquarituba - SP",
            "cep": "18740-019",
            "telefone": "(14) 3762-1991",
            "celular": "(14) 99999-9999",
            "email": "contato@christinoconsultoria.com.br",
            "email_comercial": "comercial@christinoconsultoria.com.br",
            "site": "www.christino.com.br",
            "horario_funcionamento": "Segunda a Sexta: 8h às 17h30m",
            "responsavel_comercial": "Nome do Responsável"
        }

        self.cores = {
            "preto": colors.Color(0.13, 0.13, 0.13),
            "cinza_escuro": colors.Color(0.2, 0.2, 0.2),
            "cinza_medio": colors.Color(0.67, 0.67, 0.67),
            "fundo_header": colors.Color(0.94, 0.93, 0.92),
            "fundo_tabela": colors.Color(0.98, 0.98, 0.98),
            "fundo_total": colors.Color(0.94, 0.94, 0.94),
            "laranja": colors.Color(0.96, 0.48, 0.11),
            "branco": colors.white,
        }

        if not self._find_logo_path():
            print("Logo não encontrada na inicialização - usando fallback")

    def _setup_flask_functions(self):
        try:
            from flask import Flask, url_for

            app = Flask(__name__)
            app.config["SERVER_NAME"] = "localhost:5000"
            self.jinja_env.globals["url_for"] = url_for
        except ImportError:
            def simple_url_for(endpoint, **kwargs):
                if endpoint == "static":
                    filename = kwargs.get("filename", "")
                    return f"/static/{filename}"
                return "#"

            self.jinja_env.globals["url_for"] = simple_url_for

        def format_currency(value):
            if value is None:
                return "R$ 0,00"
            try:
                return f"R$ {value:,.2f}".replace(",", "X").replace(".", ",").replace("X", ".")
            except (ValueError, TypeError):
                return f"R$ {value}"

        self.jinja_env.filters["currency"] = format_currency

    def gerar_pdf_proposta(self, proposta_id: int) -> str:
        if not MODELS_AVAILABLE:
            raise ValueError("Modelos não disponíveis - banco de dados não acessível")

        from flask import current_app

        with current_app.app_context():
            proposta = Proposta.query.filter_by(id=proposta_id, ativo=True).first()
            if not proposta:
                raise ValueError(f"Proposta {proposta_id} não encontrada")

            template_data = self._preparar_dados_template(proposta)
            template = self.jinja_env.get_template("modelo_pdf.html")
            html_content = template.render(**template_data)

            nome_arquivo = f"{proposta.numero_proposta}.pdf"
            caminho_arquivo = os.path.join(self.upload_dir, nome_arquivo)

            self._gerar_pdf_from_html(html_content, caminho_arquivo)
            return caminho_arquivo

    def _preparar_dados_template(self, proposta):
        logo_path = self._find_logo_path()
        itens_mensais = []
        itens_valor_unico = []
        itens_completos = []
        subtotal_mensais = 0.0
        subtotal_valor_unico = 0.0
        subtotal_servicos = 0.0

        try:
            itens_list = list(proposta.itens) if proposta.itens else []
        except Exception as exc:
            print(f"Erro ao acessar itens da proposta: {exc}")
            itens_list = []

        for item in itens_list:
            if not getattr(item, "ativo", True):
                continue

            servico = getattr(item, "servico", None)
            if servico:
                servico_dict = {
                    "nome": servico.nome,
                    "descricao": servico.descricao,
                    "tipo_cobranca": getattr(servico, "tipo_cobranca", "VALOR_UNICO")
                }
            else:
                servico_dict = {
                    "nome": f"Serviço {item.id}",
                    "descricao": "Serviço não especificado",
                    "tipo_cobranca": "VALOR_UNICO"
                }

            valor_unitario = float(getattr(item, "valor_unitario", 0.0) or 0.0)
            quantidade = float(getattr(item, "quantidade", 0) or 0)
            valor_total_sem_desconto = valor_unitario * quantidade
            valor_total_informado = float(getattr(item, "valor_total", valor_total_sem_desconto) or 0.0)

            percentual_desconto = float(getattr(proposta, "porcentagem_desconto", 0) or 0)
            valor_desconto = valor_total_sem_desconto * (percentual_desconto / 100.0)
            valor_total_com_desconto = valor_total_sem_desconto - valor_desconto if percentual_desconto > 0 else valor_total_informado

            subtotal_servicos += valor_total_com_desconto

            item_completo = {
                "id": item.id,
                "nome": servico_dict["nome"],
                "descricao": servico_dict["descricao"],
                "quantidade": int(quantidade),
                "valor_unitario": valor_unitario,
                "valor_desconto": valor_desconto if percentual_desconto > 0 else 0.0,
                "valor_total": valor_total_com_desconto,
                "tipo_cobranca": servico_dict["tipo_cobranca"],
            }

            if servico_dict["tipo_cobranca"] == "MENSAL":
                itens_mensais.append(item_completo)
                subtotal_mensais += valor_total_com_desconto
            else:
                itens_valor_unico.append(item_completo)
                subtotal_valor_unico += valor_total_com_desconto

            itens_completos.append(item_completo)

        valor_total_banco = float(getattr(proposta, "valor_total", 0.0) or 0.0)
        valor_mensalidade = float(getattr(proposta, "valor_mensalidade", 0.0) or 0.0)
        if valor_mensalidade > 0:
            percentual_desconto = float(getattr(proposta, "porcentagem_desconto", 0) or 0)
            desconto_mensalidade = valor_mensalidade * (percentual_desconto / 100.0)
            valor_mensalidade_com_desconto = valor_mensalidade - desconto_mensalidade if percentual_desconto > 0 else valor_mensalidade

            mensalidade_item = {
                "id": "mensalidade",
                "nome": "Mensalidade de Serviços Recorrentes",
                "descricao": "Taxa mensal para manutenção dos serviços contábeis recorrentes",
                "quantidade": 1,
                "valor_unitario": valor_mensalidade,
                "valor_desconto": desconto_mensalidade if percentual_desconto > 0 else 0.0,
                "valor_total": valor_mensalidade_com_desconto,
                "tipo_cobranca": "MENSAL",
            }

            itens_mensais.append(mensalidade_item)
            itens_completos.append(mensalidade_item)
            subtotal_mensais += mensalidade_item["valor_total"]

        cliente_dados = self._preparar_dados_cliente_completos(proposta.cliente)
        proposta_dados = self._preparar_dados_proposta_completos(proposta)
        empresa_dados = self._preparar_dados_empresa_completos()

        contatos = {
            "telefone_principal": empresa_dados["telefone"],
            "telefone_secundario": empresa_dados.get("celular"),
            "email_principal": empresa_dados["email"],
            "email_comercial": empresa_dados.get("email_comercial"),
            "site": empresa_dados["site"],
            "horario_atendimento": empresa_dados["horario_funcionamento"],
        }

        condicoes = {
            "validade_proposta": proposta_dados["data_validade"],
            "prazo_entrega": "15 dias úteis",
            "forma_pagamento_vista": "PIX, Transferência ou Boleto",
            "forma_pagamento_parcelado": "Cartão de Crédito em até 3x",
            "desconto_vista": "10%",
            "termos_gerais": "Serviços executados conforme especificação e prazos acordados.",
        }

        template_data = {
            "data_atual": datetime.now().strftime("%d/%m/%Y"),
            "cliente": cliente_dados,
            "proposta": proposta_dados,
            "empresa": empresa_dados,
            "itens": itens_completos,
            "itens_mensais": itens_mensais,
            "itens_valor_unico": itens_valor_unico,
            "subtotal_mensais": subtotal_mensais,
            "subtotal_valor_unico": subtotal_valor_unico,
            "tem_servicos_mensais": len(itens_mensais) > 0,
            "tem_servicos_valor_unico": len(itens_valor_unico) > 0,
            "subtotal": valor_total_banco,
            "subtotal_servicos": subtotal_servicos,
            "valor_mensalidade": valor_mensalidade,
            "valor_vista": valor_total_banco * 0.9,
            "logo_path": logo_path,
            "contatos": contatos,
            "condicoes": condicoes,
            "dados_tributarios": self._preparar_dados_tributarios(proposta.cliente),
            "observacoes_especiais": self._preparar_observacoes_especiais(proposta),
        }

        self._log_dados_incluidos(template_data)
        return template_data

    def _preparar_dados_cliente_completos(self, cliente):
        if not cliente:
            return {
                "id": None,
                "nome": "Cliente não informado",
                "is_pessoa_juridica": False,
            }

        try:
            entidades = []
            if hasattr(cliente, "entidades_juridicas") and cliente.entidades_juridicas:
                try:
                    entidades = [ej for ej in cliente.entidades_juridicas if getattr(ej, "ativo", True)]
                except TypeError:
                    entidades = []

            if entidades:
                entidade_principal = entidades[0]
                nome_empresa = getattr(entidade_principal, "nome_fantasia", getattr(entidade_principal, "nome", "Empresa"))
                dados = {
                    "id": getattr(cliente, "id", None),
                    "nome": nome_empresa,
                    "cpf": getattr(cliente, "cpf", ""),
                    "email": getattr(cliente, "email", ""),
                    "telefone": getattr(cliente, "telefone", ""),
                    "abertura_empresa": getattr(cliente, "abertura_empresa", False),
                    "ativo": getattr(cliente, "ativo", True),
                    "tipo_cliente": "PJ",
                    "is_pessoa_juridica": True,
                    "entidades_juridicas": entidades,
                    "razao_social": getattr(entidade_principal, "razao_social", ""),
                    "nome_fantasia": getattr(entidade_principal, "nome_fantasia", ""),
                    "cnpj": getattr(entidade_principal, "cnpj", ""),
                    "inscricao_estadual": getattr(entidade_principal, "inscricao_estadual", ""),
                }
            else:
                dados = {
                    "id": getattr(cliente, "id", None),
                    "nome": getattr(cliente, "nome", "Cliente não informado"),
                    "cpf": getattr(cliente, "cpf", ""),
                    "email": getattr(cliente, "email", ""),
                    "telefone": getattr(cliente, "telefone", ""),
                    "abertura_empresa": getattr(cliente, "abertura_empresa", False),
                    "ativo": getattr(cliente, "ativo", True),
                    "tipo_cliente": "PF",
                    "is_pessoa_juridica": False,
                    "entidades_juridicas": [],
                }

            dados.update(self._preparar_dados_endereco(cliente))
            return dados
        except Exception as exc:
            print(f"Erro ao preparar dados do cliente: {exc}")
            return {
                "id": getattr(cliente, "id", None),
                "nome": getattr(cliente, "nome", "Cliente não informado"),
                "is_pessoa_juridica": False,
            }

    def _preparar_dados_endereco(self, cliente):
        dados_endereco = {
            "endereco_completo": "",
            "bairro": "",
            "cidade": "",
            "estado": "",
            "cep": "",
        }

        try:
            if hasattr(cliente, "enderecos") and cliente.enderecos:
                enderecos = list(cliente.enderecos)
                if enderecos:
                    endereco = enderecos[0]
                    dados_endereco.update({
                        "endereco_completo": f"{getattr(endereco, 'logradouro', '')}, {getattr(endereco, 'numero', '')}".strip(", "),
                        "bairro": getattr(endereco, "bairro", ""),
                        "cidade": getattr(endereco, "cidade", ""),
                        "estado": getattr(endereco, "estado", ""),
                        "cep": getattr(endereco, "cep", ""),
                    })
        except Exception:
            pass

        return dados_endereco

    def _preparar_dados_proposta_completos(self, proposta):
        percentual_desconto = float(getattr(proposta, "porcentagem_desconto", 0) or 0)
        created_at = getattr(proposta, "created_at", datetime.utcnow())
        validade = getattr(proposta, "validade", None)
        if not validade:
            validade = created_at + timedelta(days=30)

        return {
            "id": proposta.id,
            "numero": proposta.numero_proposta,
            "data_criacao": created_at.strftime("%d/%m/%Y") if created_at else None,
            "data_validade": validade.strftime("%d/%m/%Y") if validade else None,
            "status": proposta.status,
            "valor_total": float(getattr(proposta, "valor_total", 0.0) or 0.0),
            "valor_mensalidade": float(getattr(proposta, "valor_mensalidade", 0.0) or 0.0),
            "percentual_desconto": percentual_desconto,
            "observacoes": getattr(proposta, "observacao", None),
            "responsavel": getattr(proposta, "usuario", None),
        }

    def _preparar_dados_empresa_completos(self):
        return self.empresa

    def _preparar_dados_tributarios(self, cliente):
        dados = {}
        if not cliente:
            return dados

        try:
            entidades = getattr(cliente, "entidades_juridicas", []) or []
            if entidades:
                entidade = entidades[0]
                regime = getattr(entidade, "regime_tributario", None)
                if regime:
                    dados["regime_tributario"] = getattr(regime, "nome", "")
                faixa = getattr(entidade, "faixa_faturamento", None)
                if faixa:
                    dados["faixa_faturamento"] = getattr(faixa, "descricao", "")
        except Exception:
            pass

        return dados

    def _preparar_observacoes_especiais(self, proposta):
        observacoes = []
        percentual_desconto = float(getattr(proposta, "porcentagem_desconto", 0) or 0)
        valor_total = float(getattr(proposta, "valor_total", 0.0) or 0.0)
        valor_mensalidade = float(getattr(proposta, "valor_mensalidade", 0.0) or 0.0)
        valor_servicos = valor_total - valor_mensalidade if valor_mensalidade > 0 else valor_total
        valor_desconto = valor_servicos * (percentual_desconto / 100.0) if percentual_desconto > 0 else 0.0
        requer_aprovacao = getattr(proposta, "requer_aprovacao", True)

        # Observação personalizada do usuário
        if getattr(proposta, "observacao", None):
            observacoes.append(f"{proposta.observacao}")

        # Novo bloco organizado, sem separadores antigos
        if percentual_desconto > 0:
            observacoes.append(f"Percentual de desconto aplicado: {percentual_desconto:.0f}%")
            observacoes.append(f"Valor do desconto: R$ {valor_desconto:,.2f}".replace(",", "X").replace(".", ",").replace("X", "."))

        observacoes.append(f"Valor dos serviços: R$ {valor_servicos:,.2f}".replace(",", "X").replace(".", ",").replace("X", "."))

        if valor_mensalidade > 0:
            observacoes.append(f"Valor da mensalidade: R$ {valor_mensalidade:,.2f}".replace(",", "X").replace(".", ",").replace("X", "."))

        observacoes.append(f"Valor final da proposta: R$ {valor_total:,.2f}".replace(",", "X").replace(".", ",").replace("X", "."))

        if requer_aprovacao:
            observacoes.append("Proposta requer aprovação administrativa.")

        if valor_mensalidade > 0:
            observacoes.append("Inclui mensalidade automática para serviços recorrentes.")

        if percentual_desconto > 0:
            observacoes.append("Desconto aplicado sobre o valor total dos serviços.")

        return observacoes

    def _log_dados_incluidos(self, template_data):
        try:
            cliente_data = template_data.get("cliente", {})
            cliente_nome = cliente_data.get("nome", "Nome não informado")
            proposta_data = template_data.get("proposta", {})
            proposta_numero = proposta_data.get("numero", "N/A")
            valor_total = float(proposta_data.get("valor_total", 0.0) or 0.0)

            print("Dados incluídos no PDF:")
            print(f"  Cliente: {cliente_nome}")
            print(f"  Proposta: {proposta_numero}")
            print(f"  Valor Total: R$ {valor_total:.2f}")
            print(f"  Itens: {len(template_data.get('itens', []))}")

            self._log_desconto_pdf(proposta_data, template_data.get("itens", []))
        except Exception as exc:
            print(f"Erro ao registrar dados do PDF: {exc}")

    def _log_desconto_pdf(self, proposta_data, itens_data):
        try:
            percentual = float(proposta_data.get("percentual_desconto", 0) or 0)
            print("Desconto no PDF:")
            print(f"  Percentual: {percentual}%")
            print(f"  Tem desconto: {percentual > 0}")

            if percentual > 0 and itens_data:
                subtotal = sum(item.get("valor_total", 0.0) for item in itens_data)
                desconto_total = subtotal * (percentual / 100.0)
                print(f"  Subtotal: R$ {subtotal:.2f}")
                print(f"  Desconto total: R$ {desconto_total:.2f}")
                print(f"  Total final: R$ {subtotal - desconto_total:.2f}")
        except Exception as exc:
            print(f"Erro ao detalhar desconto: {exc}")

    def _gerar_pdf_from_html(self, html_content: str, output_path: str):
        try:
            import weasyprint

            html_doc = weasyprint.HTML(
                string=html_content,
                base_url=os.path.abspath(self.upload_dir),
                encoding="utf-8",
            )
            html_doc.write_pdf(output_path)

            print(f"PDF gerado com sucesso: {output_path}")
        except Exception as exc:
            print(f"Erro ao gerar PDF: {exc}")
            raise

    def _find_logo_path(self):
        possibilidades = [
            "logo.png",
            "logo.jpg",
            "logo.jpeg",
            "logo.gif",
            os.path.join("assets", "logo.png"),
            os.path.join("assets", "logo.jpg"),
            os.path.join("static", "logo.png"),
            os.path.join("static", "logo.jpg"),
            os.path.join("..", "static", "logo.png"),
            os.path.join("..", "static", "logo.jpg"),
        ]

        diretorios = [self.upload_dir, os.path.dirname(__file__)]
        for diretorio in diretorios:
            for possibilidade in possibilidades:
                caminho = os.path.join(diretorio, possibilidade)
                if os.path.exists(caminho):
                    print(f"Logo encontrada: {caminho}")
                    return caminho

        print("Logo não encontrada - usando fallback")
        return None

    def _ensure_logo_accessibility(self):
        logo_path = self._find_logo_path()
        if not logo_path:
            return None

        try:
            destino = os.path.join(self.upload_dir, "logo.png")
            if not os.path.exists(destino):
                shutil.copy2(logo_path, destino)
                print(f"Logo copiada para: {destino}")

            if os.path.exists(destino):
                try:
                    from PIL import Image

                    with Image.open(destino) as img:
                        max_size = 300
                        if img.size[0] > max_size or img.size[1] > max_size:
                            img.thumbnail((max_size, max_size), Image.Resampling.LANCZOS)
                            img.save(destino, "PNG", optimize=True)
                except Exception as exc:
                    print(f"Arquivo de logo inválido: {exc}")
                    return None

                relative_path = os.path.relpath(destino, self.upload_dir)
                return relative_path.replace("\\", "/")

            print("Falha ao tornar logo acessível")
            return None
        except Exception as exc:
            print(f"Erro ao preparar logo: {exc}")
            return logo_path


pdf_generator = PropostaPDFGenerator()
