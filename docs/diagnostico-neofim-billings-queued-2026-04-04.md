# Diagnostico Neofim - billings queued - 2026-04-04

## contexto

- Objetivo: validar diretamente na API da Neofim se o problema esta no payload/regra de vencimento ou em falha interna da plataforma.
- Escopo: somente diagnostico e documentacao. Nenhuma logica de producao foi alterada.
- Ambiente consultado: `https://api.neofin.services`
- Autenticacao usada: headers `api-key` e `secret-key` (redigidos neste arquivo).
- Janela principal do teste: de `2026-04-04T16:33:36-03:00` ate `2026-04-04T16:48:39-03:00` no timezone `America/Fortaleza`.
- Regra dos testes: due_date sempre futuro (+7 dias), integration_identifier sempre novo e unico, sem `original_due_date`, sem `address_complement`, sem `discount_before_payment`, sem `discount_before_payment_due_date`, sem `fees`, sem `fine`.
- Observacao de documentacao: a documentacao publica da Neofim apresenta obrigatoriedade ampla para varios campos, mas este diagnostico executa exatamente o payload minimo solicitado para verificar o comportamento real da API em producao.

## linha do tempo

- 2026-04-04T16:33:36-03:00 - inicio do diagnostico direto na API https://api.neofin.services
- 2026-04-04T16:33:36-03:00 - [M1] POST https://api.neofin.services/billing/
- 2026-04-04T16:33:37-03:00 - [M1] GET imediato https://api.neofin.services/billing/integration/diag-neofim-20260404-202604041633360300-m1-1
- 2026-04-04T16:33:37-03:00 - [M2] POST https://api.neofin.services/billing/
- 2026-04-04T16:33:38-03:00 - [M2] GET imediato https://api.neofin.services/billing/integration/diag-neofim-20260404-202604041633360300-m2-2
- 2026-04-04T16:33:38-03:00 - [M3] POST https://api.neofin.services/billing/
- 2026-04-04T16:33:38-03:00 - [M3] GET imediato https://api.neofin.services/billing/integration/diag-neofim-20260404-202604041633360300-m3-3
- 2026-04-04T16:33:38-03:00 - [M4] POST https://api.neofin.services/billing/
- 2026-04-04T16:33:39-03:00 - [M4] GET imediato https://api.neofin.services/billing/integration/diag-neofim-20260404-202604041633360300-m4-4
- 2026-04-04T16:36:36-03:00 - [M1] GET T+3min https://api.neofin.services/billing/integration/diag-neofim-20260404-202604041633360300-m1-1
- 2026-04-04T16:36:37-03:00 - [M2] GET T+3min https://api.neofin.services/billing/integration/diag-neofim-20260404-202604041633360300-m2-2
- 2026-04-04T16:36:38-03:00 - [M3] GET T+3min https://api.neofin.services/billing/integration/diag-neofim-20260404-202604041633360300-m3-3
- 2026-04-04T16:36:38-03:00 - [M4] GET T+3min https://api.neofin.services/billing/integration/diag-neofim-20260404-202604041633360300-m4-4
- 2026-04-04T16:48:36-03:00 - [M1] GET T+15min https://api.neofin.services/billing/integration/diag-neofim-20260404-202604041633360300-m1-1
- 2026-04-04T16:48:37-03:00 - [M2] GET T+15min https://api.neofin.services/billing/integration/diag-neofim-20260404-202604041633360300-m2-2
- 2026-04-04T16:48:38-03:00 - [M3] GET T+15min https://api.neofin.services/billing/integration/diag-neofim-20260404-202604041633360300-m3-3
- 2026-04-04T16:48:38-03:00 - [M4] GET T+15min https://api.neofin.services/billing/integration/diag-neofim-20260404-202604041633360300-m4-4
- 2026-04-04T16:48:39-03:00 - [M4] GET listagem por data https://api.neofin.services/billing/updated_at?start_datetime=2026-04-04T19%3A28%3A36.844Z&end_datetime=2026-04-04T19%3A49%3A39.059Z

## testes executados

| Teste | Tipo | Integration identifier | Due date local | POST | GET imediato | GET +3 min | GET +15 min | Listagem |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| M1 | boleto | diag-neofim-20260404-202604041633360300-m1-1 | 2026-04-11T12:00:00-03:00 | 400 (falha) | 404 (falha) | 404 (falha) | 404 (falha) | n/a |
| M2 | pix | diag-neofim-20260404-202604041633360300-m2-2 | 2026-04-11T12:00:00-03:00 | 400 (falha) | 404 (falha) | 404 (falha) | 404 (falha) | n/a |
| M3 | boleto | diag-neofim-20260404-202604041633360300-m3-3 | 2026-04-11T12:00:00-03:00 | 400 (falha) | 404 (falha) | 404 (falha) | 404 (falha) | n/a |
| M4 | boleto | diag-neofim-20260404-202604041633360300-m4-4 | 2026-04-11T12:00:00-03:00 | 400 (falha) | 404 (falha) | 404 (falha) | 404 (falha) | nao |

