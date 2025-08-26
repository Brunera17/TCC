""" Lógica de negocio para geração de Ordens de Serviço """

from datetime import datetime
from typing import List, Optional
from config import db

class OrdemServico:
    """ Classe com métodos estáticos"""

    @staticmethod
    def gerar_numero_ordem_servico() -> str:
        """ Gera um número de ordem de serviço único """
        ano_atual = datetime.now().year

        ultima_ordem = db.session.query(OrdemServico)\
            .filter(OrdemServico.numero.like(f"{ano_atual}%"))\
            .order_by(OrdemServico.numero.desc())\
            .first()

        if ultima_ordem:
            try: 
                ultimo_numero = int(ultima_ordem.numero[-6:])
                proximo_numero = ultimo_numero + 1
            except ValueError:
                proximo_numero = 1
        else:
            proximo_numero = 1
        return f'{ano_atual}{proximo_numero:06d}'