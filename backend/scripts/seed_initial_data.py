"""Script de seed inicial para cadastros básicos.

Executa inserções idempotentes para tipos de atividade, regimes tributários,
faixas de faturamento, categorias e serviços padrão.
"""

from pathlib import Path
from typing import Dict
import sys

BASE_DIR = Path(__file__).resolve().parent.parent
if str(BASE_DIR) not in sys.path:
    sys.path.insert(0, str(BASE_DIR))

from sqlalchemy import or_

from config import app, db
from models import CategoriaServico, FaixaFaturamento, RegimeTributario, Servico, TipoAtividade

TIPOS_ATIVIDADE = (
    {
        "codigo": "SERV",
        "nome": "Serviços",
        "descricao": "Prestação de serviços em geral",
        "aplicavel_pj": True,
    },
    {
        "codigo": "COM",
        "nome": "Comércio",
        "descricao": "Atividades de comércio atacado e varejo",
        "aplicavel_pj": True,
    },
    {
        "codigo": "IND",
        "nome": "Indústria",
        "descricao": "Atividades industriais e de transformação",
        "aplicavel_pj": True,
    },
    {
        "codigo": "PF",
        "nome": "Pessoa Física",
        "descricao": "Serviços prestados por profissionais autônomos",
        "aplicavel_pj": False,
    },
)

REGIMES_TRIBUTARIOS = (
    {
        "codigo": "SN",
        "nome": "Simples Nacional",
        "descricao": "Regime simplificado para micro e pequenas empresas",
        "aplicavel_pj": True,
    },
    {
        "codigo": "LP",
        "nome": "Lucro Presumido",
        "descricao": "Tributação baseada em margem de lucro presumida",
        "aplicavel_pj": True,
    },
    {
        "codigo": "LR",
        "nome": "Lucro Real",
        "descricao": "Tributação apurada sobre o lucro contábil ajustado",
        "aplicavel_pj": True,
    },
    {
        "codigo": "MEI",
        "nome": "Microempreendedor Individual",
        "descricao": "Regime especial para MEI",
        "aplicavel_pj": True,
    },
    {
        "codigo": "AUT",
        "nome": "Autônomo",
        "descricao": "Tributação dedicada a profissionais autônomos",
        "aplicavel_pj": False,
    },
    {
        "codigo": "IRPF",
        "nome": "Imposto de Renda PF",
        "descricao": "Tributação padrão da pessoa física",
        "aplicavel_pj": False,
    },
    {
        "codigo": "PR",
        "nome": "Produtor Rural",
        "descricao": "Tributação específica para produtores rurais",
        "aplicavel_pj": False,
    },
    {
        "codigo": "DOM",
        "nome": "Empregador Doméstico",
        "descricao": "Obrigações de empregadores domésticos",
        "aplicavel_pj": False,
    },
    {
        "codigo": "CAT",
        "nome": "Cartório",
        "descricao": "Regime especial para cartórios",
        "aplicavel_pj": True,
    },
)

FAIXAS_FATURAMENTO = (
    {
        "descricao": "Até R$ 180 mil/ano",
        "valor_minimo": 0.0,
        "valor_maximo": 180000.0,
        "regime_codigo": "SN",
        "regime_nome": "Simples Nacional",
    },
    {
        "descricao": "Até R$ 360 mil/ano",
        "valor_minimo": 180000.01,
        "valor_maximo": 360000.0,
        "regime_codigo": "SN",
        "regime_nome": "Simples Nacional",
    },
    {
        "descricao": "Até R$ 720 mil/ano",
        "valor_minimo": 360000.01,
        "valor_maximo": 720000.0,
        "regime_codigo": "SN",
        "regime_nome": "Simples Nacional",
    },
    {
        "descricao": "Até R$ 4.8 milhões/ano",
        "valor_minimo": 720000.01,
        "valor_maximo": 4800000.0,
        "regime_codigo": "SN",
        "regime_nome": "Simples Nacional",
    },
    {
        "descricao": "Acima de R$ 4.8 milhões/ano",
        "valor_minimo": 4800000.01,
        "valor_maximo": None,
        "regime_codigo": "SN",
        "regime_nome": "Simples Nacional",
    },
)

CATEGORIAS_SERVICO = (
    {
        "nome": "Consultoria Contábil",
        "descricao": "Serviços recorrentes de contabilidade",
    },
    {
        "nome": "Fiscal e Tributário",
        "descricao": "Acompanhamento fiscal e apuração de tributos",
    },
    {
        "nome": "Departamento Pessoal",
        "descricao": "Rotinas trabalhistas e folha de pagamento",
    },
    {
        "nome": "Societário",
        "descricao": "Abertura, alteração e regularização societária",
    },
)

SERVICOS = (
    {
        "codigo": "CONT-MENS-001",
        "nome": "Contabilidade Completa Mensal",
        "descricao": "Escrituração contábil, conciliações e demonstrações mensais.",
        "valor_unitario": 1200.0,
        "regras_cobranca": "Mensal",
        "categoria": "Consultoria Contábil",
    },
    {
        "codigo": "FISC-APUR-001",
        "nome": "Apuração de Tributos",
        "descricao": "Apuração de impostos federais, estaduais e municipais.",
        "valor_unitario": 850.0,
        "regras_cobranca": "Mensal",
        "categoria": "Fiscal e Tributário",
    },
    {
        "codigo": "DP-FOLHA-001",
        "nome": "Processamento de Folha",
        "descricao": "Processamento completo da folha de pagamento até 20 colab.",
        "valor_unitario": 600.0,
        "regras_cobranca": "Mensal",
        "categoria": "Departamento Pessoal",
    },
    {
        "codigo": "SOC-ABERT-001",
        "nome": "Abertura de Empresa",
        "descricao": "Abertura e registro de empresa com acompanhamento fiscal.",
        "valor_unitario": 1800.0,
        "regras_cobranca": "Projeto",
        "categoria": "Societário",
    },
    {
        "codigo": "SOC-ALTER-001",
        "nome": "Alteração Contratual",
        "descricao": "Elaboração e protocolo de alterações societárias.",
        "valor_unitario": 950.0,
        "regras_cobranca": "Projeto",
        "categoria": "Societário",
    },
)