## payloads usados

### M1

```json
{
  "billings": [
    {
      "address_city": "Fortaleza",
      "address_neighborhood": "Aldeota",
      "address_number": "100",
      "address_state": "CE",
      "address_street": "Rua Barao de Aracati",
      "address_zip_code": "60115080",
      "amount": 15345,
      "by_mail": false,
      "by_whatsapp": true,
      "customer_document": "52998224725",
      "customer_mail": "diagnostico.neofim.m1@example.com",
      "customer_name": "Diagnostico Neofim M1",
      "customer_phone": "+5585986123456",
      "due_date": 1775919600,
      "installments": 1,
      "type": "boleto",
      "integration_identifier": "diag-neofim-20260404-202604041633360300-m1-1"
    }
  ]
}
```

### M2

```json
{
  "billings": [
    {
      "address_city": "Fortaleza",
      "address_neighborhood": "Aldeota",
      "address_number": "100",
      "address_state": "CE",
      "address_street": "Rua Barao de Aracati",
      "address_zip_code": "60115080",
      "amount": 15346,
      "by_mail": false,
      "by_whatsapp": true,
      "customer_document": "52998224725",
      "customer_mail": "diagnostico.neofim.m1@example.com",
      "customer_name": "Diagnostico Neofim M1",
      "customer_phone": "+5585986123456",
      "due_date": 1775919600,
      "installments": 1,
      "type": "pix",
      "integration_identifier": "diag-neofim-20260404-202604041633360300-m2-2"
    }
  ]
}
```

### M3

```json
{
  "billings": [
    {
      "address_city": "Fortaleza",
      "address_neighborhood": "Aldeota",
      "address_number": "100",
      "address_state": "CE",
      "address_street": "Rua Barao de Aracati",
      "address_zip_code": "60115080",
      "amount": 15347,
      "by_mail": false,
      "by_whatsapp": true,
      "customer_document": "11144477735",
      "customer_mail": "diagnostico.neofim.m3@example.com",
      "customer_name": "Diagnostico Neofim M3",
      "customer_phone": "+5585986234567",
      "due_date": 1775919600,
      "installments": 1,
      "type": "boleto",
      "integration_identifier": "diag-neofim-20260404-202604041633360300-m3-3"
    }
  ]
}
```

### M4

```json
{
  "billings": [
    {
      "address_city": "Fortaleza",
      "address_neighborhood": "Aldeota",
      "address_number": "100",
      "address_state": "CE",
      "address_street": "Rua Barao de Aracati",
      "address_zip_code": "60115080",
      "amount": 15348,
      "by_mail": false,
      "by_whatsapp": true,
      "customer_document": "52998224725",
      "customer_mail": "diagnostico.neofim.m1@example.com",
      "customer_name": "Diagnostico Neofim M1",
      "customer_phone": "+5585986123456",
      "due_date": 1775919600,
      "installments": 1,
      "type": "boleto",
      "integration_identifier": "diag-neofim-20260404-202604041633360300-m4-4"
    }
  ]
}
```


## resultados

### M1

- Descricao: boleto, due_date +7 dias, sem original_due_date, sem address_complement, sem discount_before_payment, sem discount_before_payment_due_date, sem fees, sem fine
- Integration identifier usado na consulta: `diag-neofim-20260404-202604041633360300-m1-1`
- Due date usada: `2026-04-11T12:00:00-03:00` (1775919600)
- Horario do POST: `2026-04-04T16:33:36-03:00`

#### Resposta completa do POST

```json
{
  "method": "POST",
  "url": "https://api.neofin.services/billing/",
  "started_at_local": "2026-04-04T16:33:36-03:00",
  "started_at_utc": "2026-04-04T19:33:36.844Z",
  "ended_at_local": "2026-04-04T16:33:37-03:00",
  "ended_at_utc": "2026-04-04T19:33:37.466Z",
  "duration_ms": 622,
  "status": 400,
  "ok": false,
  "response_headers": {
    "access-control-allow-credentials": "true",
    "access-control-allow-headers": "authorization,content-type,x-empcookie",
    "access-control-allow-methods": "POST,PUT,GET,OPTIONS",
    "access-control-allow-origin": "https://app.neofin.com.br,https://app.neofin.dev.br,https://sandbox.neofin.com.br",
    "connection": "keep-alive",
    "content-length": "68",
    "content-type": "application/json",
    "date": "Sat, 04 Apr 2026 19:33:39 GMT",
    "x-amz-apigw-id": "bT0fIG2DIAMFXFQ=",
    "x-amzn-requestid": "b3ef3c2a-7484-4a25-a258-8b4ec248f211",
    "x-amzn-trace-id": "Root=1-69d16793-2d7b88df4211f3dd049d61cf;Parent=7e179d0fc24e86df;Sampled=0;Lineage=2:836a4853:0"
  },
  "body": {
    "message": "",
    "errors": {
      "installment_type[0]": [
        "Field not found."
      ]
    }
  },
  "error": null
}
```

