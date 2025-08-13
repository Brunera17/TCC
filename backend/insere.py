from config import db
from models import Funcionario, Cargo
from datetime import datetime
from config import app 

with app.app_context():
    # CARGOS
    c1 = Cargo(nome='Administrador')
    c2 = Cargo(nome='Analista')
    c3 = Cargo(nome='Estagiário')

    db.session.add_all([c1, c2, c3])
    db.session.commit()
    
    # FUNCIONARIOS
    f1 = Funcionario(nome='Maria Admin', email='admin@email.com', gerente=True)
    f1.cargo = c1 
    f1.set_senha('123456')
    f2 = Funcionario(nome='João User', email='usuario@email.com', gerente=False)
    f1.cargo = c2 
    f2.set_senha('abcdef')
    
    db.session.add_all([f1, f2])
    db.session.commit()
