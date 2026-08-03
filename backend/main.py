import os
from config import app, db

# ✅ IMPORTAR TODOS OS MODELOS NA ORDEM CORRETA
from models import (
    # Mixins base
    TimestampMixin, ActiveMixin,
    # Modelos organizacionais
    Empresa, Departamento, Cargo, Usuario,
    # Serviços
    CategoriaServico, Servico,
    # Clientes
    Cliente, Endereco,
    # Entidades Jurídicas
    RegimeTributario, FaixaFaturamento, TipoEmpresa, EntidadeJuridica,
    # Outros modelos
    Solicitacao, Relatorio, Agendamento,
    # Propostas e Ordens
    ItemProposta, Proposta, ItemOrdemServico, OrdemServico
)

# Importar controllers

from controllers import register_controllers

with app.app_context():
    try:
        db.create_all()
    except Exception as e:
        print(f"❌ Erro ao criar tabelas: {e}")


# Registrar todos os blueprints de forma centralizada
register_controllers(app)

if __name__ == '__main__':
        debug_mode = os.getenv('FLASK_DEBUG', 'false').lower() == 'true'
        host = os.getenv('FLASK_HOST', '127.0.0.1')
        app.run(debug=debug_mode, host=host, port=5000)