#### Resposta do GET imediato

```json
{
  "method": "GET",
  "url": "https://api.neofin.services/billing/integration/diag-neofim-20260404-202604041633360300-m1-1",
  "started_at_local": "2026-04-04T16:33:37-03:00",
  "started_at_utc": "2026-04-04T19:33:37.467Z",
  "ended_at_local": "2026-04-04T16:33:37-03:00",
  "ended_at_utc": "2026-04-04T19:33:37.873Z",
  "duration_ms": 406,
  "status": 404,
  "ok": false,
  "response_headers": {
    "access-control-allow-credentials": "true",
    "access-control-allow-headers": "authorization,content-type,x-empcookie",
    "access-control-allow-methods": "POST,PUT,GET,OPTIONS",
    "access-control-allow-origin": "https://app.neofin.com.br,https://app.neofin.dev.br,https://sandbox.neofin.com.br",
    "connection": "keep-alive",
    "content-length": "44",
    "content-type": "application/json",
    "date": "Sat, 04 Apr 2026 19:33:40 GMT",
    "x-amz-apigw-id": "bT0fNEw3oAMFkqA=",
    "x-amzn-requestid": "6b4ce15e-b3a8-4e0f-b3cc-729b38835b1b",
    "x-amzn-trace-id": "Root=1-69d16794-53aa430d49fe695c33de8611;Parent=78404fc5a29a3760;Sampled=0;Lineage=2:836a4853:0"
  },
  "body": {
    "message": "Billing not found.",
    "errors": {}
  },
  "error": null
}
```

#### Resposta apos 3 minutos

```json
{
  "method": "GET",
  "url": "https://api.neofin.services/billing/integration/diag-neofim-20260404-202604041633360300-m1-1",
  "started_at_local": "2026-04-04T16:36:36-03:00",
  "started_at_utc": "2026-04-04T19:36:36.850Z",
  "ended_at_local": "2026-04-04T16:36:37-03:00",
  "ended_at_utc": "2026-04-04T19:36:37.331Z",
  "duration_ms": 481,
  "status": 404,
  "ok": false,
  "response_headers": {
    "access-control-allow-credentials": "true",
    "access-control-allow-headers": "authorization,content-type,x-empcookie",
    "access-control-allow-methods": "POST,PUT,GET,OPTIONS",
    "access-control-allow-origin": "https://app.neofin.com.br,https://app.neofin.dev.br,https://sandbox.neofin.com.br",
    "connection": "keep-alive",
    "content-length": "44",
    "content-type": "application/json",
    "date": "Sat, 04 Apr 2026 19:36:39 GMT",
    "x-amz-apigw-id": "bT07QGdUoAMFu-g=",
    "x-amzn-requestid": "bc75988f-937a-471d-8db5-c52285c149fe",
    "x-amzn-trace-id": "Root=1-69d16847-3aae2935322003462c274e49;Parent=142ea9626142900c;Sampled=0;Lineage=2:836a4853:0"
  },
  "body": {
    "message": "Billing not found.",
    "errors": {}
  },
  "error": null
}
```

#### Resposta apos 15 minutos

```json
{
  "method": "GET",
  "url": "https://api.neofin.services/billing/integration/diag-neofim-20260404-202604041633360300-m1-1",
  "started_at_local": "2026-04-04T16:48:36-03:00",
  "started_at_utc": "2026-04-04T19:48:36.892Z",
  "ended_at_local": "2026-04-04T16:48:37-03:00",
  "ended_at_utc": "2026-04-04T19:48:37.477Z",
  "duration_ms": 585,
  "status": 404,
  "ok": false,
  "response_headers": {
    "access-control-allow-credentials": "true",
    "access-control-allow-headers": "authorization,content-type,x-empcookie",
    "access-control-allow-methods": "POST,PUT,GET,OPTIONS",
    "access-control-allow-origin": "https://app.neofin.com.br,https://app.neofin.dev.br,https://sandbox.neofin.com.br",
    "connection": "keep-alive",
    "content-length": "44",
    "content-type": "application/json",
    "date": "Sat, 04 Apr 2026 19:48:39 GMT",
    "x-amz-apigw-id": "bT2rxFKloAMFQDg=",
    "x-amzn-requestid": "489ca257-6289-45db-bbf6-fb4c5df2c720",
    "x-amzn-trace-id": "Root=1-69d16b17-7a0dcd1336a8a9655728b694;Parent=02b0135eb706d5cd;Sampled=0;Lineage=2:836a4853:0"
  },
  "body": {
    "message": "Billing not found.",
    "errors": {}
  },
  "error": null
}
```

