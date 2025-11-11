"""Script para adicionar campos de configuração tributária à tabela propostas."""

from pathlib import Path
import sys

from sqlalchemy import inspect, text

ROOT_DIR = Path(__file__).resolve().parent.parent
if str(ROOT_DIR) not in sys.path:
    sys.path.insert(0, str(ROOT_DIR))

from config import app, db


def coluna_existe(tabela: str, coluna: str) -> bool:
    inspector = inspect(db.engine)
    return any(col["name"] == coluna for col in inspector.get_columns(tabela))


def adicionar_coluna(sql: str, descricao: str) -> None:
    try:
        db.session.execute(text(sql))
        db.session.commit()
        print(f"✅ {descricao}")
    except Exception as exc:  # pragma: no cover - execução manual
        db.session.rollback()
        print(f"❌ Falha ao {descricao}: {exc}")


def criar_indice(sql: str, descricao: str) -> None:
    try:
        db.session.execute(text(sql))
        db.session.commit()
        print(f"✅ {descricao}")
    except Exception as exc:  # pragma: no cover - execução manual
        db.session.rollback()
        print(f"❌ Falha ao {descricao}: {exc}")


def run() -> None:
    with app.app_context():
        if not coluna_existe("propostas", "tipo_atividade_id"):
            adicionar_coluna(
                "ALTER TABLE propostas ADD COLUMN tipo_atividade_id INTEGER REFERENCES tipos_atividade(id) ON DELETE SET NULL",
                "Adicionar coluna tipo_atividade_id",
            )
            criar_indice(
                "CREATE INDEX IF NOT EXISTS ix_propostas_tipo_atividade_id ON propostas(tipo_atividade_id)",
                "Criar índice ix_propostas_tipo_atividade_id",
            )
        else:
            print("ℹ️ Coluna tipo_atividade_id já existe")

        if not coluna_existe("propostas", "regime_tributario_id"):
            adicionar_coluna(
                "ALTER TABLE propostas ADD COLUMN regime_tributario_id INTEGER REFERENCES regimes_tributarios(id) ON DELETE SET NULL",
                "Adicionar coluna regime_tributario_id",
            )
            criar_indice(
                "CREATE INDEX IF NOT EXISTS ix_propostas_regime_tributario_id ON propostas(regime_tributario_id)",
                "Criar índice ix_propostas_regime_tributario_id",
            )
        else:
            print("ℹ️ Coluna regime_tributario_id já existe")

        if not coluna_existe("propostas", "faixa_faturamento_id"):
            adicionar_coluna(
                "ALTER TABLE propostas ADD COLUMN faixa_faturamento_id INTEGER REFERENCES faixas_faturamento(id) ON DELETE SET NULL",
                "Adicionar coluna faixa_faturamento_id",
            )
            criar_indice(
                "CREATE INDEX IF NOT EXISTS ix_propostas_faixa_faturamento_id ON propostas(faixa_faturamento_id)",
                "Criar índice ix_propostas_faixa_faturamento_id",
            )
        else:
            print("ℹ️ Coluna faixa_faturamento_id já existe")

        if not coluna_existe("propostas", "valor_mensalidade"):
            adicionar_coluna(
                "ALTER TABLE propostas ADD COLUMN valor_mensalidade FLOAT",
                "Adicionar coluna valor_mensalidade",
            )
        else:
            print("ℹ️ Coluna valor_mensalidade já existe")


if __name__ == "__main__":
    run()
