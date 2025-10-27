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
from controllers.usuario_controller import bp as usuario_bp
from controllers.cliente_controller import bp as cliente_bp
from controllers.agendamento_controller import bp as agendamento_bp
from controllers.empresa_controller import bp as empresa_bp
from controllers.departamento_controller import bp as departamento_bp
from controllers.endereco_controllers import bp as endereco_bp
from controllers.servico_controller import bp as servico_bp, categoria_bp as categoria_servico_bp
from controllers.proposta_controller import bp as proposta_bp
from controllers.ordemServico_controller import bp as ordemServico_bp
from controllers.relatorio_controller import bp as relatorio_bp
from controllers.cargo_controller import bp as cargo_bp
from controllers.regime_tributario_controller import bp as regime_tributario_bp
from controllers.funcionarios_controller import bp as funcionarios_bp
from controllers.tipo_atividade_controller import bp as tipo_atividade_bp

# ✅ CONFIGURAR APLICAÇÃO DEPOIS DE IMPORTAR MODELOS
with app.app_context():
    try:
        db.create_all()
        print("✅ Tabelas criadas com sucesso!")
    except Exception as e:
        print(f"❌ Erro ao criar tabelas: {e}")

# Registrar blueprints
app.register_blueprint(usuario_bp)
app.register_blueprint(cliente_bp)
app.register_blueprint(agendamento_bp)
app.register_blueprint(empresa_bp)
app.register_blueprint(departamento_bp)
app.register_blueprint(endereco_bp)
app.register_blueprint(servico_bp)
app.register_blueprint(categoria_servico_bp)
app.register_blueprint(proposta_bp)
app.register_blueprint(ordemServico_bp)
app.register_blueprint(relatorio_bp)
app.register_blueprint(cargo_bp)
app.register_blueprint(regime_tributario_bp)
app.register_blueprint(funcionarios_bp)
app.register_blueprint(tipo_atividade_bp)

if __name__ == '__main__':
    app.run(debug=True, host='0.0.0.0', port=5000)