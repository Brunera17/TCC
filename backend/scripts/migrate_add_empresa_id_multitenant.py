"""Migração: adiciona a coluna empresa_id (FK -> empresas.id) às tabelas
clientes, propostas, servicos, agendamentos e entidades_juridicas.

Contexto (issue #13): esses cinco modelos não tinham nenhum vínculo com
`Empresa` - qualquer usuário autenticado enxergava os dados de clientes de
qualquer empresa cadastrada no sistema. Os controllers foram corrigidos para
checar `empresa_id` antes de expor ou alterar esses recursos, mas a coluna
em si ainda não existe no banco: `db.create_all()` só cria tabelas novas,
nunca altera uma tabela existente para adicionar uma coluna.

Diferente das migrações anteriores deste projeto (que recriam a tabela
inteira via "rebuild and copy"), esta usa `ALTER TABLE ... ADD COLUMN` com
`NOT NULL DEFAULT <empresa_id>` e uma cláusula `REFERENCES` inline - o
SQLite permite isso desde que o default seja uma constante literal (o que
é o caso aqui: o id de uma linha de `empresas` já existente). Isso evita
recriar cinco tabelas por completo, com todo o risco de transcrição manual
de colunas/índices que isso implicaria.

Backfill: todas as linhas já existentes recebem o `empresa_id` da primeira
empresa cadastrada (ordenado por id). Isso é seguro no ambiente atual porque
há exatamente uma `Empresa` cadastrada; se um dia existir mais de uma no
momento em que este script rodar, ele avisa e ainda assim aplica esse
mesmo default (indicando que uma reatribuição manual pode ser necessária -
não há como inferir "a qual empresa este cliente já existente pertence"
a partir dos dados como estão hoje).

Uso:
    python scripts/migrate_add_empresa_id_multitenant.py

Idempotente: tabelas que já tiverem a coluna empresa_id são puladas.
"""
import sqlite3
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent.parent
DEFAULT_DB_PATH = BASE_DIR / "database.db"
INSTANCE_DB_PATH = BASE_DIR / "instance" / "database.db"

TABELAS = ["clientes", "propostas", "servicos", "agendamentos", "entidades_juridicas"]


def resolve_db_path() -> Path:
    if DEFAULT_DB_PATH.exists():
        return DEFAULT_DB_PATH
    if INSTANCE_DB_PATH.exists():
        return INSTANCE_DB_PATH
    return DEFAULT_DB_PATH


def tem_coluna_empresa_id(cursor: sqlite3.Cursor, tabela: str) -> bool:
    cursor.execute(f"PRAGMA table_info({tabela})")
    colunas = {row[1] for row in cursor.fetchall()}
    return "empresa_id" in colunas


def resolver_empresa_backfill(cursor: sqlite3.Cursor) -> int:
    cursor.execute("SELECT id FROM empresas ORDER BY id LIMIT 2")
    linhas = cursor.fetchall()

    if not linhas:
        raise RuntimeError(
            "Nenhuma empresa cadastrada em 'empresas'. Cadastre ao menos uma empresa "
            "antes de rodar esta migração - não há como preencher o empresa_id "
            "dos registros existentes sem isso."
        )

    if len(linhas) > 1:
        print(
            "AVISO: existe mais de uma empresa cadastrada. Todos os registros "
            f"existentes serão atribuídos à empresa id={linhas[0][0]} (a de menor id). "
            "Se isso não for o correto, reatribua manualmente depois."
        )

    return linhas[0][0]


def adicionar_coluna(cursor: sqlite3.Cursor, tabela: str, empresa_id_default: int) -> None:
    cursor.execute(
        f"ALTER TABLE {tabela} ADD COLUMN empresa_id INTEGER NOT NULL "
        f"DEFAULT {empresa_id_default} REFERENCES empresas(id) ON DELETE CASCADE"
    )
    cursor.execute(f"CREATE INDEX IF NOT EXISTS ix_{tabela}_empresa_id ON {tabela} (empresa_id)")


def main() -> None:
    db_path = resolve_db_path()
    if not db_path.exists():
        raise FileNotFoundError(
            "Banco de dados não encontrado. Verifique se 'database.db' está na raiz do projeto ou em 'instance/'."
        )

    with sqlite3.connect(db_path) as conn:
        conn.execute("PRAGMA foreign_keys = OFF")
        cursor = conn.cursor()

        pendentes = [t for t in TABELAS if not tem_coluna_empresa_id(cursor, t)]

        if not pendentes:
            print("Todas as tabelas já têm a coluna empresa_id; nenhuma ação necessária.")
            conn.execute("PRAGMA foreign_keys = ON")
            return

        empresa_id_default = resolver_empresa_backfill(cursor)

        try:
            cursor.execute("BEGIN TRANSACTION")
            for tabela in pendentes:
                adicionar_coluna(cursor, tabela, empresa_id_default)
                print(f"{tabela}: coluna empresa_id adicionada (backfill = {empresa_id_default}).")
            conn.commit()
        except Exception as exc:
            conn.rollback()
            raise RuntimeError(f"Falha ao adicionar coluna empresa_id: {exc}") from exc
        finally:
            conn.execute("PRAGMA foreign_keys = ON")

    print("Migração concluída.")


if __name__ == "__main__":
    main()
