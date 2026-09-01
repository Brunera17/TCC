"""Migração: adiciona as ForeignKeys de proposta_logs.proposta_id -> propostas.id
e proposta_logs.usuario_id -> funcionarios.id (ON DELETE SET NULL).

Contexto: o modelo `AuditLog` (backend/models/audit_log.py) declara essas FKs,
mas `db.create_all()` só cria tabelas que ainda não existem — ele nunca altera
uma tabela `proposta_logs` já existente para adicionar constraints novas.
SQLite também não suporta `ALTER TABLE ... ADD CONSTRAINT`, então a única forma
de aplicar isso retroativamente é recriar a tabela (padrão já usado por
scripts/downgrade_usuario_foto.py).

Antes de recriar a tabela, o script verifica se já existem linhas órfãs
(proposta_id sem proposta correspondente, ou usuario_id apontando para um
funcionário inexistente) e aborta sem alterar nada se encontrar alguma —
nesse caso a limpeza dos dados precisa ser decidida manualmente antes de
aplicar a constraint.

Uso:
    python scripts/migrate_add_fk_proposta_logs.py

Idempotente: se a tabela já tiver as duas FKs, o script não faz nada.
"""
import sqlite3
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent.parent
DEFAULT_DB_PATH = BASE_DIR / "database.db"
INSTANCE_DB_PATH = BASE_DIR / "instance" / "database.db"


def resolve_db_path() -> Path:
    if DEFAULT_DB_PATH.exists():
        return DEFAULT_DB_PATH
    if INSTANCE_DB_PATH.exists():
        return INSTANCE_DB_PATH
    return DEFAULT_DB_PATH


def has_expected_foreign_keys(cursor: sqlite3.Cursor) -> bool:
    cursor.execute("PRAGMA foreign_key_list(proposta_logs)")
    fks = cursor.fetchall()
    # cada linha: (id, seq, table, from, to, on_update, on_delete, match)
    referenced_tables = {row[2] for row in fks}
    return {"propostas", "funcionarios"}.issubset(referenced_tables)


def find_orphaned_rows(cursor: sqlite3.Cursor):
    cursor.execute(
        """
        SELECT id, proposta_id FROM proposta_logs
        WHERE proposta_id NOT IN (SELECT id FROM propostas)
        """
    )
    orphaned_propostas = cursor.fetchall()

    cursor.execute(
        """
        SELECT id, usuario_id FROM proposta_logs
        WHERE usuario_id IS NOT NULL
          AND usuario_id NOT IN (SELECT id FROM funcionarios)
        """
    )
    orphaned_usuarios = cursor.fetchall()

    return orphaned_propostas, orphaned_usuarios


def recreate_table_with_foreign_keys(conn: sqlite3.Connection) -> None:
    cursor = conn.cursor()

    cursor.execute("DROP TABLE IF EXISTS proposta_logs_new")
    cursor.execute(
        """
        CREATE TABLE proposta_logs_new (
            id INTEGER NOT NULL PRIMARY KEY,
            proposta_id INTEGER NOT NULL,
            usuario_id INTEGER,
            acao VARCHAR(100) NOT NULL,
            detalhes TEXT,
            created_at DATETIME,
            deleted_at DATETIME,
            updated_at DATETIME,
            usuario_nome VARCHAR(150),
            FOREIGN KEY (proposta_id) REFERENCES propostas (id),
            FOREIGN KEY (usuario_id) REFERENCES funcionarios (id) ON DELETE SET NULL
        )
        """
    )

    columns = "id, proposta_id, usuario_id, acao, detalhes, created_at, deleted_at, updated_at, usuario_nome"
    cursor.execute(
        f"INSERT INTO proposta_logs_new ({columns}) SELECT {columns} FROM proposta_logs"
    )

    cursor.execute("DROP TABLE proposta_logs")
    cursor.execute("ALTER TABLE proposta_logs_new RENAME TO proposta_logs")

    cursor.execute("CREATE INDEX IF NOT EXISTS ix_proposta_logs_proposta_id ON proposta_logs (proposta_id)")
    cursor.execute("CREATE INDEX IF NOT EXISTS ix_proposta_logs_usuario_id ON proposta_logs (usuario_id)")


def main() -> None:
    db_path = resolve_db_path()
    if not db_path.exists():
        raise FileNotFoundError(
            "Banco de dados não encontrado. Verifique se 'database.db' está na raiz do projeto ou em 'instance/'."
        )

    with sqlite3.connect(db_path) as conn:
        conn.execute("PRAGMA foreign_keys = OFF")
        cursor = conn.cursor()

        if has_expected_foreign_keys(cursor):
            print("proposta_logs já tem as ForeignKeys esperadas; nenhuma ação necessária.")
            conn.execute("PRAGMA foreign_keys = ON")
            return

        orphaned_propostas, orphaned_usuarios = find_orphaned_rows(cursor)
        if orphaned_propostas or orphaned_usuarios:
            print("ABORTADO: existem linhas em proposta_logs que ficariam inválidas com as novas FKs.")
            if orphaned_propostas:
                print(f"  - {len(orphaned_propostas)} linha(s) com proposta_id sem proposta correspondente: "
                      f"{[row[0] for row in orphaned_propostas]}")
            if orphaned_usuarios:
                print(f"  - {len(orphaned_usuarios)} linha(s) com usuario_id sem funcionário correspondente: "
                      f"{[row[0] for row in orphaned_usuarios]}")
            print("Resolva esses registros manualmente (ex.: corrigir ou apagar) antes de rodar esta migração.")
            conn.execute("PRAGMA foreign_keys = ON")
            return

        try:
            cursor.execute("BEGIN TRANSACTION")
            recreate_table_with_foreign_keys(conn)
            conn.commit()
            print("Tabela proposta_logs recriada com as ForeignKeys de proposta_id e usuario_id.")
        except Exception as exc:
            conn.rollback()
            raise RuntimeError(f"Falha ao recriar tabela proposta_logs: {exc}") from exc
        finally:
            conn.execute("PRAGMA foreign_keys = ON")


if __name__ == "__main__":
    main()