#### Listagem por data/filtro

Nao aplicavel neste teste.

### M2

- Descricao: pix, mesmas regras do M1
- Integration identifier usado na consulta: `diag-neofim-20260404-202604041633360300-m2-2`
- Due date usada: `2026-04-11T12:00:00-03:00` (1775919600)
- Horario do POST: `2026-04-04T16:33:37-03:00`

#### Resposta completa do POST

```json
{
  "method": "POST",
  "url": "https://api.neofin.services/billing/",
  "started_at_local": "2026-04-04T16:33:37-03:00",
  "started_at_utc": "2026-04-04T19:33:37.875Z",
  "ended_at_local": "2026-04-04T16:33:38-03:00",
  "ended_at_utc": "2026-04-04T19:33:38.166Z",
  "duration_ms": 291,
  "status": 400,
  "ok": false,
  "response_headers": {
    "access-control-allow-credentials": "true",
    "access-control-allow-headers": "authorization,content-type,x-empcookie",
    "access-control-allow-methods": "POST,PUT,GET,OPTIONS",
    "access-control-allow-origin": "https://app.neofin.com.br,https://app.neofin.dev.br,https://sandbox.neofin.com.br",
    "connection": "keep-alive",
    "content-length": "68",
    "content-type": "application/json",
    "date": "Sat, 04 Apr 2026 19:33:40 GMT",
    "x-amz-apigw-id": "bT0fPEoNoAMFUdg=",
    "x-amzn-requestid": "dd4702d6-cc75-4296-a920-5ee30cafa1d5",
    "x-amzn-trace-id": "Root=1-69d16794-302b4abb6b2c32c261674c9d;Parent=2adcf52d66257f49;Sampled=0;Lineage=2:836a4853:0"
  },
  "body": {
    "message": "",
    "errors": {
      "installment_type[0]": [
        "Field not found."
      ]
    }
  },
  "error": null
}
```

#### Resposta do GET imediato

```json
{
  "method": "GET",
  "url": "https://api.neofin.services/billing/integration/diag-neofim-20260404-202604041633360300-m2-2",
  "started_at_local": "2026-04-04T16:33:38-03:00",
  "started_at_utc": "2026-04-04T19:33:38.167Z",
  "ended_at_local": "2026-04-04T16:33:38-03:00",
  "ended_at_utc": "2026-04-04T19:33:38.362Z",
  "duration_ms": 195,
  "status": 404,
  "ok": false,
  "response_headers": {
    "access-control-allow-credentials": "true",
    "access-control-allow-headers": "authorization,content-type,x-empcookie",
    "access-control-allow-methods": "POST,PUT,GET,OPTIONS",
    "access-control-allow-origin": "https://app.neofin.com.br,https://app.neofin.dev.br,https://sandbox.neofin.com.br",
    "connection": "keep-alive",
    "content-length": "44",
    "content-type": "application/json",
    "date": "Sat, 04 Apr 2026 19:33:40 GMT",
    "x-amz-apigw-id": "bT0fSHjIoAMFrKA=",
    "x-amzn-requestid": "9d50fb45-7d21-4430-a7fa-f1b8e0c4b0cc",
    "x-amzn-trace-id": "Root=1-69d16794-0e1a54d533d50acb4fb1447e;Parent=7fa15b2398142642;Sampled=0;Lineage=2:836a4853:0"
  },
  "body": {
    "message": "Billing not found.",
    "errors": {}
  },
  "error": null
}
```

#### Resposta apos 3 minutos

```json
{
  "method": "GET",
  "url": "https://api.neofin.services/billing/integration/diag-neofim-20260404-202604041633360300-m2-2",
  "started_at_local": "2026-04-04T16:36:37-03:00",
  "started_at_utc": "2026-04-04T19:36:37.891Z",
  "ended_at_local": "2026-04-04T16:36:38-03:00",
  "ended_at_utc": "2026-04-04T19:36:38.125Z",
  "duration_ms": 234,
  "status": 404,
  "ok": false,
  "response_headers": {
    "access-control-allow-credentials": "true",
    "access-control-allow-headers": "authorization,content-type,x-empcookie",
    "access-control-allow-methods": "POST,PUT,GET,OPTIONS",
    "access-control-allow-origin": "https://app.neofin.com.br,https://app.neofin.dev.br,https://sandbox.neofin.com.br",
    "connection": "keep-alive",
    "content-length": "44",
    "content-type": "application/json",
    "date": "Sat, 04 Apr 2026 19:36:40 GMT",
    "x-amz-apigw-id": "bT07XFacIAMF0ew=",
    "x-amzn-requestid": "2ca5c832-0d5f-4df0-9f09-d885af09b633",
    "x-amzn-trace-id": "Root=1-69d16848-707a33ce057f851e2f5cb65d;Parent=0b9112c400e07d11;Sampled=0;Lineage=2:836a4853:0"
  },
  "body": {
    "message": "Billing not found.",
    "errors": {}
  },
  "error": null
}
```

