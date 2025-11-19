# Rota de Pagamento (PIX) com QR Code

Este documento descreve, em alto nível, como a geração e consumo do QR Code PIX foram implementados no backend do projeto.

## Arquivos principais envolvidos

- `backend/services/gerarQRCode.py` — função principal para criar a cobrança PIX e retornar dados do QR Code (texto copia-e-cola, imagem em base64, ticket URL, expiração, etc.).
- `backend/services/ordem_servico_pdf_service.py` — serviço que integra o pagamento PIX ao PDF da ordem e usa arquivos em `uploads/pix/` para cachear imagens/texto.
- `backend/controllers/ordemServico_controller.py` — controller que produz a ordem e integra geração do PDF/pagamento quando necessário.
- `backend/templates/ordem_servico_pdf.html` — template Jinja que exibe o QR Code e a cópia-e-cola no PDF.
- SDK Mercado Pago usado: `backend/venv/Lib/site-packages/mercadopago` (integração via `sdk.payment().create(...)`).

> Observação: caminhos mencionados aqui refletem a estrutura do repositório e permitem localizar a implementação completa.

## Visão geral do fluxo

1. A aplicação decide gerar uma cobrança PIX para uma ordem ou serviço (por exemplo, ao criar/emitir uma ordem de serviço).
2. É chamada a função `gerar_qrcode_pix` dentro de `backend/services/gerarQRCode.py` com parâmetros como `valor`, `descricao`, e (opcionalmente) dados do pagador.
3. A função cria um SDK/cliente do Mercado Pago (resolvendo o token de API) e monta o payload do pagamento:
   - `payment_method_id: 'pix'`
   - `transaction_amount` (valor)
   - `description`, `external_reference` (UUID para rastreabilidade)
   - `payer` com `email`/`name` quando disponíveis
4. A chamada é enviada ao Mercado Pago através do SDK: `sdk.payment().create(...)`.
5. O retorno do Mercado Pago contém, dentro de `point_of_interaction.transaction_data`, os campos relacionados ao QR:
   - `qr_code` (texto para copiar/colar)
   - `qr_code_base64` (imagem em base64) ou `ticket_url` (link com imagem)
   - `expiration_date`
6. A função processa esses dados e garante que retorne ao chamador um objeto com pelo menos:
   - `payment_id`, `status_pagamento`, `ticket_url`, `expiracao`, `copia_cola`, `imagem_data_uri`, `valor`, `descricao`, `external_reference`.
7. O `OrdemServicoPDFService` usa esse objeto para inserir a imagem (data URI) e a cópia-e-cola no template do PDF. Ele também verifica se já existe um cache em `uploads/pix/` (ex.: `ordem_<id>_pix.png` / `.txt`) para evitar novas chamadas externas.
8. Opcionalmente, a aplicação persiste referências ao pagamento (payment id, status, expiração) para reconciliação.

## Tratamento de erros e validações

- A função valida dados locais antes de chamar a API (ex.: `valor > 0`).
- Em caso de resposta inesperada ou erro do SDK/API, é lançada uma exceção (ex.: `MercadoPagoQRCodeError`) com detalhes para logging e retorno apropriado ao cliente.
- Quando o SDK retorna base64 inválido ou ausente, a implementação tenta gerar/normalizar a imagem localmente ou usar `ticket_url`.

## Cache/local files

- Para evitar novas chamadas na geração de PDFs, o serviço verifica e utiliza arquivos em `uploads/pix/`:
  - `uploads/pix/ordem_<id>_pix.png` — imagem do QR gerada/salva
  - `uploads/pix/ordem_<id>_pix.txt` — texto copia-e-cola
- Se os arquivos existem e são válidos, eles são lidos e incorporados ao contexto do template do PDF.

## Exemplo de uso (trecho simplificado)

```py
from services.gerarQRCode import gerar_qrcode_pix

pagamento = gerar_qrcode_pix(valor=123.45, descricao=f"Ordem #{ordem.id}")
# pagamento contém 'imagem_data_uri' e 'copia_cola' para render no PDF
```

## Recomendações e observações finais

- Sempre proteger tokens de API (usar variáveis de ambiente / `config.py`).
- Registrar os `external_reference` (UUID) para facilitar conciliação e auditoria.
- Testar fluxos de expiração e revogação (caso a API do PSP suporte cancelamento de cobranças).
- Validar a sensação visual do QR no PDF gerado (tamanho/resolução); ao gerar a PNG localmente, garantir DPI adequado.

## Links rápidos (arquivos referenciados)

- `backend/services/gerarQRCode.py` — função principal: `gerar_qrcode_pix`
- `backend/services/ordem_servico_pdf_service.py` — integração do PIX com o PDF
- `backend/controllers/ordemServico_controller.py` — endpoints de ordem de serviço
- `backend/templates/ordem_servico_pdf.html` — template que rende o QR e cópia-e-cola

---

## Exemplos de payloads (Mercado Pago)

Abaixo há exemplos simplificados — request enviado ao endpoint de criação de pagamento (via SDK) e resposta típica contendo os dados do QR. Strings longas (ex.: base64) foram truncadas para legibilidade.

Request (payload enviado para criar o pagamento PIX):

```json
{
   "transaction_amount": 123.45,
   "description": "Ordem #123",
   "payment_method_id": "pix",
   "external_reference": "a1b2c3d4-uuid",
   "payer": {
      "email": "cliente@example.com",
      "first_name": "Fulano",
      "last_name": "da Silva"
   },
   "metadata": {
      "ordem_id": 123
   }
}
```

Resposta típica do Mercado Pago (parcial, campos relevantes):

```json
{
   "id": 987654321,
   "status": "pending",
   "status_detail": "pending_waiting_payment",
   "transaction_amount": 123.45,
   "payment_method_id": "pix",
   "external_reference": "a1b2c3d4-uuid",
   "date_created": "2025-11-19T12:34:56.000-00:00",
   "point_of_interaction": {
      "type": "PIX",
      "transaction_data": {
         "qr_code": "000201...52040000...copiacola...",
         "qr_code_base64": "iVBORw0KGgoAAAANSUhEUgAA... (base64 truncated)",
         "ticket_url": "https://http2.mlstatic.com/instore/qr/V1/....png",
         "expiration_date": "2025-11-20T12:34:56.000-00:00"
      }
   },
   "payer": {
      "email": "cliente@example.com"
   }
}
```

Formato retornado pela função `gerar_qrcode_pix` (exemplo simplificado):

```json
{
   "payment_id": 987654321,
   "status_pagamento": "pending",
   "ticket_url": "https://http2.mlstatic.com/instore/qr/V1/....png",
   "expiracao": "2025-11-20T12:34:56.000-00:00",
   "copia_cola": "000201...52040000...",
   "imagem_data_uri": "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAA...",
   "valor": 123.45,
   "descricao": "Ordem #123",
   "external_reference": "a1b2c3d4-uuid"
}
```

Notas:

- `qr_code` (copia-e-cola) é a string que pode ser exibida para o pagador caso a imagem não esteja disponível.
- `qr_code_base64` / `ticket_url` podem vir alternadamente; a implementação normaliza ambos e gera `imagem_data_uri` para incorporar no PDF.
- Sempre trate `expiration_date` para não exibir QR vencido no PDF final.

Documento gerado automaticamente pelo assistente de desenvolvimento. Se quiser que eu adicione um script de teste (Python ou cURL) que chama a função e valida os campos, diga qual formato prefere.
