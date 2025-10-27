import os
import json
import shutil
from datetime import datetime
from jinja2 import Environment, FileSystemLoader
from reportlab.lib import colors

try:
    import weasyprint
    WEASYPRINT_AVAILABLE = True
except ImportError:
    WEASYPRINT_AVAILABLE = False
    print("WeasyPrint não encontrado. Instale com: pip install weasyprint")
    print("WeasyPrint não encontrado. Instale com: pip install weasyprint")

try: 
    from config import db
    from models.proposta import Proposta
    from models.cliente import Cliente
    from models.entidadeJuridica import EntidadeJuridica
    from models.servico import Servico
    from models import ServicoProposta
    MODELS_AVAILABLE = True
except ImportError:
    MODELS_AVAILABLE = False
    print("Modelos não disponíveis - executando em modo standalone")

class PropostaPDF:
    def __init__(self):
        self.upload_dir = os.path.join(os.getcwd(), 'uploads', 'pdfs')
        os.makedirs(self.upload_dir, exist_ok=True)
        
        # Template directory setup
        template_dir = os.path.join(os.path.dirname(__file__), '..', 'app', 'templates')
        if not os.path.exists(template_dir):
            template_dir = os.path.join(os.path.dirname(__file__), '..', 'templates')
        
        self.jinja_env = Environment(loader=FileSystemLoader(template_dir))
        
        self._setup_flask_functions()
        
        self.empresa = {
            'nome': 'Christino Consultoria',
            'cnpj': '00.000.000/0001-00',
            'endereco': 'Rua Exemplo, 123 - Cidade - Estado',
            'cep': '00000-000',
            'telefone': '(00) 0000-0000',
            'celular': '(00) 9 0000-0000',
            'email': 'contato@christinoconsultoria.com',
            'site': 'www.christinoconsultoria.com',
            'horario_funcionamento': 'Segunda a sexta, 8h às 17h30m'
        }
        
        self.cores = {
            'preto': colors.Color(0.13, 0.13, 0.13),
            'cinza_escuro': colors.Color(0.2, 0.2, 0.2),  # #333
            'cinza_medio': colors.Color(0.67, 0.67, 0.67),  # #aaa
            'fundo_header': colors.Color(0.94, 0.93, 0.92),  # #f0eeea
            'fundo_tabela': colors.Color(0.98, 0.98, 0.98),  # #fbfbfa
            'fundo_total': colors.Color(0.94, 0.94, 0.94),  # #efefef
            'laranja': colors.Color(0.96, 0.48, 0.11),  # #f47a1c
            'branco': colors.white
        }
        
        # Setup logo path
        self.empresa['logo_path'] = self._find_logo_path()
            
    def _setup_flask_functions(self):
        """Configura funções do Flask para o ambiente Jinja2"""
        try:
            from flask import Flask, url_for
            
            app = Flask(__name__)
            app.config['SERVER_NAME'] = 'localhost:5000'
            
            self.jinja_env.globals['url_for'] = url_for
            
        except ImportError:
            def url_for(endpoint, **values):
                if endpoint == 'static':
                    filename = values.get('filename', '')
                    return f'/static/{filename}'
                return '#'
            
            self.jinja_env.globals['url_for'] = url_for
            
        def format_currency(value):
            """Formata valores monetários para o padrão brasileiro"""
            if value is None:
                return "R$ 0,00"
            try:
                return f"R$ {value:,.2f}".replace(',', 'X').replace('.', ',').replace('X', '.')
            except (ValueError, TypeError):
                return "R$ 0,00"
        
        self.jinja_env.filters['currency'] = format_currency
        
    def _find_logo_path(self):
        """Busca o caminho do logo da empresa"""
        possible_paths = [
            os.path.join(os.path.dirname(__file__), '..', 'static', 'images', 'logo.png'),
            os.path.join(os.path.dirname(__file__), '..', 'app', 'static', 'images', 'logo.png'),
            os.path.join(os.path.dirname(__file__), '..', 'assets', 'logo.png'),
            os.path.join(os.getcwd(), 'logo.png'),
        ]
        
        for path in possible_paths:
            if os.path.exists(path):
                return path
                
        return None
        
    def gerar_pdf_proposta(self, proposta_id: int) -> str:
        """Gera PDF de uma proposta específica"""
        
        if not WEASYPRINT_AVAILABLE:
            raise ImportError("WeasyPrint não está disponível. Instale com: pip install weasyprint")
            
        try:
            if not MODELS_AVAILABLE:
                # Modo de teste - usar dados mockados
                return self._gerar_pdf_mock(proposta_id)
            
            from flask import current_app
            
            with current_app.app_context():
                proposta = Proposta.query.filter_by(id=proposta_id, ativo=True).first()
                if not proposta:
                    raise ValueError(f"Proposta com ID {proposta_id} não encontrada")
                
                template_data = self._preparar_dados_proposta(proposta)
                
                template = self.jinja_env.get_template('modelo_pdf.html')
                html_content = template.render(**template_data)
                
                nome_arquivo = f"proposta_{proposta.numero}_{datetime.now().strftime('%Y%m%d_%H%M%S')}.pdf"
                caminho_arquivo = os.path.join(self.upload_dir, nome_arquivo)
                
                self._gerar_pdf_weasyprint(html_content, caminho_arquivo)
                
                return caminho_arquivo
                
        except Exception as e:
            print(f"Erro ao gerar PDF: {e}")
            import traceback
            traceback.print_exc()
            raise e
            
    def _gerar_pdf_mock(self, proposta_id: int) -> str:
        """Gera PDF usando dados mockados para teste"""
        template_data = self._criar_dados_mock(proposta_id)
        
        template = self.jinja_env.get_template('modelo_pdf.html')
        html_content = template.render(**template_data)
        
        nome_arquivo = f"proposta_mock_{proposta_id}_{datetime.now().strftime('%Y%m%d_%H%M%S')}.pdf"
        caminho_arquivo = os.path.join(self.upload_dir, nome_arquivo)
        
        self._gerar_pdf_weasyprint(html_content, caminho_arquivo)
        
        return caminho_arquivo
        
    def _criar_dados_mock(self, proposta_id: int) -> dict:
        """Cria dados mockados para teste"""
        return {
            'data_atual': datetime.now().strftime('%d/%m/%Y'),
            'cliente': {
                'nome': 'Cliente Teste Ltda',
                'razao_social': 'Cliente Teste Ltda',
                'cnpj': '12.345.678/0001-99',
                'is_pessoa_juridica': True,
            },
            'proposta': {
                'numero': f'PROP-{proposta_id:04d}',
                'valor_total': 2500.00,
                'valor_mensalidade': 500.00,
                'percentual_desconto': 0,
            },
            'itens': [
                {
                    'servico': {
                        'nome': 'Consultoria Contábil',
                        'descricao': 'Serviços de consultoria contábil\\nAnálise de documentos\\nOrientação fiscal'
                    },
                    'quantidade': 1,
                    'valor_unitario': 2000.00,
                    'valor_total': 2000.00,
                    'valor_desconto': 0,
                }
            ],
            'subtotal': 2500.00,
            'condicoes': {
                'forma_pagamento_parcelado': '3x sem juros',
                'prazo_entrega': '15 dias úteis',
                'termos_gerais': 'Proposta válida por 30 dias. Serviços sujeitos às condições comerciais acordadas.'
            },
            'dados_tributarios': None,
            'observacoes_especiais': [
                'Valores sujeitos a reajuste após o período de validade',
                'Documentação completa necessária para início dos trabalhos'
            ],
            'logo_path': self.empresa['logo_path']
        }
            
    def _preparar_dados_proposta(self, proposta: 'Proposta') -> dict:
        """Prepara dados da proposta para o template"""
        logo_path = self._find_logo_path()
        
        itens_com_servicos = []
        subtotal_servicos = 0.0
        
        for item in proposta.itens:
            if not item.ativo:
                continue
                
            servico = Servico.query.filter_by(id=item.servico_id, ativo=True).first() if MODELS_AVAILABLE else None
            
            valor_unitario = float(item.valor_unitario)
            valor_total_item = float(item.valor_total)
            valor_desconto = 0.0
            
            # Calcular desconto se houver
            if proposta.percentual_desconto and proposta.percentual_desconto > 0:
                valor_desconto = valor_unitario * (proposta.percentual_desconto / 100)
            
            subtotal_servicos += valor_total_item
            
            item_data = {
                'servico': servico or {'nome': f'Serviço {item.servico_id}', 'descricao': None},
                'quantidade': item.quantidade,
                'valor_unitario': valor_unitario,
                'valor_total': valor_total_item,
                'valor_desconto': valor_desconto,
            }
            itens_com_servicos.append(item_data)
            
        # Dados do cliente
        cliente_data = {
            'nome': proposta.cliente.nome,
            'is_pessoa_juridica': False
        }
        
        if hasattr(proposta.cliente, 'cpf') and proposta.cliente.cpf:
            cliente_data['cpf'] = proposta.cliente.cpf
            
        # Verificar se é pessoa jurídica
        if MODELS_AVAILABLE and hasattr(proposta.cliente, 'entidade_juridica') and proposta.cliente.entidade_juridica:
            ej = proposta.cliente.entidade_juridica
            cliente_data.update({
                'is_pessoa_juridica': True,
                'razao_social': ej.razao_social,
                'nome_fantasia': ej.nome_fantasia,
                'cnpj': ej.cnpj
            })
        
        # Dados tributários (se disponível)
        dados_tributarios = None
        if MODELS_AVAILABLE and hasattr(proposta, 'dados_tributarios'):
            dados_tributarios = {
                'regime_tributario': getattr(proposta.dados_tributarios, 'regime_tributario', None),
                'faixa_faturamento': getattr(proposta.dados_tributarios, 'faixa_faturamento', None)
            }
        
        return {
            'data_atual': datetime.now().strftime('%d/%m/%Y'),
            'cliente': cliente_data,
            'proposta': proposta,
            'itens': itens_com_servicos,
            'subtotal': subtotal_servicos + (proposta.valor_mensalidade or 0),
            'condicoes': {
                'forma_pagamento_parcelado': '3x sem juros',
                'prazo_entrega': '15 dias úteis',
                'termos_gerais': 'Esta proposta é válida pelos termos e condições apresentados. Qualquer alteração deverá ser comunicada e aprovada previamente.'
            },
            'dados_tributarios': dados_tributarios,
            'observacoes_especiais': [
                'Valores sujeitos a reajuste após o período de validade da proposta',
                'Início dos trabalhos condicionado à documentação completa'
            ],
            'logo_path': logo_path
        }
        
    def _gerar_pdf_weasyprint(self, html_content: str, caminho_arquivo: str):
        """Gera PDF usando WeasyPrint"""
        if not WEASYPRINT_AVAILABLE:
            raise ImportError("WeasyPrint não disponível")
            
        try:
            # Configurações para WeasyPrint
            base_url = os.path.dirname(os.path.abspath(__file__))
            
            # Criar documento PDF
            html_doc = weasyprint.HTML(string=html_content, base_url=base_url)
            
            # Gerar PDF
            html_doc.write_pdf(caminho_arquivo)
            
            print(f"PDF gerado com sucesso: {caminho_arquivo}")
            
        except Exception as e:
            print(f"Erro ao gerar PDF com WeasyPrint: {e}")
            raise e
    
    def listar_pdfs_gerados(self) -> list:
        """Lista todos os PDFs gerados"""
        pdfs = []
        if os.path.exists(self.upload_dir):
            for arquivo in os.listdir(self.upload_dir):
                if arquivo.endswith('.pdf'):
                    caminho_completo = os.path.join(self.upload_dir, arquivo)
                    stat = os.stat(caminho_completo)
                    pdfs.append({
                        'nome': arquivo,
                        'caminho': caminho_completo,
                        'tamanho': stat.st_size,
                        'data_criacao': datetime.fromtimestamp(stat.st_ctime).strftime('%d/%m/%Y %H:%M:%S')
                    })
        
        return sorted(pdfs, key=lambda x: x['data_criacao'], reverse=True)
    
    def remover_pdf(self, nome_arquivo: str) -> bool:
        """Remove um PDF específico"""
        try:
            caminho = os.path.join(self.upload_dir, nome_arquivo)
            if os.path.exists(caminho) and nome_arquivo.endswith('.pdf'):
                os.remove(caminho)
                return True
        except Exception as e:
            print(f"Erro ao remover PDF {nome_arquivo}: {e}")
        
        return False
    
    def limpar_pdfs_antigos(self, dias: int = 30) -> int:
        """Remove PDFs mais antigos que X dias"""
        removidos = 0
        limite = datetime.now().timestamp() - (dias * 24 * 60 * 60)
        
        if os.path.exists(self.upload_dir):
            for arquivo in os.listdir(self.upload_dir):
                if arquivo.endswith('.pdf'):
                    caminho = os.path.join(self.upload_dir, arquivo)
                    if os.path.getctime(caminho) < limite:
                        try:
                            os.remove(caminho)
                            removidos += 1
                        except Exception as e:
                            print(f"Erro ao remover {arquivo}: {e}")
        
        return removidos


# Função de conveniência para uso direto
def gerar_pdf_proposta(proposta_id: int) -> str:
    """Função de conveniência para gerar PDF de proposta"""
    generator = PropostaPDF()
    return generator.gerar_pdf_proposta(proposta_id)


# Exemplo de uso
if __name__ == "__main__":
    # Teste da classe
    generator = PropostaPDF()
    
    try:
        # Gerar PDF de teste
        caminho_pdf = generator._gerar_pdf_mock(1)
        print(f"PDF de teste gerado: {caminho_pdf}")
        
        # Listar PDFs
        pdfs = generator.listar_pdfs_gerados()
        print(f"PDFs encontrados: {len(pdfs)}")
        for pdf in pdfs:
            print(f"- {pdf['nome']} ({pdf['tamanho']} bytes)")
            
    except Exception as e:
        print(f"Erro no teste: {e}")