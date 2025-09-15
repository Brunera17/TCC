from flask import Blueprint
from .agendamento_controller import bp as agendamento_bp
from .cliente_controller import bp as cliente_bp
from .empresa_controller import bp as empresa_bp
from .endereco_controllers import bp as endereco_bp
from .entidade_juridica_controller import bp as entidade_juridica_bp
from .ordemServico_controller import bp as ordem_servico_bp
from .proposta_controller import bp as proposta_bp
from .relatorio_controller import bp as relatorio_bp
from .usuario_controller import bp as usuario_bp
# se tiver outros, importe também:
# from .funcionario_controller import bp as funcionario_bp

def register_controllers(app):
    """Registra todos os blueprints da aplicação"""
    app.register_blueprint(agendamento_bp)
    app.register_blueprint(cliente_bp)
    app.register_blueprint(empresa_bp)
    app.register_blueprint(endereco_bp)
    app.register_blueprint(entidade_juridica_bp)
    app.register_blueprint(ordem_servico_bp)
    app.register_blueprint(proposta_bp)
    app.register_blueprint(relatorio_bp)
    app.register_blueprint(usuario_bp)
    # app.register_blueprint(funcionario_bp)