#### Resposta apos 15 minutos

```json
{
  "method": "GET",
  "url": "https://api.neofin.services/billing/integration/diag-neofim-20260404-202604041633360300-m2-2",
  "started_at_local": "2026-04-04T16:48:37-03:00",
  "started_at_utc": "2026-04-04T19:48:37.891Z",
  "ended_at_local": "2026-04-04T16:48:38-03:00",
  "ended_at_utc": "2026-04-04T19:48:38.093Z",
  "duration_ms": 202,
  "status": 404,
  "ok": false,
  "response_headers": {
    "access-control-allow-credentials": "true",
    "access-control-allow-headers": "authorization,content-type,x-empcookie",
    "access-control-allow-methods": "POST,PUT,GET,OPTIONS",
    "access-control-allow-origin": "https://app.neofin.com.br,https://app.neofin.dev.br,https://sandbox.neofin.com.br",
    "connection": "keep-alive",
    "content-length": "44",
    "content-type": "application/json",
    "date": "Sat, 04 Apr 2026 19:48:40 GMT",
    "x-amz-apigw-id": "bT2r3HzoIAMFkXQ=",
    "x-amzn-requestid": "a9818936-5dca-4a37-8f37-dd6d7928da79",
    "x-amzn-trace-id": "Root=1-69d16b18-6c86eed418aaae151ffc801b;Parent=0648045485308cd5;Sampled=0;Lineage=2:836a4853:0"
  },
  "body": {
    "message": "Billing not found.",
    "errors": {}
  },
  "error": null
}
```

#### Listagem por data/filtro

Nao aplicavel neste teste.

### M3

- Descricao: boleto, mesmas regras do M1, mas com outro CPF/email/telefone validos
- Integration identifier usado na consulta: `diag-neofim-20260404-202604041633360300-m3-3`
- Due date usada: `2026-04-11T12:00:00-03:00` (1775919600)
- Horario do POST: `2026-04-04T16:33:38-03:00`

#### Resposta completa do POST

```json
{
  "method": "POST",
  "url": "https://api.neofin.services/billing/",
  "started_at_local": "2026-04-04T16:33:38-03:00",
  "started_at_utc": "2026-04-04T19:33:38.362Z",
  "ended_at_local": "2026-04-04T16:33:38-03:00",
  "ended_at_utc": "2026-04-04T19:33:38.647Z",
  "duration_ms": 285,
  "status": 400,
  "ok": false,
  "response_headers": {
    "access-control-allow-credentials": "true",
    "access-control-allow-headers": "authorization,content-type,x-empcookie",
    "access-control-allow-methods": "POST,PUT,GET,OPTIONS",
    "access-control-allow-origin": "https://app.neofin.com.br,https://app.neofin.dev.br,https://sandbox.neofin.com.br",
    "connection": "keep-alive",
    "content-length": "68",
    "content-type": "application/json",
    "date": "Sat, 04 Apr 2026 19:33:41 GMT",
    "x-amz-apigw-id": "bT0fUF_SIAMFW6g=",
    "x-amzn-requestid": "78d9ea89-1526-4b4f-8fab-7f0e375388c7",
    "x-amzn-trace-id": "Root=1-69d16794-17e4489479bec65a57563d07;Parent=13a93948f67ceed4;Sampled=0;Lineage=2:836a4853:0"
  },
  "body": {
    "message": "",
    "errors": {
      "installment_type[0]": [
        "Field not found."
      ]
    }
  },
  "error": null
}
```

#### Resposta do GET imediato

