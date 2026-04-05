# Manual de Integracao Neofim - Conexao Danca

> Documento canonico de referencia para a integracao com a API da Neofim.
> Toda alteracao no `neofinClient.ts`, `neofinProvider.ts` ou rotas relacionadas deve ser validada contra este manual.

---

## 1. Visao Geral

A Neofim e a plataforma de cobranca utilizada para gerar boletos e PIX das mensalidades dos alunos. A integracao funciona de forma **assincrona em lote**: os billings sao enfileirados via API e processados automaticamente uma vez por dia as **23h30**.

### Premissas criticas

| Premissa | Detalhe |
|---|---|
| Processamento | 1x por dia as 23h30 |
| Execucao extra | R$ 199,00 por chamada |
| Periodo retroativo inicial | Ate 2 meses sem custo |
| Retorno do POST | Nunca retorna dados do billing - apenas confirmacao de fila |
| Billing disponivel para consulta | Somente **apos** o processamento das 23h30 |
| Maximo por requisicao | 50 billings por POST |
| Rate limit | Nenhum |

### Ambientes

| Ambiente | URL Base |
|---|---|
| Producao | `https://api.neofin.services` |
| Sandbox | `https://api.sandbox.neofin.services` |

### Autenticacao

Todos os endpoints exigem dois headers:

```text
api-key: {NEOFIN_API_KEY}
secret-key: {NEOFIN_SECRET_KEY}
```

As chaves ficam nas variaveis de ambiente da Vercel. **Nunca expor em codigo ou imagens.**

---

## 2. Fluxo de Cobranca no Sistema

```text
Fatura fechada
    ↓
processarCobrancaCanonicaFatura()
    ↓
neofinProvider.ts -> monta payload
    ↓
neofinClient.ts -> POST /billing/
    ↓
Neofim responde: "Billings successfully queued." (202)
    ↓
[aguarda ate 23h30]
    ↓
Neofim processa em lote
    ↓
Polling (a cada 6h via cron) consulta GET /billing/integration/{identifier}
    ↓
Salva billing_number, billing_url, link_pagamento no banco
    ↓
Aluno recebe link de pagamento
```

### Por que o billing fica em 404 logo apos o envio?

Isso e comportamento esperado. O POST retorna 202 "queued" mas o billing so e criado no banco da Neofim apos o processamento das 23h30. Qualquer consulta antes disso retornara 404 - **nao e erro do sistema**.

---

## 3. Criar ou Atualizar Billing (Upsert)

### Endpoint

```text
POST /billing/
```

### Comportamento

- Se o `integration_identifier` nao existir na Neofim -> **cria** novo billing
- Se o `integration_identifier` ja existir -> **atualiza** o billing existente
- O retorno **nunca** inclui dados do billing criado, apenas confirmacao de fila
- Billings com `integration_identifier` de billing **cancelled** precisam de novo identifier com sufixo (ex: `fatura-123-r{timestamp}`)

### Payload completo (nosso padrao atual)

```json
{
  "billings": [
    {
      "integration_identifier": "fatura-credito-conexao-{id}",
      "type": "bolepix",
      "amount": 30800,
      "due_date": 1773273600,
      "issued_at": 1773273600,
      "original_due_date": 1773273600,
      "description": "Mensalidade Conexao Danca - {periodo} - Fatura #{id}",
      "customer_document": "17376793291",
      "customer_name": "Nome do Aluno",
      "customer_mail": "email@exemplo.com",
      "customer_phone": "+5591980507265",
      "address_street": "Rua Osvaldo Cruz",
      "address_number": "48",
      "address_complement": "",
      "address_neighborhood": "Prainha",
      "address_city": "Salinopolis",
      "address_state": "PA",
      "address_zip_code": "68721000",
      "discount_before_payment": 0,
      "discount_before_payment_due_date": 0,
      "fees": 0.0333,
      "fine": 2,
      "installments": 1,
      "installment_type": "monthly",
      "nfe_number": "",
      "recipients": [],
      "boleto_base64": "",
      "code": "",
      "hash": "",
      "ignore_existing_customer_upsert": false,
      "payee_name": "",
      "payee_document": "",
      "by_mail": false,
      "by_whatsapp": true
    }
  ]
}
```

### Campos obrigatorios

