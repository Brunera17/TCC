from flask import Blueprint
from .agendamento_controller import bp as agendamento_bp
from .cliente_controller import bp as cliente_bp
from .empresa_controller import bp as empresa_bp
from .departamento_controller import bp as departamentos_bp
from .endereco_controllers import bp as endereco_bp
from .entidade_juridica_controller import bp as entidade_juridica_bp
from .ordemServico_controller import bp as ordem_servico_bp
from .cargo_controller import bp as cargos_bp
from .regime_tributario_controller import bp as regimes_tributarios_bp
from .tipo_atividade_controller import bp as tipos_atividade_bp
from .servico_controller import categoria_bp as categorias_servicos_bp
from .servico_controller import bp as servicos_bp
from .proposta_controller import bp as proposta_bp
from .relatorio_controller import bp as relatorio_bp
from .relatorio_controller import reports_bp
from .usuario_controller import bp as usuario_bp
from .funcionarios_controller import bp as funcionarios_bp
from .notificacao_controller import bp as notificacoes_bp
from .faixa_faturamento_controller import bp as faixa_faturamento_bp
from .mensalidade_controller import bp as mensalidades_bp

def register_controllers(app):
    """Registra todos os blueprints da aplicação"""
    app.register_blueprint(agendamento_bp)
    app.register_blueprint(cliente_bp)
    app.register_blueprint(empresa_bp)
    app.register_blueprint(departamentos_bp)
    app.register_blueprint(endereco_bp)
    app.register_blueprint(entidade_juridica_bp)
    app.register_blueprint(ordem_servico_bp)
    app.register_blueprint(cargos_bp)
    app.register_blueprint(regimes_tributarios_bp)
    app.register_blueprint(tipos_atividade_bp)
    app.register_blueprint(categorias_servicos_bp)
    app.register_blueprint(servicos_bp)
    app.register_blueprint(proposta_bp)
    app.register_blueprint(relatorio_bp)
    app.register_blueprint(reports_bp)
    app.register_blueprint(usuario_bp)
    app.register_blueprint(funcionarios_bp)
    app.register_blueprint(notificacoes_bp)
    app.register_blueprint(faixa_faturamento_bp)
    app.register_blueprint(mensalidades_bp)
