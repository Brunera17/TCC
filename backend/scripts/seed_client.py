"""Script utilitário para inserir um cliente de exemplo (PF + Entidade Jurídica) no banco.

Execute a partir da raiz do projeto:
    python ./scripts/seed_client.py

O script usa o contexto da aplicação (`config.app`) e cria as entidades.
"""

import os
import sys

# Garantir que a raiz do projeto esteja no sys.path quando executado diretamente
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from config import app, db
from models.cliente import Cliente, Endereco
from models.entidadeJuridica import EntidadeJuridica, TipoEmpresa, RegimeTributario

DATA = {
    "cliente": {
        "nome": "Carlos Henrique da Silva",
        "cpf": "12345678901",
        "email": "carlos.silva@example.com",
        "telefone": "11987654321",
        "endereco": "Rua das Palmeiras, 120",
        "ativo": 1,
        "observacoes": "Cliente antigo, prefere contato por e-mail."
    },
    "endereco": {
        "logradouro": "Rua das Palmeiras",
        "numero": "120",
        "complemento": "Apto 301",
        "bairro": "Centro",
        "cidade": "São Paulo",
        "estado": "SP",
        "ativo": 1,
        "cep": "01001000"
    },
    "entidade_juridica": {
        "razao_social": "TechSmart Soluções em TI LTDA",
        "nome_fantasia": "TechSmart",
        "cnpj": "12345678000195",
        "contato": "contato@techsmart.com.br",
        "status": "ativa",
        "inscricao_estadual": "123456789012",
        "tipo_id": 1,
        "ativo": 1,
        "regime_tributario_id": 1
    }
}