| Campo | Tipo | Observacao |
|---|---|---|
| `customer_document` | String | CPF (11 digitos) ou CNPJ (14 digitos), sem pontuacao |
| `customer_name` | String | Nome completo |
| `customer_mail` | String | E-mail valido |
| `customer_phone` | String | Com DDI: `+5591...` |
| `address_city` | String | Cidade |
| `address_complement` | String | Obrigatorio - enviar string vazia se nao houver |
| `address_neighborhood` | String | Bairro |
| `address_number` | String | Numero |
| `address_state` | String | Sigla UF (ex: `PA`) |
| `address_street` | String | Logradouro |
| `address_zip_code` | String | CEP sem traco (ex: `68721000`) |
| `amount` | Number | Valor em **centavos** (ex: R$ 308,00 -> `30800`) |
| `type` | String | Ver tipos abaixo |
| `due_date` | Number | Unix Timestamp em segundos |
| `issued_at` | Number | Unix Timestamp - data de emissao |
| `fees` | Number | Juros mensais em % (ex: `0.0333` para 1%/mes) |
| `fine` | Number | Multa por atraso em % (ex: `2`) |
| `installment_type` | String | `monthly`, `weekly`, `biweekly` ou `custom` |
| `installments` | Number | Numero de parcelas (normalmente `1`) |
| `discount_before_payment` | Number | Desconto antecipado em % (enviar `0` se nao houver) |
| `discount_before_payment_due_date` | Number | Dias antes para desconto (enviar `0`) |
| `by_mail` | Boolean | Obsoleto - enviar `false` |
| `by_whatsapp` | Boolean | Obsoleto - enviar `true` |
| `integration_identifier` | String | ID unico da cobranca no nosso sistema |

### Tipos de pagamento (`type`)

| Valor | Descricao | Usar quando |
|---|---|---|
| `bolepix` | Boleto + PIX (o aluno escolhe) | **Padrao para mensalidades** |
| `boleto` | Apenas boleto | - |
| `pix` | Apenas PIX | - |
| `tedin` | TED bancario | - |
| `pixin` | Chave PIX | - |
| `credit_card` | Cartao de credito | Cobrancas recorrentes |
| `generic` | Boleto externo | Quando o boleto e gerado fora da Neofim |

> **PIX esta incluso no `bolepix`:** o tipo `bolepix` gera automaticamente tanto o codigo de barras quanto o QR Code PIX. O campo `paid_method` no retorno dos webhooks indica qual foi usado (`pix` ou `boleto`).

### Tipos de parcelamento (`installment_type`)

| Valor | Comportamento |
|---|---|
| `monthly` | Neofim calcula vencimentos mensais automaticamente |
| `weekly` | Vencimentos semanais |
| `biweekly` | Vencimentos quinzenais |
| `custom` | Voce define cada parcela em `installments_data` |

> Para mensalidades com `installments: 1`, usar sempre `monthly`.

### Campos editaveis via upsert

Quando o `integration_identifier` ja existe, estes campos podem ser atualizados: `amount`, `due_date`, `type`, `fees`, `fine`, `customer_mail`, `customer_name`, `customer_phone`, `address_*`, `discount_before_payment`, `installment_type`, `installments`, `recipients`.

### Retorno esperado

```json
{
  "message": "Billings successfully queued.",
  "errors": {}
}
```

**HTTP 202** - sempre. Nunca retorna dados do billing.

---

## 4. Buscar Billing

### Por Integration Identifier (nosso padrao)

```text
GET /billing/integration/{integration_identifier}
```

> Este e o endpoint correto para buscar por nosso ID interno. **Nao usar** `GET /billing/{id}` para isso - aquele e exclusivo para o `billing_number` numerico da Neofim.

```bash
curl --location 'https://api.neofin.services/billing/integration/fatura-credito-conexao-265' \
  --header 'api-key: {NEOFIN_API_KEY}' \
  --header 'secret-key: {NEOFIN_SECRET_KEY}'
```

### Por Billing Number (ID numerico da Neofim)

```text
GET /billing/{billing_number}
```

```bash
curl --location 'https://api.neofin.services/billing/38078456634432' \
  --header 'api-key: {NEOFIN_API_KEY}' \
  --header 'secret-key: {NEOFIN_SECRET_KEY}'
```

### Resposta (200 OK)

```json
{
  "billing_number": "38078456634432",
  "billing_url": "https://app.neofin.com.br/pay?billing=38078456634432",
  "integration_identifier": "fatura-credito-conexao-265",
  "status": "pending",
  "amount": 30800,
  "due_date": 1773273600,
  "customer_name": "Raimundo Nonato Barbosa Pessoa",
  "customer_document": "17376793291",
  "type": "bolepix",
  "payments": []
}
```

### Status possiveis

| Status | Significado |
|---|---|
| `processing` | Sendo criado (logo apos o processamento das 23h30) |
| `pending` | Em aberto, aguardando pagamento |
| `overdue` | Vencido |
| `payment_approved` | Pagamento aprovado |
| `paid` | Pago integralmente |
| `cancelled` | Cancelado |
| `cancelling` | Em processo de cancelamento |
| `deleted` | Removido da visao do cliente (permanece no sistema) |
| `renegotiated` | Renegociado |