```json
{
  "method": "GET",
  "url": "https://api.neofin.services/billing/integration/diag-neofim-20260404-202604041633360300-m3-3",
  "started_at_local": "2026-04-04T16:33:38-03:00",
  "started_at_utc": "2026-04-04T19:33:38.648Z",
  "ended_at_local": "2026-04-04T16:33:38-03:00",
  "ended_at_utc": "2026-04-04T19:33:38.846Z",
  "duration_ms": 198,
  "status": 404,
  "ok": false,
  "response_headers": {
    "access-control-allow-credentials": "true",
    "access-control-allow-headers": "authorization,content-type,x-empcookie",
    "access-control-allow-methods": "POST,PUT,GET,OPTIONS",
    "access-control-allow-origin": "https://app.neofin.com.br,https://app.neofin.dev.br,https://sandbox.neofin.com.br",
    "connection": "keep-alive",
    "content-length": "44",
    "content-type": "application/json",
    "date": "Sat, 04 Apr 2026 19:33:41 GMT",
    "x-amz-apigw-id": "bT0fXGcqoAMFZhQ=",
    "x-amzn-requestid": "ad8c5f9b-30d2-4f6e-a792-0a2cf762a521",
    "x-amzn-trace-id": "Root=1-69d16795-18ecf9912a9258d172903f29;Parent=109540a9b3711a25;Sampled=0;Lineage=2:836a4853:0"
  },
  "body": {
    "message": "Billing not found.",
    "errors": {}
  },
  "error": null
}
```

#### Resposta apos 3 minutos

```json
{
  "method": "GET",
  "url": "https://api.neofin.services/billing/integration/diag-neofim-20260404-202604041633360300-m3-3",
  "started_at_local": "2026-04-04T16:36:38-03:00",
  "started_at_utc": "2026-04-04T19:36:38.373Z",
  "ended_at_local": "2026-04-04T16:36:38-03:00",
  "ended_at_utc": "2026-04-04T19:36:38.590Z",
  "duration_ms": 217,
  "status": 404,
  "ok": false,
  "response_headers": {
    "access-control-allow-credentials": "true",
    "access-control-allow-headers": "authorization,content-type,x-empcookie",
    "access-control-allow-methods": "POST,PUT,GET,OPTIONS",
    "access-control-allow-origin": "https://app.neofin.com.br,https://app.neofin.dev.br,https://sandbox.neofin.com.br",
    "connection": "keep-alive",
    "content-length": "44",
    "content-type": "application/json",
    "date": "Sat, 04 Apr 2026 19:36:40 GMT",
    "x-amz-apigw-id": "bT07cFLmIAMFZUg=",
    "x-amzn-requestid": "11e9e7bb-277d-49dd-b168-6440a9d2e35a",
    "x-amzn-trace-id": "Root=1-69d16848-352554233430be050e5dfa3b;Parent=3f8f8e540ffc1d0d;Sampled=0;Lineage=2:836a4853:0"
  },
  "body": {
    "message": "Billing not found.",
    "errors": {}
  },
  "error": null
}
```

#### Resposta apos 15 minutos

```json
{
  "method": "GET",
  "url": "https://api.neofin.services/billing/integration/diag-neofim-20260404-202604041633360300-m3-3",
  "started_at_local": "2026-04-04T16:48:38-03:00",
  "started_at_utc": "2026-04-04T19:48:38.372Z",
  "ended_at_local": "2026-04-04T16:48:38-03:00",
  "ended_at_utc": "2026-04-04T19:48:38.574Z",
  "duration_ms": 202,
  "status": 404,
  "ok": false,
  "response_headers": {
    "access-control-allow-credentials": "true",
    "access-control-allow-headers": "authorization,content-type,x-empcookie",
    "access-control-allow-methods": "POST,PUT,GET,OPTIONS",
    "access-control-allow-origin": "https://app.neofin.com.br,https://app.neofin.dev.br,https://sandbox.neofin.com.br",
    "connection": "keep-alive",
    "content-length": "44",
    "content-type": "application/json",
    "date": "Sat, 04 Apr 2026 19:48:40 GMT",
    "x-amz-apigw-id": "bT2r8F10IAMFeEg=",
    "x-amzn-requestid": "c770bb62-f3c4-47f1-85fb-826b547c8cd7",
    "x-amzn-trace-id": "Root=1-69d16b18-78f4c8586b4c18df5b080639;Parent=427e7fc846a1f825;Sampled=0;Lineage=2:836a4853:0"
  },
  "body": {
    "message": "Billing not found.",
    "errors": {}
  },
  "error": null
}
```

#### Listagem por data/filtro

Nao aplicavel neste teste.

### M4

- Descricao: repeticao do M1 com consulta adicional de listagem recente por data de atualizacao
- Integration identifier usado na consulta: `diag-neofim-20260404-202604041633360300-m4-4`
- Due date usada: `2026-04-11T12:00:00-03:00` (1775919600)
- Horario do POST: `2026-04-04T16:33:38-03:00`

#### Resposta completa do POST

