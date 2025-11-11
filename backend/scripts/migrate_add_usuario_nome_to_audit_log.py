"""Script de migração simples para adicionar a coluna `usuario_nome` à tabela `proposta_logs`.

Uso:
    python migrate_add_usuario_nome_to_audit_log.py

O script é seguro para rodar múltiplas vezes: ele verifica se a tabela existe e se a coluna já foi adicionada.

Observação: em ambientes de produção com Alembic é preferível gerar uma migration apropriada.
"""
from config import db, app
from sqlalchemy import text
import os


def table_exists(engine, table_name: str) -> bool:
    inspector = db.inspect(engine)
    return table_name in inspector.get_table_names()


def column_exists(engine, table_name: str, column_name: str) -> bool:
    # Para compatibilidade com SQLite usamos PRAGMA, mas também funcionará com outros bancos via inspector
    try:
        inspector = db.inspect(engine)
        cols = [c['name'] for c in inspector.get_columns(table_name)]
        return column_name in cols
    except Exception:
        # Fallback para SQLite PRAGMA
        try:
            with engine.connect() as conn:
                res = conn.execute(text(f"PRAGMA table_info('{table_name}')")).fetchall()
                for row in res:
                    # row[1] é o nome da coluna no resultado do PRAGMA
                    if len(row) > 1 and row[1] == column_name:
                        return True
        except Exception:
            return False
    return False


def main():
    table_name = 'proposta_logs'
    column_name = 'usuario_nome'

    print('Conectando ao banco... (usando contexto da aplicação)')

    # Todas as operações que acessam `db`/inspector precisam do app context
    with app.app_context():
        engine = db.get_engine()

        if not table_exists(engine, table_name):
            print(f"Tabela '{table_name}' não existe. Criando tabelas via metadata (db.create_all()).")
            # Importar modelos para garantir que AuditLog esteja registrado
            import models.audit_log  # noqa: F401
            db.create_all()
            print('Tabelas criadas (quando não existiam).')

        # Verificar se a coluna já existe
        if column_exists(engine, table_name, column_name):
            print(f"Coluna '{column_name}' já existe em '{table_name}'. Nenhuma ação necessária.")
            return

        # Adicionar coluna na tabela (SQLite suporta ADD COLUMN)
        print(f"Adicionando coluna '{column_name}' à tabela '{table_name}'...")
        try:
            with engine.connect() as conn:
                # Tipo compatível com SQLAlchemy/SQLite
                conn.execute(text(f"ALTER TABLE {table_name} ADD COLUMN {column_name} VARCHAR(150)") )
                print('Coluna adicionada com sucesso.')
        except Exception as e:
            print('Erro ao adicionar coluna:', e)
            print('Tente rodar manualmente ou criar uma migration Alembic para ambientes maiores.')


if __name__ == '__main__':
    main()