### Erros

| HTTP | Significado |
|---|---|
| 404 | Billing nao encontrado - pode ainda estar em fila aguardando as 23h30 |
| 403 | API Key invalida |
| 500 | Erro interno na Neofim |

---

## 5. Marcar como Pago

### Baixa total (V1 - por integration_identifier)

```text
PUT /billing/paid/{integration_identifier}
```

Usado para tipo `generic` (boleto externo). Encerra as regras de cobranca.

### Baixa total ou parcial (V2 - por billing_number)

```text
POST /billing/v2/paid/{billing_number}
```

```json
{
  "paid_amount": 30800,
  "discount_amount": 0,
  "paid_at": "2026-03-12"
}
```

| Campo | Obrigatorio | Descricao |
|---|---|---|
| `paid_amount` | Nao | Valor pago em centavos. Se omitido, usa valor original |
| `discount_amount` | Nao | Desconto concedido |
| `paid_at` | Nao | Data no formato `YYYY-MM-DD`. Se omitido, usa hoje |

---

## 6. Cancelar Billing

```text
PUT /billing/cancel/{integration_identifier}
```

So funciona se o status for `pending`, `overdue` ou `error`.

```json
{ "message": "Billing successfully canceled.", "errors": {} }
```

---

## 7. Reabrir Billing Cancelado

```text
POST /billing/integration/reopen-installment/{billing_number}
```

Processamento assincrono. Usar apenas em correcoes operacionais controladas.

```json
{ "message": "Request accepted for billing reopening." }
```

---

## 8. Listar Cobrancas

### Todas

```text
GET /billing/
```

### Por status

```text
GET /billing/status/{status}
```

Status disponiveis: `processing`, `pending`, `overdue`, `cancelled`, `paid`, `deleted`, `renegotiated`, `payment_approved`, `partially_paid`, `protested`, entre outros.

### Por data de atualizacao

```text
GET /billing/updated_at?start_datetime=2026-03-01T00:00:00Z&end_datetime=2026-03-31T23:59:59Z
```

### Por data de pagamento

```text
GET /billing/installment/by_payment_date?start_paid_at_date=2026-03-01&end_paid_at_date=2026-03-31
```

Util para conciliacao financeira diaria.

---

## 9. Webhooks

### Configuracao

```text
POST /webhook
```

```json
{
  "topic": "payments/paid",
  "destination": "https://www.conexaodanca.com/api/integracoes/neofim/webhook"
}
```

### Topicos disponiveis

| Topico | Quando dispara |
|---|---|
| `payments/created` | Billing criado (status: `pending`) |
| `payments/registered` | Billing registrado no banco (tem codigo de barras e QR Code) |
| `payments/overdue` | Billing vencido |
| `payments/paid` | Pagamento confirmado |
| `payments/cancelled` | Billing cancelado |

### Headers do webhook recebido

```json
{
  "X-Neofin-Topic": "payments/paid",
  "X-Neofin-Hmac-SHA256": "assinatura-base64",
  "X-Neofin-Webhook-ID": "uuid-unico",
  "X-Neofin-Datetime": "2026-03-12T14:30:00-03:00",
  "X-Neofin-API-Version": "2023-01",
  "User-Agent": "neofin-webhook"
}
```

### Politica de reenvio

A Neofim tenta ate 3 vezes: imediatamente -> 5 min depois -> 20 min depois. Timeout: 10 segundos. Qualquer resposta 2xx e considerada sucesso.

### Validacao HMAC

```typescript
import crypto from 'crypto'

function verificarWebhook(body: Buffer, hmacHeader: string, secretKey: string): boolean {
  const digest = crypto
    .createHmac('sha256', secretKey)
    .update(body)
    .digest('base64')
  return crypto.timingSafeEqual(Buffer.from(digest), Buffer.from(hmacHeader))
}
```

### Campos importantes no payload de pagamento (`payments/paid`)

| Campo | Tipo | Descricao |
|---|---|---|
| `payment_number` | String | ID da parcela na Neofim |
| `integration_identifier` | String | Nosso identifier (ex: `fatura-credito-conexao-265`) |
| `payment_status` | String | `paid` |
| `paid_amount` | String | Valor pago em centavos |
| `paid_at` | Number | Unix Timestamp do pagamento |
| `paid_method` | String | `pix` ou `boleto` |
| `billing_url` | String | URL da cobranca |

> Usar `X-Neofin-Webhook-ID` para evitar processamento duplicado.

---

## 10. API de Clientes

A Neofim mantem um cadastro proprio de clientes. Quando um billing e criado, o cliente e cadastrado automaticamente. Para atualizar dados cadastrais:

