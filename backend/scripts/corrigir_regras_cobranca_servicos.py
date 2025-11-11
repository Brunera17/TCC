import sys
import os
# Adiciona o diretório backend ao sys.path
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from main import app
from models.servico import Servico
from models.base import db  # Importa o objeto db do SQLAlchemy

REGRAS_VALIDAS = ['VALOR_UNICO', 'MENSAL', 'POR_HORA', 'PERCENTUAL', 'POR_NF']

with app.app_context():
    servicos = Servico.query.all()
    count = 0
    for servico in servicos:
        if servico.regras_cobranca not in REGRAS_VALIDAS:
            servico.regras_cobranca = 'VALOR_UNICO'
            count += 1
    db.session.commit()
    print(f"Corrigidos {count} serviços com regras_cobranca inválidas para 'VALOR_UNICO'.")