def _seed_tipos_atividade() -> int:
    novos = 0
    for item in TIPOS_ATIVIDADE:
        existente = (
            TipoAtividade.query.filter(
                or_(
                    TipoAtividade.codigo == item["codigo"],
                    TipoAtividade.nome == item["nome"],
                )
            ).first()
        )
        if existente:
            continue
        registro = TipoAtividade(
            codigo=item["codigo"],
            nome=item["nome"],
            descricao=item["descricao"],
            aplicavel_pj=item["aplicavel_pj"],
        )
        db.session.add(registro)
        novos += 1
    if novos:
        db.session.commit()
    return novos


def _seed_regimes_tributarios() -> int:
    novos = 0
    for item in REGIMES_TRIBUTARIOS:
        existente = (
            RegimeTributario.query.filter(
                or_(
                    RegimeTributario.codigo == item["codigo"],
                    RegimeTributario.nome == item["nome"],
                )
            ).first()
        )
        if existente:
            continue
        registro = RegimeTributario(
            codigo=item["codigo"],
            nome=item["nome"],
            descricao=item["descricao"],
            aplicavel_pj=item["aplicavel_pj"],
        )
        db.session.add(registro)
        novos += 1
    if novos:
        db.session.commit()
    return novos


def _seed_faixas_faturamento() -> int:
    novos = 0
    for item in FAIXAS_FATURAMENTO:
        existente = FaixaFaturamento.query.filter_by(descricao=item["descricao"]).first()
        regime_id = None
        regime_codigo = item.get("regime_codigo")
        regime_nome = item.get("regime_nome")
        if regime_codigo:
            regime = RegimeTributario.query.filter_by(codigo=regime_codigo).first()
            if not regime and regime_nome:
                regime = RegimeTributario.query.filter_by(nome=regime_nome).first()
            regime_id = regime.id if regime else None
        elif regime_nome:
            regime = RegimeTributario.query.filter_by(nome=regime_nome).first()
            regime_id = regime.id if regime else None

        if existente:
            atualizou = False
            if existente.regime_tributario_id is None and regime_id:
                existente.regime_tributario_id = regime_id
                atualizou = True
            if existente.valor_minimo != item["valor_minimo"] or existente.valor_maximo != item["valor_maximo"]:
                existente.valor_minimo = item["valor_minimo"]
                existente.valor_maximo = item["valor_maximo"]
                atualizou = True
            if not existente.ativo:
                existente.ativar()
                atualizou = True
            if atualizou:
                db.session.commit()
            continue
        registro = FaixaFaturamento(
            descricao=item["descricao"],
            valor_minimo=item["valor_minimo"],
            valor_maximo=item["valor_maximo"],
            regime_tributario_id=regime_id,
        )
        db.session.add(registro)
        novos += 1
    if novos:
        db.session.commit()
    return novos


def _seed_categorias_servico() -> Dict[str, CategoriaServico]:
    categorias = {}
    novos = 0
    for item in CATEGORIAS_SERVICO:
        existente = CategoriaServico.query.filter_by(nome=item["nome"]).first()
        if existente:
            categorias[item["nome"]] = existente
            continue
        registro = CategoriaServico(
            nome=item["nome"],
            descricao=item["descricao"],
        )
        db.session.add(registro)
        categorias[item["nome"]] = registro
        novos += 1
    if novos:
        db.session.commit()
    return categorias


def _seed_servicos(categorias: Dict[str, CategoriaServico]) -> int:
    novos = 0
    for item in SERVICOS:
        existente = (
            Servico.query.filter(
                or_(
                    Servico.codigo == item["codigo"],
                    Servico.nome == item["nome"],
                )
            ).first()
        )
        if existente:
            continue
        categoria = categorias.get(item["categoria"])
        if categoria is None:
            raise ValueError(f"Categoria '{item['categoria']}' não encontrada para o serviço {item['codigo']}")
        registro = Servico(
            codigo=item["codigo"],
            nome=item["nome"],
            descricao=item["descricao"],
            valor_unitario=item["valor_unitario"],
            regras_cobranca=item["regras_cobranca"],
            categoria=categoria,
        )
        db.session.add(registro)
        novos += 1
    if novos:
        db.session.commit()
    return novos


def run_seed() -> None:
    """Executa todas as cargas de dados."""
    db.create_all()

    adicionados_tipos = _seed_tipos_atividade()
    adicionados_regimes = _seed_regimes_tributarios()
    adicionados_faixas = _seed_faixas_faturamento()
    categorias = _seed_categorias_servico()
    adicionados_servicos = _seed_servicos(categorias)

    print("Seed executado com sucesso:")
    print(f" - Tipos de atividade inseridos: {adicionados_tipos}")
    print(f" - Regimes tributários inseridos: {adicionados_regimes}")
    print(f" - Faixas de faturamento inseridas: {adicionados_faixas}")
    print(f" - Categorias de serviço reconhecidas: {len(categorias)}")
    print(f" - Serviços inseridos: {adicionados_servicos}")


if __name__ == "__main__":
    with app.app_context():
        run_seed()
