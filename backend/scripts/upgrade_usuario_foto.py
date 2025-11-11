import sqlite3
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent.parent
DEFAULT_DB_PATH = BASE_DIR / "database.db"
INSTANCE_DB_PATH = BASE_DIR / "instance" / "database.db"


def resolve_db_path() -> Path:
    """Retorna o caminho do banco de dados, considerando os locais padrão."""
    if DEFAULT_DB_PATH.exists():
        return DEFAULT_DB_PATH
    if INSTANCE_DB_PATH.exists():
        return INSTANCE_DB_PATH
    return DEFAULT_DB_PATH


def column_exists(cursor: sqlite3.Cursor, table: str, column: str) -> bool:
    cursor.execute(f"PRAGMA table_info({table})")
    return any(row[1] == column for row in cursor.fetchall())


def add_usuario_foto_columns(db_path: Path) -> None:
    with sqlite3.connect(db_path) as conn:
        cursor = conn.cursor()

        columns = [
            ("foto_nome", "TEXT"),
            ("foto_tipo", "TEXT"),
            ("foto_tamanho", "INTEGER"),
            ("foto_binaria", "BLOB"),
            ("foto_atualizada_em", "DATETIME"),
        ]

        for column_name, column_type in columns:
            if not column_exists(cursor, "funcionarios", column_name):
                cursor.execute(
                    f"ALTER TABLE funcionarios ADD COLUMN {column_name} {column_type}"
                )

        conn.commit()


def migrate_existing_data(db_path: Path) -> None:
    """Opcionalmente migra registros existentes preenchendo foto_nome."""
    with sqlite3.connect(db_path) as conn:
        cursor = conn.cursor()

        if column_exists(cursor, "funcionarios", "foto") and column_exists(cursor, "funcionarios", "foto_nome"):
            cursor.execute(
                "UPDATE funcionarios SET foto_nome = COALESCE(foto_nome, foto) WHERE foto_nome IS NULL AND foto IS NOT NULL"
            )
        conn.commit()


if __name__ == "__main__":
    db_path = resolve_db_path()
    if not db_path.exists():
        raise FileNotFoundError(
            "Banco de dados não encontrado nos caminhos padrões. "
            "Certifique-se de que o arquivo 'database.db' existe na raiz do projeto ou na pasta 'instance/'."
        )

    add_usuario_foto_columns(db_path)
    migrate_existing_data(db_path)
    print(f"Colunas de foto garantidas na tabela funcionarios ({db_path}).")