```json
{
  "method": "POST",
  "url": "https://api.neofin.services/billing/",
  "started_at_local": "2026-04-04T16:33:38-03:00",
  "started_at_utc": "2026-04-04T19:33:38.847Z",
  "ended_at_local": "2026-04-04T16:33:39-03:00",
  "ended_at_utc": "2026-04-04T19:33:39.124Z",
  "duration_ms": 277,
  "status": 400,
  "ok": false,
  "response_headers": {
    "access-control-allow-credentials": "true",
    "access-control-allow-headers": "authorization,content-type,x-empcookie",
    "access-control-allow-methods": "POST,PUT,GET,OPTIONS",
    "access-control-allow-origin": "https://app.neofin.com.br,https://app.neofin.dev.br,https://sandbox.neofin.com.br",
    "connection": "keep-alive",
    "content-length": "68",
    "content-type": "application/json",
    "date": "Sat, 04 Apr 2026 19:33:41 GMT",
    "x-amz-apigw-id": "bT0fZHqloAMFw1A=",
    "x-amzn-requestid": "01677fcd-8d7c-44da-8d77-7d003a323bc3",
    "x-amzn-trace-id": "Root=1-69d16795-3f29349260516fc97c6451a0;Parent=620df2ebe53f9005;Sampled=0;Lineage=2:836a4853:0"
  },
  "body": {
    "message": "",
    "errors": {
      "installment_type[0]": [
        "Field not found."
      ]
    }
  },
  "error": null
}
```

#### Resposta do GET imediato

```json
{
  "method": "GET",
  "url": "https://api.neofin.services/billing/integration/diag-neofim-20260404-202604041633360300-m4-4",
  "started_at_local": "2026-04-04T16:33:39-03:00",
  "started_at_utc": "2026-04-04T19:33:39.125Z",
  "ended_at_local": "2026-04-04T16:33:39-03:00",
  "ended_at_utc": "2026-04-04T19:33:39.342Z",
  "duration_ms": 217,
  "status": 404,
  "ok": false,
  "response_headers": {
    "access-control-allow-credentials": "true",
    "access-control-allow-headers": "authorization,content-type,x-empcookie",
    "access-control-allow-methods": "POST,PUT,GET,OPTIONS",
    "access-control-allow-origin": "https://app.neofin.com.br,https://app.neofin.dev.br,https://sandbox.neofin.com.br",
    "connection": "keep-alive",
    "content-length": "44",
    "content-type": "application/json",
    "date": "Sat, 04 Apr 2026 19:33:41 GMT",
    "x-amz-apigw-id": "bT0fcGAHIAMFuIg=",
    "x-amzn-requestid": "41ea2941-22ad-42dd-9336-1a303374aa32",
    "x-amzn-trace-id": "Root=1-69d16795-3b8476aa0f0ed5fe3e47ef80;Parent=50ab87a4fd5f5520;Sampled=0;Lineage=2:836a4853:0"
  },
  "body": {
    "message": "Billing not found.",
    "errors": {}
  },
  "error": null
}
```

#### Resposta apos 3 minutos

```json
{
  "method": "GET",
  "url": "https://api.neofin.services/billing/integration/diag-neofim-20260404-202604041633360300-m4-4",
  "started_at_local": "2026-04-04T16:36:38-03:00",
  "started_at_utc": "2026-04-04T19:36:38.853Z",
  "ended_at_local": "2026-04-04T16:36:39-03:00",
  "ended_at_utc": "2026-04-04T19:36:39.050Z",
  "duration_ms": 197,
  "status": 404,
  "ok": false,
  "response_headers": {
    "access-control-allow-credentials": "true",
    "access-control-allow-headers": "authorization,content-type,x-empcookie",
    "access-control-allow-methods": "POST,PUT,GET,OPTIONS",
    "access-control-allow-origin": "https://app.neofin.com.br,https://app.neofin.dev.br,https://sandbox.neofin.com.br",
    "connection": "keep-alive",
    "content-length": "44",
    "content-type": "application/json",
    "date": "Sat, 04 Apr 2026 19:36:41 GMT",
    "x-amz-apigw-id": "bT07hFmOIAMF2Gw=",
    "x-amzn-requestid": "1db10bd5-5ab4-4203-9287-2f8aa0d93197",
    "x-amzn-trace-id": "Root=1-69d16849-07276d405c40c452567a76a8;Parent=1067b087bd0369d7;Sampled=0;Lineage=2:836a4853:0"
  },
  "body": {
    "message": "Billing not found.",
    "errors": {}
  },
  "error": null
}
```

#### Resposta apos 15 minutos

