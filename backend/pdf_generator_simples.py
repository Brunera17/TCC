"""
Gerador de PDF simplificado usando ReportLab
Versão para Windows sem dependências complexas
"""

import os
import json
from datetime import datetime
from reportlab.lib.pagesizes import letter, A4
from reportlab.lib import colors
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import inch, mm, cm
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, Image
from reportlab.platypus.frames import Frame
from reportlab.platypus.doctemplate import PageTemplate, BaseDocTemplate
from reportlab.lib.enums import TA_CENTER, TA_LEFT, TA_RIGHT

class PropostaPDFSimples:
    def __init__(self):
        self.upload_dir = os.path.join(os.getcwd(), 'uploads', 'pdfs')
        os.makedirs(self.upload_dir, exist_ok=True)
        
        # Estilos padrão
        self.styles = getSampleStyleSheet()
        
        # Estilos customizados
        self.styles.add(ParagraphStyle(
            name='Titulo',
            parent=self.styles['Heading1'],
            fontSize=20,
            spaceAfter=30,
            alignment=TA_CENTER,
            textColor=colors.Color(0.2, 0.2, 0.2)
        ))
        
        self.styles.add(ParagraphStyle(
            name='SubTitulo',
            parent=self.styles['Heading2'],
            fontSize=14,
            spaceAfter=12,
            spaceBefore=12,
            textColor=colors.Color(0.3, 0.3, 0.3)
        ))
        
        self.styles.add(ParagraphStyle(
            name='TextoNormal',
            parent=self.styles['Normal'],
            fontSize=10,
            spaceAfter=6,
            alignment=TA_LEFT
        ))
        
        self.styles.add(ParagraphStyle(
            name='TextoCentro',
            parent=self.styles['Normal'],
            fontSize=10,
            alignment=TA_CENTER
        ))
        
        # Informações da empresa
        self.empresa = {
            'nome': 'Christino Consultoria',
            'cnpj': '00.000.000/0001-00',
            'endereco': 'Rua Exemplo, 123 - Cidade - Estado',
            'cep': '00000-000',
            'telefone': '(00) 0000-0000',
            'celular': '(00) 9 0000-0000',
            'email': 'contato@christinoconsultoria.com',
            'site': 'www.christinoconsultoria.com',
        }
    
    def format_currency(self, value):
        """Formata valores monetários"""
        if value is None:
            return "R$ 0,00"
        try:
            return f"R$ {value:,.2f}".replace(',', 'X').replace('.', ',').replace('X', '.')
        except (ValueError, TypeError):
            return "R$ 0,00"
    
    def gerar_pdf_proposta_simples(self, proposta_id: int) -> str:
        """Gera PDF da proposta usando dados mockados"""
        
        # Nome do arquivo
        nome_arquivo = f"proposta_simples_{proposta_id}_{datetime.now().strftime('%Y%m%d_%H%M%S')}.pdf"
        caminho_arquivo = os.path.join(self.upload_dir, nome_arquivo)
        
        # Criar documento
        doc = SimpleDocTemplate(
            caminho_arquivo,
            pagesize=A4,
            rightMargin=2*cm,
            leftMargin=2*cm,
            topMargin=2*cm,
            bottomMargin=2*cm
        )
        
        # Elementos do documento
        elementos = []
        
        # Cabeçalho da empresa
        elementos.extend(self._criar_cabecalho())
        
        # Título da proposta
        elementos.append(Spacer(1, 20))
        elementos.append(Paragraph(f"PROPOSTA COMERCIAL Nº PROP-{proposta_id:04d}", self.styles['Titulo']))
        elementos.append(Spacer(1, 20))
        
        # Dados do cliente
        elementos.extend(self._criar_dados_cliente(proposta_id))
        
        # Itens da proposta
        elementos.extend(self._criar_itens_proposta())
        
        # Totais
        elementos.extend(self._criar_totais())
        
        # Condições
        elementos.extend(self._criar_condicoes())
        
        # Rodapé
        elementos.extend(self._criar_rodape())
        
        # Gerar PDF
        try:
            doc.build(elementos)
            print(f"✓ PDF gerado com sucesso: {caminho_arquivo}")
            return caminho_arquivo
        except Exception as e:
            print(f"❌ Erro ao gerar PDF: {e}")
            raise e
    
    def _criar_cabecalho(self):
        """Cria cabeçalho da empresa"""
        elementos = []
        
        # Dados da empresa
        empresa_info = [
            [self.empresa['nome'], f"Data: {datetime.now().strftime('%d/%m/%Y')}"],
            [f"CNPJ: {self.empresa['cnpj']}", ""],
            [self.empresa['endereco'], ""],
            [f"Tel: {self.empresa['telefone']} | {self.empresa['celular']}", ""],
            [f"Email: {self.empresa['email']}", ""]
        ]
        
        tabela = Table(empresa_info, colWidths=[12*cm, 5*cm])
        tabela.setStyle(TableStyle([
            ('FONTNAME', (0, 0), (-1, -1), 'Helvetica'),
            ('FONTSIZE', (0, 0), (-1, -1), 9),
            ('FONTNAME', (0, 0), (0, 0), 'Helvetica-Bold'),
            ('FONTSIZE', (0, 0), (0, 0), 14),
            ('ALIGN', (1, 0), (1, 0), 'RIGHT'),
            ('VALIGN', (0, 0), (-1, -1), 'TOP'),
            ('LINEBELOW', (0, -1), (-1, -1), 1, colors.black),
        ]))
        
        elementos.append(tabela)
        return elementos
    
    def _criar_dados_cliente(self, proposta_id):
        """Cria seção de dados do cliente"""
        elementos = []
        
        elementos.append(Spacer(1, 15))
        elementos.append(Paragraph("DADOS DO CLIENTE", self.styles['SubTitulo']))
        
        # Dados mockados do cliente
        cliente_info = [
            ["Nome/Razão Social:", "Cliente Exemplo Ltda"],
            ["CNPJ:", "12.345.678/0001-99"],
            ["Endereço:", "Rua do Cliente, 456 - Centro"],
            ["Cidade:", "São Paulo - SP"],
            ["Email:", "cliente@exemplo.com"],
            ["Telefone:", "(11) 9999-9999"]
        ]
        
        tabela = Table(cliente_info, colWidths=[4*cm, 12*cm])
        tabela.setStyle(TableStyle([
            ('FONTNAME', (0, 0), (-1, -1), 'Helvetica'),
            ('FONTSIZE', (0, 0), (-1, -1), 9),
            ('FONTNAME', (0, 0), (0, -1), 'Helvetica-Bold'),
            ('ALIGN', (0, 0), (0, -1), 'LEFT'),
            ('VALIGN', (0, 0), (-1, -1), 'TOP'),
            ('GRID', (0, 0), (-1, -1), 0.5, colors.grey),
            ('BACKGROUND', (0, 0), (0, -1), colors.Color(0.95, 0.95, 0.95))
        ]))
        
        elementos.append(tabela)
        return elementos
    
    def _criar_itens_proposta(self):
        """Cria tabela de itens da proposta"""
        elementos = []
        
        elementos.append(Spacer(1, 20))
        elementos.append(Paragraph("ITENS DA PROPOSTA", self.styles['SubTitulo']))
        
        # Cabeçalho da tabela
        dados = [
            ["Item", "Descrição", "Qtd", "Valor Unit.", "Total"]
        ]
        
        # Itens mockados
        itens = [
            {
                'item': "01",
                'descricao': "Consultoria Contábil\nOrganização de documentos\nDeclarações mensais",
                'quantidade': 1,
                'valor_unitario': 1500.00,
                'total': 1500.00
            },
            {
                'item': "02", 
                'descricao': "Consultoria Tributária\nPlanejamento fiscal\nAnálise de tributos",
                'quantidade': 1,
                'valor_unitario': 800.00,
                'total': 800.00
            },
            {
                'item': "03",
                'descricao': "Abertura de empresa\nRegistros necessários\nAlvará de funcionamento",
                'quantidade': 1,
                'valor_unitario': 1200.00,
                'total': 1200.00
            }
        ]
        
        for item in itens:
            dados.append([
                item['item'],
                item['descricao'],
                str(item['quantidade']),
                self.format_currency(item['valor_unitario']),
                self.format_currency(item['total'])
            ])
        
        # Criar tabela
        tabela = Table(dados, colWidths=[1.5*cm, 8*cm, 1.5*cm, 3*cm, 3*cm])
        
        # Estilo da tabela
        tabela.setStyle(TableStyle([
            # Cabeçalho
            ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
            ('FONTSIZE', (0, 0), (-1, 0), 10),
            ('BACKGROUND', (0, 0), (-1, 0), colors.Color(0.8, 0.8, 0.8)),
            ('ALIGN', (0, 0), (-1, 0), 'CENTER'),
            
            # Corpo
            ('FONTNAME', (0, 1), (-1, -1), 'Helvetica'),
            ('FONTSIZE', (0, 1), (-1, -1), 9),
            ('ALIGN', (0, 1), (0, -1), 'CENTER'),  # Item
            ('ALIGN', (1, 1), (1, -1), 'LEFT'),    # Descrição
            ('ALIGN', (2, 1), (2, -1), 'CENTER'),  # Quantidade
            ('ALIGN', (3, 1), (-1, -1), 'RIGHT'),  # Valores
            
            # Bordas
            ('GRID', (0, 0), (-1, -1), 0.5, colors.black),
            ('LINEBELOW', (0, 0), (-1, 0), 2, colors.black),
            
            # Cores alternadas
            ('BACKGROUND', (0, 1), (-1, 1), colors.Color(0.95, 0.95, 0.95)),
            ('BACKGROUND', (0, 3), (-1, 3), colors.Color(0.95, 0.95, 0.95)),
        ]))
        
        elementos.append(tabela)
        return elementos
    
    def _criar_totais(self):
        """Cria seção de totais"""
        elementos = []
        
        elementos.append(Spacer(1, 15))
        
        # Dados dos totais
        totais_data = [
            ["Subtotal:", "R$ 3.500,00"],
            ["Desconto:", "R$ 0,00"],
            ["Total Geral:", "R$ 3.500,00"]
        ]
        
        tabela = Table(totais_data, colWidths=[10*cm, 4*cm])
        tabela.setStyle(TableStyle([
            ('FONTNAME', (0, 0), (-1, -1), 'Helvetica'),
            ('FONTSIZE', (0, 0), (-1, -1), 10),
            ('FONTNAME', (0, -1), (-1, -1), 'Helvetica-Bold'),
            ('FONTSIZE', (0, -1), (-1, -1), 12),
            ('ALIGN', (0, 0), (0, -1), 'RIGHT'),
            ('ALIGN', (1, 0), (1, -1), 'RIGHT'),
            ('LINEBELOW', (0, -1), (-1, -1), 2, colors.black),
            ('BACKGROUND', (0, -1), (-1, -1), colors.Color(0.9, 0.9, 0.9))
        ]))
        
        elementos.append(tabela)
        return elementos
    
    def _criar_condicoes(self):
        """Cria seção de condições"""
        elementos = []
        
        elementos.append(Spacer(1, 20))
        elementos.append(Paragraph("CONDIÇÕES COMERCIAIS", self.styles['SubTitulo']))
        
        condicoes = [
            "• Forma de Pagamento: 3x sem juros no cartão ou à vista com 5% de desconto",
            "• Prazo de Entrega: 15 dias úteis após assinatura do contrato",
            "• Validade da Proposta: 30 dias",
            "• Início dos trabalhos condicionado à documentação completa",
            "• Valores sujeitos a reajuste após período de validade"
        ]
        
        for condicao in condicoes:
            elementos.append(Paragraph(condicao, self.styles['TextoNormal']))
        
        return elementos
    
    def _criar_rodape(self):
        """Cria rodapé do documento"""
        elementos = []
        
        elementos.append(Spacer(1, 30))
        elementos.append(Paragraph("Atenciosamente,", self.styles['TextoNormal']))
        elementos.append(Spacer(1, 40))
        
        assinatura = [
            ["_" * 50, "_" * 50],
            ["Christino Consultoria", "Cliente"],
            ["CNPJ: 00.000.000/0001-00", ""]
        ]
        
        tabela = Table(assinatura, colWidths=[8*cm, 8*cm])
        tabela.setStyle(TableStyle([
            ('FONTNAME', (0, 0), (-1, -1), 'Helvetica'),
            ('FONTSIZE', (0, 0), (-1, -1), 9),
            ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
            ('FONTNAME', (0, 1), (-1, 1), 'Helvetica-Bold'),
        ]))
        
        elementos.append(tabela)
        
        return elementos
    
    def listar_pdfs_gerados(self):
        """Lista PDFs gerados"""
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


# Função de teste
if __name__ == "__main__":
    generator = PropostaPDFSimples()
    
    try:
        # Teste de geração
        print("🔄 Testando geração de PDF...")
        caminho_pdf = generator.gerar_pdf_proposta_simples(1)
        print(f"✅ PDF gerado com sucesso: {caminho_pdf}")
        
        # Listar PDFs
        pdfs = generator.listar_pdfs_gerados()
        print(f"\n📁 PDFs encontrados: {len(pdfs)}")
        for pdf in pdfs:
            print(f"   📄 {pdf['nome']} ({pdf['tamanho']:,} bytes)")
            
    except Exception as e:
        print(f"❌ Erro no teste: {e}")
        import traceback
        traceback.print_exc()