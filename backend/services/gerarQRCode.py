"""Integração simples com Mercado Pago para gerar QR Code PIX."""

from __future__ import annotations

import base64
import os
import uuid
from io import BytesIO
from typing import Any, Dict, Optional

import mercadopago  # type: ignore
import qrcode  # type: ignore


class MercadoPagoQRCodeError(RuntimeError):
    """Falha ao gerar QR Code via Mercado Pago."""


def _resolver_access_token(access_token: Optional[str] = None) -> str:
    if access_token:
        return access_token

    candidatos = [
        os.getenv('MERCADOPAGO_ACCESS_TOKEN'),
        os.getenv('MERCADO_PAGO_ACCESS_TOKEN'),
        os.getenv('MP_ACCESS_TOKEN'),
    ]

    token = next((valor for valor in candidatos if valor), None)
    if token:
        return token

    arquivo_token = os.getenv('MERCADOPAGO_ACCESS_TOKEN_FILE')
    if arquivo_token and os.path.exists(arquivo_token):
        with open(arquivo_token, 'r', encoding='utf-8') as handle:
            conteudo = handle.read().strip()
            if conteudo:
                return conteudo

    raise MercadoPagoQRCodeError(
        "Token do Mercado Pago não configurado. Defina MERCADOPAGO_ACCESS_TOKEN,"
        " MERCADO_PAGO_ACCESS_TOKEN ou MP_ACCESS_TOKEN."
    )


def _criar_sdk(access_token: Optional[str]) -> mercadopago.SDK:  # type: ignore
    token = _resolver_access_token(access_token)
    return mercadopago.SDK(token)


def _sanitizar_base64(valor: str) -> str:
    return ''.join(valor.split())


def _converter_para_data_uri(valor: str) -> str:
    if valor.startswith('data:'):
        prefixo, _, conteudo = valor.partition('base64,')
        return f"{prefixo}base64,{_sanitizar_base64(conteudo)}"
    return f"data:image/png;base64,{_sanitizar_base64(valor)}"


def _gerar_png_base64(conteudo: str) -> str:
    imagem = qrcode.make(conteudo)
    buffer = BytesIO()
    imagem.save(buffer, format='PNG')
    return _sanitizar_base64(base64.b64encode(buffer.getvalue()).decode('ascii'))


def gerar_qrcode_pix(
    valor: float,
    descricao: str,
    *,
    email_pagador: str | None = None,
    nome_pagador: str | None = None,
    metadata: Optional[Dict[str, Any]] = None,
    access_token: Optional[str] = None,
) -> Dict[str, Any]:
    """Cria uma cobrança PIX no Mercado Pago e devolve dados úteis."""

    sdk = _criar_sdk(access_token)

    try:
        valor_float = float(valor)
    except (TypeError, ValueError) as exc:  # noqa: BLE001
        raise MercadoPagoQRCodeError('Valor da cobrança inválido.') from exc

    if valor_float <= 0:
        raise MercadoPagoQRCodeError('Valor da cobrança precisa ser maior que zero.')

    referencia_externa = str(uuid.uuid4())

    pagamento: Dict[str, Any] = {
        'transaction_amount': round(valor_float, 2),
        'description': descricao[:255],
        'payment_method_id': 'pix',
        'external_reference': referencia_externa,
    }

    payer: Dict[str, Any] = {}
    if email_pagador:
        payer['email'] = email_pagador
    if nome_pagador:
        payer['first_name'] = nome_pagador
    if payer:
        pagamento['payer'] = payer

    if metadata:
        pagamento['metadata'] = metadata

    resposta = sdk.payment().create(pagamento)
    status_codigo = resposta.get('status')
    corpo = resposta.get('response', {})

    if status_codigo != 201:
        raise MercadoPagoQRCodeError(f'API Mercado Pago retornou {status_codigo}: {corpo}')

    try:
        dados_transacao = corpo['point_of_interaction']['transaction_data']
    except KeyError as exc:
        raise MercadoPagoQRCodeError('Resposta do Mercado Pago sem dados do QR Code.') from exc

    copia_cola = dados_transacao.get('qr_code')
    if not copia_cola:
        raise MercadoPagoQRCodeError('Mercado Pago não retornou o texto do QR Code (qr_code).')

    base64_embutido = dados_transacao.get('qr_code_base64')
    if base64_embutido:
        imagem_data_uri = _converter_para_data_uri(base64_embutido)
    else:
        imagem_data_uri = f"data:image/png;base64,{_gerar_png_base64(copia_cola)}"

    return {
        'payment_id': corpo.get('id'),
        'status_pagamento': corpo.get('status'),
        'ticket_url': dados_transacao.get('ticket_url'),
        'expiracao': dados_transacao.get('expiration_date'),
        'copia_cola': copia_cola,
        'imagem_data_uri': imagem_data_uri,
        'valor': valor_float,
        'descricao': descricao,
        'external_reference': referencia_externa,
    }