```json
{
  "method": "GET",
  "url": "https://api.neofin.services/billing/integration/diag-neofim-20260404-202604041633360300-m4-4",
  "started_at_local": "2026-04-04T16:48:38-03:00",
  "started_at_utc": "2026-04-04T19:48:38.855Z",
  "ended_at_local": "2026-04-04T16:48:39-03:00",
  "ended_at_utc": "2026-04-04T19:48:39.059Z",
  "duration_ms": 204,
  "status": 404,
  "ok": false,
  "response_headers": {
    "access-control-allow-credentials": "true",
    "access-control-allow-headers": "authorization,content-type,x-empcookie",
    "access-control-allow-methods": "POST,PUT,GET,OPTIONS",
    "access-control-allow-origin": "https://app.neofin.com.br,https://app.neofin.dev.br,https://sandbox.neofin.com.br",
    "connection": "keep-alive",
    "content-length": "44",
    "content-type": "application/json",
    "date": "Sat, 04 Apr 2026 19:48:41 GMT",
    "x-amz-apigw-id": "bT2sBGxCoAMFp0w=",
    "x-amzn-requestid": "ad72a176-98f3-4064-803e-7504f852ca8b",
    "x-amzn-trace-id": "Root=1-69d16b19-22457eae0a5b5442207c7b38;Parent=4f39e043014058b0;Sampled=0;Lineage=2:836a4853:0"
  },
  "body": {
    "message": "Billing not found.",
    "errors": {}
  },
  "error": null
}
```

#### Listagem por data/filtro

- Endpoint usado: `https://api.neofin.services/billing/updated_at?start_datetime=2026-04-04T19%3A28%3A36.844Z&end_datetime=2026-04-04T19%3A49%3A39.059Z`
- Status: 200 (ok)
- Entradas do M4 localizadas na listagem: 0

```json
{
  "response": {
    "method": "GET",
    "url": "https://api.neofin.services/billing/updated_at?start_datetime=2026-04-04T19%3A28%3A36.844Z&end_datetime=2026-04-04T19%3A49%3A39.059Z",
    "started_at_local": "2026-04-04T16:48:39-03:00",
    "started_at_utc": "2026-04-04T19:48:39.062Z",
    "ended_at_local": "2026-04-04T16:48:39-03:00",
    "ended_at_utc": "2026-04-04T19:48:39.489Z",
    "duration_ms": 427,
    "status": 200,
    "ok": true,
    "response_headers": {
      "access-control-allow-credentials": "true",
      "access-control-allow-headers": "authorization,content-type,x-empcookie",
      "access-control-allow-methods": "POST,PUT,GET,OPTIONS",
      "access-control-allow-origin": "https://app.neofin.com.br,https://app.neofin.dev.br,https://sandbox.neofin.com.br",
      "connection": "keep-alive",
      "content-length": "48",
      "content-type": "application/json",
      "date": "Sat, 04 Apr 2026 19:48:41 GMT",
      "x-amz-apigw-id": "bT2sFF3bIAMFTJg=",
      "x-amzn-requestid": "ce512919-5f34-4feb-8156-8ae056429f86",
      "x-amzn-trace-id": "Root=1-69d16b19-02016ea22a9c17ed4b1631dc;Parent=19bbdbec3341c10c;Sampled=0;Lineage=2:836a4853:0"
    },
    "body": {
      "billings": [],
      "next_page_token": null,
      "count": 0
    },
    "error": null
  },
  "matching_entries": []
}
```


## hipoteses remanescentes

- A API exige `installment_type` em producao, embora o payload minimo desta rodada o tenha omitido por interpretacao de campo opcional.
- A documentacao e o comportamento real da validacao estao inconsistentes para campos de parcelamento e demais opcionais.
- Enquanto `installment_type` nao for aceito/omitivel, esta rodada nao consegue isolar em definitivo o efeito de `original_due_date`, descontos, `fees` e `fine`.

## conclusao tecnica

O problema foi reproduzido diretamente na API da Neofim em nivel de validacao de payload. Os 4 testes minimos falharam antes da materializacao da cobranca e a API devolveu o mesmo erro de schema: `installment_type[0]: Field not found.`. O bloqueio ocorreu antes de qualquer efeito assincrono, entao a causa predominante nesta rodada nao foi regra de vencimento nem descarte interno posterior, mas sim validacao de payload/schema.

## perguntas objetivas para o suporte da Neofim

1. Quais campos sao realmente obrigatorios no endpoint POST /billing/ em producao hoje para os tipos boleto e pix?
2. O campo `installment_type` e obrigatorio mesmo quando `installments` = 1? Se sim, quais valores sao aceitos em producao hoje?
3. A lista oficial de obrigatoriedade inclui `address_complement`, `discount_before_payment`, `discount_before_payment_due_date`, `fees` e `fine` de forma mandataria na validacao de producao?
4. Os identifiers testados (diag-neofim-20260404-202604041633360300-m1-1, diag-neofim-20260404-202604041633360300-m2-2, diag-neofim-20260404-202604041633360300-m3-3, diag-neofim-20260404-202604041633360300-m4-4) falharam exatamente por ausencia de `installment_type` ou houve outras validacoes internas nao expostas na resposta 400?