def seed():
    with app.app_context():
        try:
            # Verificar se o cliente já existe (idempotência)
            cdata = DATA['cliente']
            cpf_clean = reformat_digits(cdata.get('cpf'))
            cliente = None
            if cpf_clean:
                cliente = Cliente.query.filter_by(cpf=cpf_clean).first()

            if cliente:
                print(f"Cliente com CPF={cpf_clean} já existe (id={cliente.id}), reutilizando registro.")
                # Opcional: podemos atualizar campos se desejado
                cliente.nome = cdata.get('nome') or cliente.nome
                cliente.email = cdata.get('email') or cliente.email
                cliente.telefone = reformat_digits(cdata.get('telefone')) if cdata.get('telefone') else cliente.telefone
                cliente.endereco = cdata.get('endereco') or cliente.endereco
                cliente.observacoes = cdata.get('observacoes') or cliente.observacoes
                # Garantir que o registro esteja ativo
                if not getattr(cliente, 'ativo', True):
                    cliente.ativo = True
                    # limpar campo deleted_at se existir
                    if hasattr(cliente, 'deleted_at'):
                        cliente.deleted_at = None
                db.session.add(cliente)
                db.session.flush()
            else:
                # Criar cliente
                cliente = Cliente(
                    nome=cdata['nome'],
                    cpf=cpf_clean,
                    email=cdata.get('email'),
                    telefone=reformat_digits(cdata.get('telefone')) if cdata.get('telefone') else None,
                    endereco=cdata.get('endereco'),
                    observacoes=cdata.get('observacoes')
                )
                db.session.add(cliente)
                db.session.flush()  # Gera id do cliente

            # Criar ou reutilizar endereço vinculado ao cliente
            ed = DATA['endereco']
            cep_clean = reformat_digits(ed.get('cep')) if ed.get('cep') else None
            endereco = Endereco.query.filter_by(cliente_id=cliente.id, logradouro=ed['logradouro'], numero=ed['numero']).first()
            if endereco:
                print(f"Endereço já existe para cliente id={cliente.id} (endereco id={endereco.id}), reutilizando.")
                # Reativar endereço caso esteja desativado
                if not getattr(endereco, 'ativo', True):
                    endereco.ativo = True
                    if hasattr(endereco, 'deleted_at'):
                        endereco.deleted_at = None
                    db.session.add(endereco)
            else:
                endereco = Endereco(
                    logradouro=ed['logradouro'],
                    numero=ed['numero'],
                    complemento=ed.get('complemento'),
                    bairro=ed.get('bairro'),
                    cidade=ed.get('cidade'),
                    estado=ed.get('estado'),
                    cep=cep_clean,
                    cliente_id=cliente.id
                )
                db.session.add(endereco)
                db.session.flush()

            # Vincular endereco ao cliente (se necessário)
            # cliente.endereco = endereco # campo opcional no modelo

            # Criar entidade juridica vinculada ao cliente
            ej = DATA['entidade_juridica']

            # Verificar se tipo_id e regime_tributario_id existem
            tipo_id = ej.get('tipo_id')
            regime_id = ej.get('regime_tributario_id')

            tipo_exists = None
            regime_exists = None
            created_tipo = False
            created_regime = False

            # Tentar buscar os registros indicados
            if tipo_id:
                tipo_exists = TipoEmpresa.query.get(tipo_id)
                # Se não existir, criar um registro padrão com o mesmo id (quando possível)
                if not tipo_exists:
                    try:
                        tipo_exists = TipoEmpresa(id=tipo_id, nome=f"Tipo {tipo_id}", descricao="Criado automaticamente")
                        db.session.add(tipo_exists)
                        db.session.flush()
                        created_tipo = True
                        print(f"TipoEmpresa id={tipo_id} criado automaticamente.")
                    except Exception as e:
                        db.session.rollback()
                        print(f"Falha ao criar TipoEmpresa id={tipo_id}: {e}")
                        tipo_exists = None

            if regime_id:
                regime_exists = RegimeTributario.query.get(regime_id)
                if not regime_exists:
                    try:
                        regime_exists = RegimeTributario(id=regime_id, codigo=f"R{regime_id}", nome=f"Regime {regime_id}", descricao="Criado automaticamente")
                        db.session.add(regime_exists)
                        db.session.flush()
                        created_regime = True
                        print(f"RegimeTributario id={regime_id} criado automaticamente.")
                    except Exception as e:
                        db.session.rollback()
                        print(f"Falha ao criar RegimeTributario id={regime_id}: {e}")
                        regime_exists = None

            # Criar ou reutilizar entidade juridica
            cnpj_clean = reformat_digits(ej.get('cnpj')) if ej.get('cnpj') else None
            entidade = None
            if cnpj_clean:
                entidade = EntidadeJuridica.query.filter_by(cnpj=cnpj_clean).first()

            if entidade:
                print(f"Entidade jurídica com CNPJ={cnpj_clean} já existe (id={entidade.id}), vincular ao cliente se necessário.")
                # Atualizar vínculo se necessário
                if entidade.cliente_id != cliente.id:
                    entidade.cliente_id = cliente.id
                    db.session.add(entidade)
                # Reativar entidade caso esteja desativada
                if not getattr(entidade, 'ativo', True):
                    entidade.ativo = True
                    if hasattr(entidade, 'deleted_at'):
                        entidade.deleted_at = None
                    db.session.add(entidade)
            else:
                entidade = EntidadeJuridica(
                    razao_social=ej['razao_social'],
                    nome_fantasia=ej['nome_fantasia'],
                    cnpj=cnpj_clean,
                    contato=ej.get('contato'),
                    status=ej.get('status') or 'ativa',
                    inscricao_estadual=ej.get('inscricao_estadual'),
                    cliente_id=cliente.id,
                    endereco_id=endereco.id if endereco and getattr(endereco, 'id', None) else None,
                    tipo_id=tipo_exists.id if tipo_exists else None,
                    regime_tributario_id=regime_exists.id if regime_exists else None
                )
                db.session.add(entidade)
            db.session.commit()

            print(f"Finalizado: cliente id={cliente.id} e entidade_juridica id={entidade.id if entidade else 'N/A'}")
            if not tipo_exists:
                print(f"Aviso: TipoEmpresa id={tipo_id} não encontrado; campo tipo_id gravado como NULL")
            if not regime_exists:
                print(f"Aviso: RegimeTributario id={regime_id} não encontrado; campo regime_tributario_id gravado como NULL")

        except Exception as e:
            db.session.rollback()
            print("Erro ao inserir dados:", e)


def reformat_digits(value: str) -> str:
    if not value:
        return value
    return ''.join(ch for ch in value if ch.isdigit())


if __name__ == '__main__':
    seed()
