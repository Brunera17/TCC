import sqlite3
from pathlib import Path
from typing import Iterable

BASE_DIR = Path(__file__).resolve().parent.parent
DEFAULT_DB_PATH = BASE_DIR / "database.db"
INSTANCE_DB_PATH = BASE_DIR / "instance" / "database.db"

COLUMNS_TO_REMOVE = {"foto_nome", "foto_tipo", "foto_tamanho", "foto_binaria", "foto_atualizada_em"}
DESIRED_COLUMNS = [
    "id",
    "nome",
    "cpf",
    "email",
    "senha_hash",
    "username",
    "tipo_usuario",
    "foto",
    "eh_gerente",
    "status",
    "ultimo_login",
    "tentativas_login",
    "bloqueado_ate",
    "cargo_id",
    "created_at",
    "deleted_at",
    "updated_at",
    "ativo",
]


def resolve_db_path() -> Path:
    if DEFAULT_DB_PATH.exists():
        return DEFAULT_DB_PATH
    if INSTANCE_DB_PATH.exists():
        return INSTANCE_DB_PATH
    return DEFAULT_DB_PATH


def table_columns(cursor: sqlite3.Cursor, table: str) -> Iterable[str]:
    cursor.execute(f"PRAGMA table_info({table})")
    return [row[1] for row in cursor.fetchall()]


def needs_downgrade(cursor: sqlite3.Cursor) -> bool:
    existing = set(table_columns(cursor, "funcionarios"))
    return any(column in existing for column in COLUMNS_TO_REMOVE)


def recreate_table_without_extra_columns(conn: sqlite3.Connection) -> None:
    cursor = conn.cursor()
    existing_columns = table_columns(cursor, "funcionarios")

    missing = [column for column in DESIRED_COLUMNS if column not in existing_columns]
    if missing:
        raise RuntimeError(
            "Colunas necessárias ausentes na tabela funcionarios: " + ", ".join(missing)
        )

    columns_clause = ", ".join(DESIRED_COLUMNS)

    cursor.execute("DROP TABLE IF EXISTS funcionarios_new")

    cursor.execute(
        """
        CREATE TABLE IF NOT EXISTS funcionarios_new (
            id INTEGER PRIMARY KEY,
            nome VARCHAR(150) NOT NULL,
            cpf VARCHAR(11),
            email VARCHAR(150) NOT NULL,
            senha_hash VARCHAR(255) NOT NULL,
            username VARCHAR(50) NOT NULL,
            tipo_usuario VARCHAR(20) NOT NULL DEFAULT 'funcionario',
            foto VARCHAR(255),
            eh_gerente BOOLEAN NOT NULL DEFAULT 0,
            status VARCHAR(20) NOT NULL DEFAULT 'ativo',
            ultimo_login DATETIME,
            tentativas_login INTEGER NOT NULL DEFAULT 0,
            bloqueado_ate DATETIME,
            cargo_id INTEGER,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            deleted_at DATETIME,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            ativo BOOLEAN NOT NULL DEFAULT 1,
            FOREIGN KEY (cargo_id) REFERENCES cargos(id) ON DELETE SET NULL
        )
        """
    )

    cursor.execute(
        f"INSERT INTO funcionarios_new ({columns_clause}) SELECT {columns_clause} FROM funcionarios"
    )

    cursor.execute("DROP TABLE funcionarios")
    cursor.execute("ALTER TABLE funcionarios_new RENAME TO funcionarios")

    cursor.execute("CREATE INDEX IF NOT EXISTS ix_funcionarios_nome ON funcionarios (nome)")
    cursor.execute("CREATE UNIQUE INDEX IF NOT EXISTS ix_funcionarios_cpf ON funcionarios (cpf)")
    cursor.execute("CREATE UNIQUE INDEX IF NOT EXISTS ix_funcionarios_email ON funcionarios (email)")
    cursor.execute("CREATE UNIQUE INDEX IF NOT EXISTS ix_funcionarios_username ON funcionarios (username)")
    cursor.execute("CREATE INDEX IF NOT EXISTS ix_funcionarios_cargo_id ON funcionarios (cargo_id)")
    cursor.execute("CREATE INDEX IF NOT EXISTS ix_funcionarios_ativo ON funcionarios (ativo)")


def main() -> None:
    db_path = resolve_db_path()
    if not db_path.exists():
        raise FileNotFoundError(
            "Banco de dados não encontrado. Verifique se 'database.db' está na raiz do projeto or em 'instance/'."
        )

    with sqlite3.connect(db_path) as conn:
        conn.execute("PRAGMA foreign_keys = OFF")
        cursor = conn.cursor()

        if not needs_downgrade(cursor):
            print("Nenhuma coluna extra encontrada; nenhuma alteração realizada.")
            conn.execute("PRAGMA foreign_keys = ON")
            return

        try:
            cursor.execute("BEGIN TRANSACTION")
            recreate_table_without_extra_columns(conn)
            conn.commit()
            print("Tabela funcionarios recriada sem colunas de foto binária.")
        except Exception as exc:
            conn.rollback()
            raise RuntimeError(f"Falha ao recriar tabela funcionarios: {exc}") from exc
        finally:
            conn.execute("PRAGMA foreign_keys = ON")


if __name__ == "__main__":
    main()
