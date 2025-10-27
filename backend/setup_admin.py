import os
import sys
import re
from datetime import datetime
from getpass import getpass

sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from config import app, db
from models.organizacional import Usuario
from werkzeug.security import generate_password_hash

def validar_email(email):
    """Valida formato do email"""
    padrao = r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$'
    return re.match(padrao, email) is not None

def validar_senha(senha):
    """Valida força da senha"""
    if len(senha) < 6:
        return False, "Senha deve ter pelo menos 6 caracteres"
    if not re.search(r'[A-Za-z]', senha):
        return False, "Senha deve conter pelo menos uma letra"
    if not re.search(r'[0-9]', senha):
        return False, "Senha deve conter pelo menos um número"
    return True, "Senha válida"

def obter_dados_admin():
    """Coleta dados do administrador com validações"""
    print("=== CONFIGURAÇÃO DO ADMINISTRADOR DO SISTEMA ===\n")
    
    # Nome
    while True:
        nome = input("Nome completo do administrador: ").strip()
        if len(nome) >= 3:
            break
        print("❌ Nome deve ter pelo menos 3 caracteres")
    
    # CPF (obrigatório no seu modelo)
    while True:
        cpf = input("CPF (11 dígitos): ").strip().replace('.', '').replace('-', '')
        if re.match(r'^\d{11}$', cpf):
            # Verificar se já existe
            with app.app_context():
                usuario_existente = Usuario.query.filter_by(cpf=cpf).first()
                if not usuario_existente:
                    break
                print("❌ CPF já cadastrado, use outro")
        else:
            print("❌ CPF deve conter exatamente 11 dígitos numéricos")
    
    # Email
    while True:
        email = input("Email: ").strip().lower()
        if validar_email(email):
            # Verificar se já existe
            with app.app_context():
                usuario_existente = Usuario.query.filter_by(email=email).first()
                if not usuario_existente:
                    break
                print("❌ Email já cadastrado, use outro")
        else:
            print("❌ Email inválido")
    
    # Username
    while True:
        username = input("Username (login): ").strip().lower()
        if len(username) >= 3 and username.isalnum():
            # Verificar se já existe
            with app.app_context():
                usuario_existente = Usuario.query.filter_by(username=username).first()
                if not usuario_existente:
                    break
                print("❌ Username já existe, escolha outro")
        else:
            print("❌ Username deve ter pelo menos 3 caracteres e ser alfanumérico")
    
    # Senha
    while True:
        senha = getpass("Senha (será oculta): ")
        confirma_senha = getpass("Confirme a senha: ")
        
        if senha != confirma_senha:
            print("❌ Senhas não coincidem")
            continue
        
        valida, mensagem = validar_senha(senha)
        if valida:
            break
        print(f"❌ {mensagem}")
    
    return nome, cpf, email, username, senha

def criar_cargo_admin():
    """Cria um cargo específico para administradores se não existir"""
    try:
        from models.organizacional import Departamento, Cargo, Empresa
        
        # Verificar se existe empresa
        empresa = Empresa.query.first()
        if not empresa:
            # Criar empresa padrão
            empresa = Empresa(
                nome="Sistema Administrativo",
                cnpj="00000000000100",  # CNPJ fictício
                endereco="Endereço não informado",
                telefone="0000000000",
                email="admin@sistema.com"
            )
            db.session.add(empresa)
            db.session.flush()  # Para obter o ID
        
        # Verificar se existe departamento administrativo
        dept_admin = Departamento.query.filter_by(nome="Administração").first()
        if not dept_admin:
            dept_admin = Departamento(
                nome="Administração",
                descricao="Departamento Administrativo do Sistema",
                status="ativo",
                empresa_id=empresa.id
            )
            db.session.add(dept_admin)
            db.session.flush()
        
        # Verificar se existe cargo de administrador
        cargo_admin = Cargo.query.filter_by(nome="Administrador do Sistema").first()
        if not cargo_admin:
            cargo_admin = Cargo(
                nome="Administrador do Sistema",
                descricao="Cargo com privilégios administrativos completos",
                tipo="administrativo",
                departamento_id=dept_admin.id
            )
            db.session.add(cargo_admin)
            db.session.flush()
        
        return cargo_admin.id
        
    except Exception as e:
        print(f"⚠️ Erro ao criar estrutura administrativa: {e}")
        return None

def criar_usuario_admin():
    """Cria o usuário administrador"""
    
    with app.app_context():
        try:
            # Recriar todas as tabelas para garantir estrutura correta
            print("🔄 Recriando estrutura do banco de dados...")
            db.drop_all()
            db.create_all()
            print("✅ Estrutura do banco criada com sucesso!")
            
            # Verificar se já existe admin
            admin_existente = Usuario.query.filter_by(eh_gerente=True).first()
            if admin_existente:
                print("⚠️ Já existe um administrador no sistema!")
                resposta = input("Deseja criar outro admin? (s/N): ").strip().lower()
                if resposta != 's':
                    print("❌ Operação cancelada")
                    return
            
            # Obter dados do admin
            nome, cpf, email, username, senha = obter_dados_admin()
            
            # Criar estrutura administrativa (empresa, departamento, cargo)
            print("🏢 Criando estrutura administrativa...")
            cargo_id = criar_cargo_admin()
            
            if not cargo_id:
                print("❌ Não foi possível criar a estrutura administrativa")
                return
            
            # Criar hash da senha usando o método do modelo
            admin = Usuario(
                nome=nome,
                cpf=cpf,
                email=email,
                username=username,  # ADICIONAR ESTA LINHA
                eh_gerente=True,
                status='ativo',
                cargo_id=cargo_id,
                tipo_usuario='admin'  # ADICIONAR ESTA LINHA TAMBÉM
            )
            
            # Usar o método do modelo para definir a senha
            admin.set_senha(senha)  # Isso já usa o seu campo senha_hash internamente
            
            # Salvar no banco
            db.session.add(admin)
            db.session.commit()
            
            print("\n✅ Administrador criado com sucesso!")
            print(f"📧 Email: {email}")
            print(f"👤 CPF: {cpf}")
            print("🔐 Senha configurada com sucesso")
            print("\n🎉 Sistema pronto para uso!")
            
        except Exception as e:
            db.session.rollback()
            print(f"❌ Erro ao criar administrador: {e}")

# Verificar se o usuário admin tem o campo username preenchido