```text
POST /customer/
```

```json
{
  "customers": [{
    "document": "17376793291",
    "name": "Raimundo Nonato Barbosa Pessoa",
    "mail": "cristiane.macapuna@gmail.com",
    "phone": "+5591980507265",
    "address_street": "Rua Osvaldo Cruz",
    "address_number": "48",
    "address_complement": "",
    "address_neighborhood": "Prainha",
    "address_city": "Salinopolis",
    "address_state": "PA",
    "address_zip_code": "68721000"
  }]
}
```

Flag util: `block_neofin_charge_creation: true` - bloqueia criacao de bolepix para esse cliente (ex: inadimplencia grave).

---

## 11. Integration Identifier - Regras

O `integration_identifier` e o vinculo entre nosso banco e a Neofim.

### Padrao atual

| Origem | Formato |
|---|---|
| Fatura da conta interna | `fatura-credito-conexao-{fatura_id}` |
| Cobranca avulsa | `cobranca-{cobranca_id}` |
| Reemissao (billing cancelled) | `fatura-credito-conexao-{id}-r{timestamp}` |

### Regras importantes

- **Nunca reutilizar** um identifier de billing cancelado - criar novo com sufixo `-r{timestamp}`
- **Nao usar timestamps como identifier base** - eles devem ser estaveis para o upsert funcionar
- O identifier e opcional para a Neofim, mas obrigatorio no nosso sistema para rastreabilidade
- Se o mesmo identifier for reenviado, a Neofim **atualiza** o billing (upsert)

---

## 12. Polling e Sincronizacao

Como a Neofim nao processa em tempo real, o sistema usa um cron de polling para sincronizar os billings apos o processamento das 23h30.

### Cron configurado

```text
# vercel.json
"15 */6 * * *"  -> poll a cada 6 horas (0h15, 6h15, 12h15, 18h15)
```

### Logica do poll

1. Busca cobrancas com `neofin_charge_id` preenchido e sem `link_pagamento`
2. Para cada uma: `GET /billing/integration/{neofin_charge_id}`
3. Se retornar 200: salva `billing_number`, `billing_url`, `link_pagamento`
4. Se retornar 404: incrementa contador de tentativas - billing ainda em fila
5. Se billing estiver `paid` remotamente: atualiza status local

### Rota de poll manual

```text
GET /api/governanca/cobrancas/poll-neofin
Header: Authorization: Bearer {CRON_SECRET}
```

---

## 13. Cenarios Especiais

### Fatura com valor zero

Faturas com `valor_total_centavos = 0` recebem status `CONCLUIDA` automaticamente e **nunca** sao enviadas para a Neofim.

### Billing cancelled na Neofim

Quando o polling detecta um billing com status `cancelled` na Neofim, o sistema gera novo identifier com sufixo `-r{timestamp}` e reenvia.

### Pagamento parcial por lancamento

Quando um aluno paga um lancamento individual dentro da fatura, o sistema cancela a cobranca atual e cria nova com valor atualizado. A nova cobranca deve ser enviada a Neofim normalmente.

### Fatura de aluno com matricula cancelada

O cancelamento de matricula **nao cancela** cobrancas com status `PAGO` ou `RECEBIDO`. Somente cobrancas `PENDENTE` sao canceladas.

---

## 14. Tabela de Erros Comuns

| Situacao | Causa | Solucao |
|---|---|---|
| GET retorna 404 logo apos POST | Billing ainda em fila - processamento so as 23h30 | Aguardar e rodar poll apos as 23h30 |
| POST retorna 202 mas billing nunca aparece | Problema no processamento da Neofim | Abrir chamado com evidencias |
| GET /billing/{id} retorna 404 | Usando endpoint errado para integration_identifier | Usar GET /billing/integration/{id} |
| Billing com status `cancelled` | Billing foi cancelado na Neofim | Recriar com novo identifier (-r{timestamp}) |
| POST retorna 403 | API Key invalida ou expirada | Verificar variaveis de ambiente na Vercel |
| Aluno nao consegue pagar | Billing gerado como `boleto` em vez de `bolepix` | Verificar campo `type` no payload |

---

## 15. Suporte Neofim

- **Painel de producao:** https://app.neofin.com.br/dashboard
- **Painel sandbox:** https://sandbox.neofin.com.br/dashboard
- **Documentacao:** https://neofinv1.apidog.io
- **Chaves de API:** Painel -> Integracao API -> APP Key / APP Secret

> Ao abrir chamado, sempre incluir: request completo (payload + headers), timestamp da chamada, response recebido, e o identifier usado. Ver secao de evidencias no `docs/estado-atual-do-projeto.md`.

---

*Ultima atualizacao: 2026-04-04 | Versao da API Neofim: v1*
