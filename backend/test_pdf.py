"""
Teste da geração de PDF
"""
import sys
import os

# Adicionar o diretório do projeto ao path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

def test_pdf_generator():
    """Testa a geração de PDF"""
    print("=== TESTE DE GERAÇÃO DE PDF ===\n")
    
    try:
        from services.pdf_generator import PropostaPDF
        print("✓ Módulo PDF importado com sucesso")
        
        # Criar instância do gerador
        generator = PropostaPDF()
        print("✓ Instância do gerador criada")
        
        # Verificar diretório de upload
        print(f"📁 Diretório de PDFs: {generator.upload_dir}")
        print(f"✓ Diretório existe: {os.path.exists(generator.upload_dir)}")
        
        # Verificar template
        template_dir = generator.jinja_env.loader.searchpath[0] if generator.jinja_env.loader.searchpath else "Não encontrado"
        print(f"📄 Diretório de templates: {template_dir}")
        
        # Verificar se template existe
        template_exists = False
        try:
            template = generator.jinja_env.get_template('modelo_pdf.html')
            template_exists = True
            print("✓ Template modelo_pdf.html encontrado")
        except Exception as e:
            print(f"❌ Template não encontrado: {e}")
        
        # Verificar logo
        if generator.empresa['logo_path']:
            print(f"🖼️  Logo encontrado: {generator.empresa['logo_path']}")
        else:
            print("⚠️  Logo não encontrado (opcional)")
        
        # Verificar WeasyPrint
        try:
            import weasyprint
            print("✓ WeasyPrint disponível")
            weasyprint_ok = True
        except ImportError:
            print("❌ WeasyPrint não instalado")
            weasyprint_ok = False
        
        print("\n=== TENTANDO GERAR PDF DE TESTE ===")
        
        if template_exists and weasyprint_ok:
            try:
                # Gerar PDF de teste usando dados mockados
                caminho_pdf = generator._gerar_pdf_mock(1)
                print(f"✅ PDF gerado com sucesso: {caminho_pdf}")
                
                # Verificar se arquivo foi criado
                if os.path.exists(caminho_pdf):
                    tamanho = os.path.getsize(caminho_pdf)
                    print(f"📊 Tamanho do arquivo: {tamanho} bytes")
                    
                    if tamanho > 1000:  # Arquivo deve ter pelo menos 1KB
                        print("✅ PDF parece ter sido gerado corretamente")
                    else:
                        print("⚠️  PDF muito pequeno - pode ter problemas")
                        
                else:
                    print("❌ Arquivo PDF não foi encontrado após geração")
                    
            except Exception as e:
                print(f"❌ Erro ao gerar PDF: {e}")
                import traceback
                traceback.print_exc()
        else:
            print("⚠️  Pulando geração - dependências em falta")
        
        # Listar PDFs existentes
        print("\n=== PDFs EXISTENTES ===")
        pdfs = generator.listar_pdfs_gerados()
        if pdfs:
            print(f"Encontrados {len(pdfs)} PDFs:")
            for pdf in pdfs[:5]:  # Mostrar apenas os 5 primeiros
                print(f"  📄 {pdf['nome']} - {pdf['tamanho']} bytes - {pdf['data_criacao']}")
        else:
            print("Nenhum PDF encontrado")
            
    except ImportError as e:
        print(f"❌ Erro de importação: {e}")
        print("Verifique se todos os módulos estão instalados")
        
    except Exception as e:
        print(f"❌ Erro inesperado: {e}")
        import traceback
        traceback.print_exc()

def check_dependencies():
    """Verifica dependências necessárias"""
    print("=== VERIFICAÇÃO DE DEPENDÊNCIAS ===\n")
    
    dependencies = {
        'jinja2': 'Jinja2',
        'weasyprint': 'WeasyPrint',
        'reportlab': 'ReportLab'
    }
    
    for module, name in dependencies.items():
        try:
            __import__(module)
            print(f"✓ {name} instalado")
        except ImportError:
            print(f"❌ {name} NÃO instalado - Execute: pip install {module}")
    
    print()

if __name__ == "__main__":
    check_dependencies()
    test_pdf_generator()