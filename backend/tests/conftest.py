import os
import sys
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(BASE_DIR))

os.environ.setdefault('SECRET_KEY', 'test-secret-key')
os.environ.setdefault('REFRESH_SECRET_KEY', 'test-refresh-secret-key')
os.environ.setdefault('REDIS_REQUIRED', 'false')

import pytest


@pytest.fixture(scope='session')
def flask_app():
    import main
    main.app.config['TESTING'] = True
    return main.app


@pytest.fixture()
def client(flask_app):
    return flask_app.test_client()
