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

def add_columns(db_path: Path) -> None:
    with sqlite3.connect(db_path) as conn:
        cursor = conn.cursor()

        if not column_exists(cursor, "regimes_tributarios", "aplicavel_pj"):
            cursor.execute(
                "ALTER TABLE regimes_tributarios ADD COLUMN aplicavel_pj INTEGER NOT NULL DEFAULT 1"
            )

        if not column_exists(cursor, "regimes_tributarios", "codigo"):
            cursor.execute(
                "ALTER TABLE regimes_tributarios ADD COLUMN codigo VARCHAR(20)"
            )

        conn.commit()

if __name__ == "__main__":
    db_path = resolve_db_path()
    if not db_path.exists():
        raise FileNotFoundError(
            "Banco de dados não encontrado nos caminhos padrões. "
            "Certifique-se de que o arquivo 'database.db' existe na raiz do projeto ou na pasta 'instance/'."
        )

    add_columns(db_path)
    print(f"Colunas aplicavel_pj e codigo garantidas em regimes_tributarios ({db_path}).")
