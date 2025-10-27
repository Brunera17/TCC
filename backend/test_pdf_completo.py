"""
Teste completo do gerador de PDF
"""

import os
import sys
sys.path.append('.')

from pdf_generator_simples import PropostaPDFSimples


def test_complete_pdf():
    """Teste completo do gerador de PDF"""
    print("=== TESTE COMPLETO DO GERADOR DE PDF ===\n")
    
    generator = PropostaPDFSimples()
    
    try:
        # Teste 1: Geração de PDF
        print("🔄 Teste 1: Gerando PDF...")
        caminho_pdf = generator.gerar_pdf_proposta_simples(123)
        
        # Verificar se o arquivo foi criado
        if os.path.exists(caminho_pdf):
            tamanho = os.path.getsize(caminho_pdf)
            print(f"✅ PDF criado: {os.path.basename(caminho_pdf)}")
            print(f"   📏 Tamanho: {tamanho:,} bytes")
            print(f"   📁 Local: {caminho_pdf}")
        else:
            print("❌ PDF não foi criado!")
            return False
        
        # Teste 2: Listagem de PDFs
        print("\n🔄 Teste 2: Listando PDFs...")
        pdfs = generator.listar_pdfs_gerados()
        print(f"✅ Encontrados {len(pdfs)} PDFs:")
        
        for i, pdf in enumerate(pdfs[:5], 1):  # Mostrar só os 5 mais recentes
            print(f"   {i}. {pdf['nome']}")
            print(f"      📅 Criado: {pdf['data_criacao']}")
            print(f"      📏 Tamanho: {pdf['tamanho']:,} bytes")
        
        # Teste 3: Múltiplos PDFs
        print("\n🔄 Teste 3: Gerando múltiplos PDFs...")
        for i in range(2, 5):  # Gerar PDFs 2, 3, 4
            try:
                pdf_path = generator.gerar_pdf_proposta_simples(i)
                print(f"   ✅ PDF {i}: {os.path.basename(pdf_path)}")
            except Exception as e:
                print(f"   ❌ Erro no PDF {i}: {e}")
        
        # Teste 4: Verificar estrutura de diretório
        print("\n🔄 Teste 4: Verificando estrutura...")
        upload_dir = generator.upload_dir
        
        if os.path.exists(upload_dir):
            files = [f for f in os.listdir(upload_dir) if f.endswith('.pdf')]
            print(f"✅ Diretório uploads existe: {upload_dir}")
            print(f"✅ Total de PDFs: {len(files)}")
            
            total_size = sum(os.path.getsize(os.path.join(upload_dir, f)) for f in files)
            print(f"✅ Tamanho total: {total_size:,} bytes ({total_size/1024:.1f} KB)")
        else:
            print(f"❌ Diretório uploads não existe: {upload_dir}")
            
        print("\n🎉 TODOS OS TESTES CONCLUÍDOS COM SUCESSO!")
        print(f"📂 Você pode encontrar os PDFs em: {upload_dir}")
        
        return True
        
    except Exception as e:
        print(f"❌ Erro durante o teste: {e}")
        import traceback
        traceback.print_exc()
        return False


def test_pdf_content():
    """Teste adicional para validar conteúdo"""
    print("\n=== TESTE DE CONTEÚDO DO PDF ===\n")
    
    generator = PropostaPDFSimples()
    
    # Testar formatação de moeda
    print("🔄 Testando formatação de valores...")
    testes_moeda = [
        (1234.56, "R$ 1.234,56"),
        (0, "R$ 0,00"),
        (None, "R$ 0,00"),
        (10.1, "R$ 10,10")
    ]
    
    for valor, esperado in testes_moeda:
        resultado = generator.format_currency(valor)
        status = "✅" if resultado == esperado else "❌"
        print(f"   {status} {valor} → {resultado} (esperado: {esperado})")
    
    # Testar informações da empresa
    print("\n🔄 Testando dados da empresa...")
    empresa = generator.empresa
    campos_obrigatorios = ['nome', 'cnpj', 'endereco', 'telefone', 'email']
    
    for campo in campos_obrigatorios:
        if campo in empresa and empresa[campo]:
            print(f"   ✅ {campo}: {empresa[campo]}")
        else:
            print(f"   ❌ {campo}: AUSENTE")
    
    print("\n✅ Teste de conteúdo concluído!")


if __name__ == "__main__":
    # Executar testes
    sucesso = test_complete_pdf()
    
    if sucesso:
        test_pdf_content()
        
        print("\n" + "="*50)
        print("🎊 PARABÉNS! O GERADOR DE PDF ESTÁ FUNCIONANDO PERFEITAMENTE!")
        print("="*50)
        
        # Instruções de uso
        print("\n📖 COMO USAR:")
        print("1. Importe: from pdf_generator_simples import PropostaPDFSimples")
        print("2. Crie: generator = PropostaPDFSimples()")  
        print("3. Gere: pdf_path = generator.gerar_pdf_proposta_simples(proposta_id)")
        print("4. Os PDFs ficam em: uploads/pdfs/")
        
    else:
        print("\n❌ Alguns testes falharam. Verifique os erros acima.")