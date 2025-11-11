from config import db

# Importar modelos para que sejam registrados no metadata
import models.proposta
import models.audit_log

if __name__ == '__main__':
    print('Criando tabelas (se não existirem)...')
    db.create_all()
    print('Tabelas criadas.')
