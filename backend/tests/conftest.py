import os
import sys
import tempfile
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(BASE_DIR))

os.environ.setdefault('SECRET_KEY', 'test-secret-key')
os.environ.setdefault('REFRESH_SECRET_KEY', 'test-refresh-secret-key')
os.environ.setdefault('REDIS_REQUIRED', 'false')

# Usa um banco sqlite temporário e isolado, em vez do database.db real de
# desenvolvimento, para os testes poderem criar/consultar usuários livremente
# sem afetar (nem depender de) dados locais. Precisa ser definido antes de
# importar `config`: o Flask-SQLAlchemy cria/associa a engine já na
# inicialização (`SQLAlchemy(app)`), então mudar SQLALCHEMY_DATABASE_URI
# depois disso não tem efeito.
_TEST_DB_DIR = tempfile.mkdtemp(prefix='tcc-backend-tests-')
os.environ.setdefault('SQLALCHEMY_DATABASE_URI', f"sqlite:///{Path(_TEST_DB_DIR) / 'test.db'}")

import pytest


@pytest.fixture(scope='session')
def flask_app():
    import main
    main.app.config['TESTING'] = True
    return main.app


@pytest.fixture()
def client(flask_app):
    return flask_app.test_client()


@pytest.fixture()
def app_context(flask_app):
    with flask_app.app_context():
        yield flask_app
