from config import app, db
from models.organizacional import Usuario

with app.app_context():
    users = Usuario.query.all()
    print("=== USUÁRIOS NO BANCO ===")
    for user in users:
        print(f"ID: {user.id}")
        print(f"Nome: {user.nome}")
        print(f"Email: {user.email}")
        print(f"Username: {user.username}")
        print(f"Ativo: {user.ativo}")
        print(f"É Gerente: {user.eh_gerente}")
        print(f"Tipo: {user.tipo_usuario}")
        print("---")
    
    if not users:
        print("Nenhum usuário encontrado no banco!")