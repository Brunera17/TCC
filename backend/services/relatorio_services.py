from models.relatorio import Relatorio
from repositories.relatorio_repository import RelatorioRepository
from jinja2 import Environment, FileSystemLoader
import os

try:
    from models.cliente import Cliente
    MODELS_AVAILABLE = True
except Exception:
    MODELS_AVAILABLE = False

class RelatorioService:
    """ Serviço para gerenciar relatórios """
    
    def __init__(self):
        self.repo = RelatorioRepository()
        
    def get_all(self):
        return self.repo.get_all()
    def get_by_id(self, relatorio_id: int):
        return self.repo.get_by_id(relatorio_id)
    
    def criar_relatorio(self, **data):
        relatorio = Relatorio(**data)
        
        return self.repo.create(relatorio)
    def atualizar_relatorio(self, relatorio_id: int, **data):
        relatorio = self.repo.get_by_id(relatorio_id)
        
        if not relatorio:
            raise ValueError("Relatorio não encontrado")
        
        for key, value in data.items():
            setattr(relatorio, key, value)
        return self.repo.update(relatorio)
    
    def deletar_relatorio(self, relatorio_id: int):
        relatorio = self.repo.get_by_id(relatorio_id)
        
        if not relatorio:
            raise ValueError("Relatorio não encontrado")
        return self.repo.delete(relatorio)

    def gerar_relatorio_clientes_pdf(self) -> bytes:
        """Gera um PDF com informações analíticas e listagem de clientes.

        Retorna os bytes do PDF prontos para serem enviados em uma resposta HTTP.
        """
        if not MODELS_AVAILABLE:
            raise ValueError("Modelos não disponíveis - banco de dados não acessível")

        # Preparar ambiente Jinja
        template_dir = os.path.join(os.path.dirname(__file__), '..', 'templates')
        jinja_env = Environment(loader=FileSystemLoader(template_dir))

        # Coletar dados dos clientes
        try:
            clientes = Cliente.query.filter_by(ativo=True).all()
        except Exception as e:
            raise ValueError(f"Erro ao consultar clientes: {e}")

        clientes_list = []
        qtd_pj = 0
        qtd_pf = 0
        for c in clientes:
            try:
                cj = c.to_json()
            except Exception:
                cj = {
                    'id': getattr(c, 'id', None),
                    'nome': getattr(c, 'nome', None),
                    'cpf': getattr(c, 'cpf', None),
                    'email': getattr(c, 'email', None),
                }

            # identificar se tem entidade juridica vinculada
            is_pj = False
            try:
                entidades = getattr(c, 'entidades_juridicas', []) or []
                if len(list(entidades)) > 0:
                    is_pj = True
            except Exception:
                is_pj = False

            if is_pj:
                qtd_pj += 1
            else:
                qtd_pf += 1

            clientes_list.append({
                'id': cj.get('id'),
                'nome': cj.get('nome'),
                'cpf': cj.get('cpf_formatado') if cj.get('cpf_formatado') else cj.get('cpf'),
                'email': cj.get('email'),
                'telefone': cj.get('telefone'),
                'is_pj': is_pj,
            })

        total = len(clientes_list)

        # Separar em listas distintas para exibição em tabelas separadas (PJ e PF)
        clientes_pj = [c for c in clientes_list if c.get('is_pj')]
        clientes_pf = [c for c in clientes_list if not c.get('is_pj')]

        # Ordenar por nome para facilitar leitura
        clientes_pj.sort(key=lambda x: (x.get('nome') or '').lower())
        clientes_pf.sort(key=lambda x: (x.get('nome') or '').lower())

        template = jinja_env.get_template('relatorio_clientes.html')

        from datetime import datetime

        html = template.render(
            data_atual=datetime.now().strftime("%d/%m/%Y"),
            total=total,
            total_pf=qtd_pf,
            total_pj=qtd_pj,
            clientes_pj=clientes_pj,
            clientes_pf=clientes_pf,
        )

        # Gerar PDF usando weasyprint
        try:
            import weasyprint
            pdf_bytes = weasyprint.HTML(string=html).write_pdf()
            return pdf_bytes
        except Exception as e:
            raise ValueError(f"Erro ao gerar PDF: {e}")