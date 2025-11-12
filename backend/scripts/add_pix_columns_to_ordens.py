"""Script de segurança para adicionar colunas pix_* na tabela ordens_servicos (SQLite).

Uso: execute a partir da pasta `backend` com o venv ativado:

    python scripts/add_pix_columns_to_ordens.py

O script detecta o arquivo SQLite a partir da configuração em `config.app.config['SQLALCHEMY_DATABASE_URI']`.
Ele verifica se a tabela `ordens_servicos` existe e adiciona colunas faltantes usando ALTER TABLE ADD COLUMN.
"""

import sqlite3
import sys
import os

try:
    # Importar a app/configuração para obter a URI do banco
    from config import app
except Exception as exc:
    print("Não foi possível importar config.app; certifique-se de executar este script com o diretório 'backend' como cwd.")
    raise


def resolve_sqlite_path(sqlalchemy_uri: str) -> str:
    if not sqlalchemy_uri:
        raise ValueError('SQLALCHEMY_DATABASE_URI vazio')
    uri = sqlalchemy_uri.strip()
    # Suporta formatos sqlite:///relative.db e sqlite:////absolute/path.db
    if uri.startswith('sqlite:///'):
        path = uri.replace('sqlite:///', '')
        return os.path.abspath(path)
    if uri.startswith('sqlite:////'):
        # caminho absoluto com 4 barras
        path = uri.replace('sqlite:', '')
        return os.path.abspath(path)
    if uri.startswith('sqlite:'):
        # fallback: remove prefix
        path = uri.split(':', 1)[1]
        return os.path.abspath(path)
    raise ValueError(f'URI de BD não suportada pelo script: {sqlalchemy_uri}')


def ensure_columns(db_path: str) -> None:
    if not os.path.exists(db_path):
        print(f"Arquivo de banco de dados não encontrado: {db_path}")
        sys.exit(1)

    conn = sqlite3.connect(db_path)
    cur = conn.cursor()

    # Verifica existência da tabela
    cur.execute("SELECT name FROM sqlite_master WHERE type='table' AND name='ordens_servicos'")
    if not cur.fetchone():
        print("Tabela 'ordens_servicos' não encontrada no banco. Verifique se você está usando o arquivo de BD correto.")
        conn.close()
        sys.exit(1)

    # Colunas que queremos garantir
    desired_columns = {
        'pix_copia_cola': 'TEXT',
        'pix_imagem_data_uri': 'TEXT',
        'pix_payment_id': 'VARCHAR(128)',
        'pix_external_reference': 'VARCHAR(128)',
        'pix_expiracao': 'DATETIME',
        'pix_gerado_em': 'DATETIME',
    }

    cur.execute("PRAGMA table_info('ordens_servicos')")
    existing = {row[1] for row in cur.fetchall()}  # row[1] é o nome da coluna

    added = []
    for col, col_type in desired_columns.items():
        if col in existing:
            print(f"Coluna já existe: {col}")
            continue
        sql = f"ALTER TABLE ordens_servicos ADD COLUMN {col} {col_type}"
        print(f"Adicionando coluna: {col} {col_type}")
        cur.execute(sql)
        added.append(col)

    conn.commit()
    conn.close()

    if added:
        print(f"Colunas adicionadas com sucesso: {', '.join(added)}")
    else:
        print("Nenhuma coluna nova foi adicionada.")


if __name__ == '__main__':
    uri = app.config.get('SQLALCHEMY_DATABASE_URI')
    try:
        db_path = resolve_sqlite_path(uri)
    except Exception as exc:
        print(f"Erro ao resolver caminho do banco: {exc}")
        sys.exit(1)

    print(f"Usando arquivo de banco: {db_path}")
    ensure_columns(db_path)
