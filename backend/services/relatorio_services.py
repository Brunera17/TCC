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

    def gerar_relatorio_propostas(self) -> dict:
        """Gera um resumo analítico das propostas cadastradas.

        Retorna um dicionário com métricas: total, soma de valores, média, contagem por status,
        totais por status e top clientes por valor.
        """
        # Importar modelo localmente para evitar erros de importação fora do contexto
        try:
            from models.proposta import Proposta
        except Exception as e:
            raise ValueError(f"Modelos não disponíveis: {e}")

        try:
            propostas = Proposta.query.filter_by(ativo=True).all()
        except Exception as e:
            raise ValueError(f"Erro ao consultar propostas: {e}")

        total_count = len(propostas)
        total_value = sum((p.valor_total or 0.0) for p in propostas)
        avg_value = round((total_value / total_count) if total_count > 0 else 0.0, 2)

        counts_by_status = {}
        totals_by_status = {}
        clients_agg = {}  # chave: cliente_nome ou entidade_nome -> {'cliente_id', 'nome','total','count'}

        for p in propostas:
            status = getattr(p, 'status', 'unknown') or 'unknown'
            counts_by_status[status] = counts_by_status.get(status, 0) + 1
            totals_by_status[status] = round(totals_by_status.get(status, 0.0) + (p.valor_total or 0.0), 2)

            # identificar cliente/empresa responsável
            cliente_nome = None
            cliente_id = None
            if getattr(p, 'entidade_juridica', None):
                cliente_nome = getattr(p.entidade_juridica, 'nome_fantasia', None) or getattr(p.entidade_juridica, 'razao_social', None)
                cliente_id = getattr(p.entidade_juridica, 'id', None)
            elif getattr(p, 'cliente', None):
                cliente_nome = getattr(p.cliente, 'nome', None)
                cliente_id = getattr(p.cliente, 'id', None)
            else:
                cliente_nome = 'Sem cliente'

            key = f"{cliente_nome}::{cliente_id}"
            entry = clients_agg.get(key)
            if not entry:
                entry = {'cliente_id': cliente_id, 'nome': cliente_nome, 'total': 0.0, 'count': 0}
                clients_agg[key] = entry

            entry['total'] = round(entry['total'] + (p.valor_total or 0.0), 2)
            entry['count'] += 1

        # Top clientes por valor
        top_clients = sorted(clients_agg.values(), key=lambda x: x['total'], reverse=True)[:10]

        result = {
            'total_propostas': total_count,
            'total_valor': round(total_value, 2),
            'media_valor': avg_value,
            'contagem_por_status': counts_by_status,
            'totais_por_status': totals_by_status,
            'top_clientes': top_clients,
        }

        return result

    def gerar_relatorio_servicos(self) -> dict:
        """Gera um relatório agregando serviços usados nas propostas.

        Retorna um dicionário com métricas agregadas por serviço: quantidade total,
        receita total, média de valor unitário e quantas propostas incluíram o serviço.
        """
        try:
            from models.proposta import ItemProposta
            from models.servico import Servico
            from config import db
            from sqlalchemy import func, distinct
        except Exception as e:
            raise ValueError(f"Modelos não disponíveis: {e}")

        try:
            # Agregação por serviço: total_quantidade, total_receita, avg valor_unitario, count propostas distintas
            q = (
                db.session.query(
                    ItemProposta.servico_id.label('servico_id'),
                    func.coalesce(Servico.nome, Servico.codigo).label('nome'),
                    func.sum(ItemProposta.quantidade).label('total_quantidade'),
                    func.sum(ItemProposta.valor_total).label('total_receita'),
                    func.avg(ItemProposta.valor_unitario).label('media_valor_unitario'),
                    func.count(distinct(ItemProposta.proposta_id)).label('count_propostas')
                )
                .join(Servico, ItemProposta.servico_id == Servico.id, isouter=True)
                .filter(ItemProposta.ativo == True)
                .group_by(ItemProposta.servico_id)
            )

            rows = q.all()
        except Exception as e:
            raise ValueError(f"Erro ao consultar itens de proposta (SQL): {e}")

        lista = []
        total_itens = 0
        total_receita = 0.0
        for r in rows:
            sid = r.servico_id
            nome = r.nome
            tq = int(r.total_quantidade or 0)
            tr = float(r.total_receita or 0.0)
            mu = round(float(r.media_valor_unitario or 0.0), 2)
            cp = int(r.count_propostas or 0)
            lista.append({
                'servico_id': sid,
                'nome': nome,
                'total_quantidade': tq,
                'total_receita': round(tr, 2),
                'media_valor_unitario': mu,
                'count_propostas': cp
            })
            total_itens += tq
            total_receita += tr

        # ordenar por receita decrescente
        lista.sort(key=lambda x: x['total_receita'], reverse=True)

        resultado = {
            'total_servicos': len(lista),
            'total_itens': total_itens,
            'total_receita': round(total_receita, 2),
            'servicos': lista
        }

        return resultado

    def gerar_relatorio_financeiro(self) -> dict:
        """Gera um relatório financeiro baseado nas propostas.

        Retorna totais por status e detalhamento mensal (ano/mes) com soma de valores e contagens.
        """
        try:
            from models.proposta import Proposta
        except Exception as e:
            raise ValueError(f"Modelos não disponíveis: {e}")

        try:
            propostas = Proposta.query.filter_by(ativo=True).all()
        except Exception as e:
            raise ValueError(f"Erro ao consultar propostas: {e}")

        from collections import defaultdict
        from datetime import datetime

        totals_by_status = defaultdict(float)
        counts_by_status = defaultdict(int)
        monthly = defaultdict(lambda: {'total': 0.0, 'count': 0})
        total_valor = 0.0

        for p in propostas:
            status = getattr(p, 'status', 'unknown') or 'unknown'
            val = float(getattr(p, 'valor_total', 0.0) or 0.0)
            totals_by_status[status] = round(totals_by_status[status] + val, 2)
            counts_by_status[status] += 1
            total_valor += val

            # agrupar por mês/ano baseado na data de created_at ou data_aprovacao se disponível
            dt = getattr(p, 'data_aprovacao', None) or getattr(p, 'created_at', None)
            if dt:
                key = (dt.year, dt.month)
            else:
                key = ('unknown', 'unknown')

            monthly[key]['total'] = round(monthly[key]['total'] + val, 2)
            monthly[key]['count'] += 1

        # montar lista de períodos ordenada
        periodos = []
        for (y, m), v in monthly.items():
            if y == 'unknown':
                periodo = 'Sem data'
                ano = None
                mes = None
            else:
                periodo = f"{m:02d}/{y}"
                ano = y
                mes = m
            periodos.append({'ano': ano, 'mes': mes, 'periodo': periodo, 'total': v['total'], 'count': v['count']})

        periodos.sort(key=lambda x: (x['ano'] or 0, x['mes'] or 0), reverse=True)

        resultado = {
            'total_propostas': sum(counts_by_status.values()),
            'total_valor': round(total_valor, 2),
            'contagem_por_status': dict(counts_by_status),
            'totais_por_status': dict(totals_by_status),
            'periodos': periodos
        }

        return resultado

    def gerar_relatorio_agendamentos(self, inicio: str = None, fim: str = None) -> dict:
        """Gera relatório de agendamentos agregados por mês/ano e por conclusão.

        Retorna um dicionário com a chave 'periodos' contendo uma lista de períodos
        (cada período = mês/ano) com contagens: total, concluidos, nao_concluidos,
        contagem por status e, opcionalmente, por funcionario.
        """
        try:
            from models.agendamento import Agendamento
        except Exception as e:
            raise ValueError(f"Modelos não disponíveis: {e}")

        # construir query com filtros de data_inicio se fornecidos
        try:
            query = Agendamento.query.filter_by(ativo=True)

            from datetime import datetime, time, timedelta

            if inicio:
                try:
                    inicio_date = datetime.strptime(inicio, "%Y-%m-%d")
                except Exception:
                    raise ValueError("Parâmetro 'inicio' deve estar no formato YYYY-MM-DD")
                # considerar início do dia
                inicio_dt = datetime.combine(inicio_date.date(), time.min)
                query = query.filter(Agendamento.data_inicio >= inicio_dt)

            if fim:
                try:
                    fim_date = datetime.strptime(fim, "%Y-%m-%d")
                except Exception:
                    raise ValueError("Parâmetro 'fim' deve estar no formato YYYY-MM-DD")
                # considerar fim do dia (inclusivo)
                fim_dt = datetime.combine(fim_date.date(), time.max)
                query = query.filter(Agendamento.data_inicio <= fim_dt)

            agendamentos = query.all()
        except ValueError:
            # repassa erros de validação de formato
            raise
        except Exception as e:
            raise ValueError(f"Erro ao consultar agendamentos: {e}")

        from collections import defaultdict
        from datetime import datetime

        # chave (ano, mes) -> aggregation
        meses = defaultdict(lambda: {
            'total': 0,
            'concluidos': 0,
            'nao_concluidos': 0,
            'por_status': {},
            'por_funcionario': {}
        })

        for a in agendamentos:
            dt = getattr(a, 'data_inicio', None)
            if not dt:
                # colocar em período 'unknown'
                key = ('unknown', 'unknown')
            else:
                key = (dt.year, dt.month)

            entry = meses[key]
            entry['total'] += 1

            status = getattr(a, 'status', 'unknown') or 'unknown'
            entry['por_status'][status] = entry['por_status'].get(status, 0) + 1

            if status == 'concluido':
                entry['concluidos'] += 1
            else:
                entry['nao_concluidos'] += 1

            # Agregação por funcionário
            func = getattr(a, 'funcionario', None)
            if func and getattr(func, 'ativo', True):
                fid = getattr(func, 'id', None)
                fname = getattr(func, 'nome', None) or getattr(func, 'username', None) or f"Funcionario {fid}"
                pf = entry['por_funcionario'].get(fid)
                if not pf:
                    entry['por_funcionario'][fid] = {'funcionario_id': fid, 'nome': fname, 'total': 0, 'concluidos': 0}
                entry['por_funcionario'][fid]['total'] += 1
                if status == 'concluido':
                    entry['por_funcionario'][fid]['concluidos'] += 1

        # Transformar em lista ordenada por ano/mes decrescente
        periodos = []
        for (year, month), data in meses.items():
            if year == 'unknown':
                periodo_str = 'Sem data'
            else:
                periodo_str = f"{month:02d}/{year}"

            # transformar por_funcionario dict em lista
            pf_list = list(data['por_funcionario'].values())
            # ordenar funcionarios por total desc
            pf_list.sort(key=lambda x: x['total'], reverse=True)

            periodos.append({
                'ano': year if year != 'unknown' else None,
                'mes': month if month != 'unknown' else None,
                'periodo': periodo_str,
                'total': data['total'],
                'concluidos': data['concluidos'],
                'nao_concluidos': data['nao_concluidos'],
                'por_status': data['por_status'],
                'por_funcionario': pf_list,
            })

        # ordenar por ano/mes decrescente (ignorando 'Sem data')
        def sort_key(x):
            if x['ano'] is None:
                return (0, 0)
            return (int(x['ano']), int(x['mes']))

        periodos.sort(key=sort_key, reverse=True)

        resultado = {
            'total_periodos': len(periodos),
            'periodos': periodos,
            'total_agendamentos': sum(p['total'] for p in periodos)
        }

        return resultado

    def gerar_relatorio_agendamentos_pdf(self, inicio: str = None, fim: str = None) -> bytes:
        """Gera um PDF do relatório de agendamentos para o período opcionalmente fornecido."""
        # Obter os dados já formatados
        dados = self.gerar_relatorio_agendamentos(inicio=inicio, fim=fim)

        # Preparar template Jinja
        template_dir = os.path.join(os.path.dirname(__file__), '..', 'templates')
        jinja_env = Environment(loader=FileSystemLoader(template_dir))

        try:
            template = jinja_env.get_template('relatorio_agendamentos.html')
        except Exception as e:
            raise ValueError(f"Template de agendamentos não encontrado: {e}")

        from datetime import datetime
        html = template.render(data_atual=datetime.now().strftime("%d/%m/%Y"), **dados)

        # Gerar PDF com tratamento similar aos demais
        try:
            try:
                import weasyprint
            except ImportError as ie:
                raise ValueError(
                    "WeasyPrint não está instalado no ambiente Python. "
                    "Instale com `pip install weasyprint` ou verifique o virtualenv."
                ) from ie

            try:
                pdf_bytes = weasyprint.HTML(string=html).write_pdf()
                return pdf_bytes
            except Exception as e:
                msg = str(e)
                if 'could not import' in msg.lower() or 'external libraries' in msg.lower() or 'ffi' in msg.lower():
                    raise ValueError(
                        "WeasyPrint falhou ao carregar dependências nativas (cairo/pango/gdk-pixbuf). "
                        "Consulte https://doc.courtbouillon.org/weasyprint/stable/ para instruções de instalação."
                    ) from e
                raise ValueError(f"Erro ao gerar PDF de agendamentos: {e}") from e
        except Exception:
            # Repassa ValueError com mensagens já tratadas
            raise

    def gerar_relatorio_propostas_pdf(self) -> bytes:
        """Gera um PDF do relatório de propostas usando um template Jinja."""
        # Obter dados do relatório
        dados = self.gerar_relatorio_propostas()

        # Preparar ambiente Jinja
        template_dir = os.path.join(os.path.dirname(__file__), '..', 'templates')
        jinja_env = Environment(loader=FileSystemLoader(template_dir))

        try:
            template = jinja_env.get_template('relatorio_propostas.html')
        except Exception as e:
            raise ValueError(f"Template de propostas não encontrado: {e}")

        from datetime import datetime
        html = template.render(data_atual=datetime.now().strftime("%d/%m/%Y"), **dados)

        try:
            import weasyprint
        except ImportError as ie:
            # Mensagem mais instrutiva quando a biblioteca Python não está instalada
            raise ValueError(
                "WeasyPrint não está instalado no ambiente Python. "
                "Instale com `pip install weasyprint` ou verifique o virtualenv."
            ) from ie

        try:
            pdf_bytes = weasyprint.HTML(string=html).write_pdf()
            return pdf_bytes
        except Exception as e:
            # Detectar mensagens conhecidas de falta de bibliotecas nativas (cairo, pango, gdk-pixbuf)
            msg = str(e)
            if 'could not import' in msg.lower() or 'external libraries' in msg.lower() or 'ffi' in msg.lower():
                raise ValueError(
                    "WeasyPrint falhou ao carregar dependências nativas (cairo/pango/gdk-pixbuf). "
                    "Consulte https://doc.courtbouillon.org/weasyprint/stable/ para instruções de instalação."
                ) from e
            raise ValueError(f"Erro ao gerar PDF de propostas: {e}") from e

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

        clientes_pf = []
        # Para PJ list, usaremos as EntidadeJuridica ativas
        try:
            from models.entidadeJuridica import EntidadeJuridica
        except Exception as e:
            raise ValueError(f"Erro ao importar EntidadeJuridica: {e}")

        clientes_pj = []

        # Construir lista de pessoas físicas (todos os clientes), marcando se possuem empresa
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

            # identificar se tem entidade juridica vinculada (ativas)
            try:
                # entidades_juridicas é uma relação lazy='dynamic' em alguns modelos
                entidades_query = getattr(c, 'entidades_juridicas', None)
                if entidades_query is None:
                    possui_empresa = False
                    empresas_names = []
                else:
                    # quando for query, aplicar filtro por ativo
                    try:
                        empresas_ativas = entidades_query.filter_by(ativo=True).all()
                    except Exception:
                        # se for lista/iterável
                        empresas_ativas = [e for e in list(entidades_query) if getattr(e, 'ativo', True)]
                    possui_empresa = len(empresas_ativas) > 0
                    empresas_names = [getattr(e, 'nome_fantasia', getattr(e, 'razao_social', None)) for e in empresas_ativas]
            except Exception:
                possui_empresa = False
                empresas_names = []

            clientes_pf.append({
                'id': cj.get('id'),
                'nome': cj.get('nome'),
                'cpf': cj.get('cpf_formatado') if cj.get('cpf_formatado') else cj.get('cpf'),
                'email': cj.get('email'),
                'telefone': cj.get('telefone'),
                'possui_empresa': possui_empresa,
                'empresas': empresas_names,
            })

        # Construir lista de empresas (PJ) a partir de EntidadeJuridica ativas
        try:
            empresas = EntidadeJuridica.query.filter_by(ativo=True).all()
        except Exception as e:
            raise ValueError(f"Erro ao consultar entidades jurídicas: {e}")

        for emp in empresas:
            clientes_pj.append({
                'id': getattr(emp, 'id', None),
                'nome': getattr(emp, 'nome_fantasia', None) or getattr(emp, 'razao_social', None),
                'razao_social': getattr(emp, 'razao_social', None),
                'cnpj': getattr(emp, 'cnpj', None),
                'contato': getattr(emp, 'contato', None),
                'telefone': None,
                'cliente_id': getattr(emp, 'cliente_id', None),
            })

        total = len(clientes_pf)
        qtd_pf = len(clientes_pf)
        qtd_pj = len(clientes_pj)

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
        except ImportError as ie:
            raise ValueError(
                "WeasyPrint não está instalado no ambiente Python. "
                "Instale com `pip install weasyprint` ou verifique o virtualenv."
            ) from ie

        try:
            pdf_bytes = weasyprint.HTML(string=html).write_pdf()
            return pdf_bytes
        except Exception as e:
            msg = str(e)
            if 'could not import' in msg.lower() or 'external libraries' in msg.lower() or 'ffi' in msg.lower():
                raise ValueError(
                    "WeasyPrint falhou ao carregar dependências nativas (cairo/pango/gdk-pixbuf). "
                    "Consulte https://doc.courtbouillon.org/weasyprint/stable/ para instruções de instalação."
                ) from e
            raise ValueError(f"Erro ao gerar PDF: {e}") from e