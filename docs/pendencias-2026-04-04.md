# Pendencias - 2026-04-04

## Contexto

Este documento consolida as pendencias operacionais e tecnicas abertas em `2026-04-04` para o modulo financeiro e para a integracao Neofim. Ele complementa o diagnostico em [diagnostico-neofim-billings-queued-2026-04-04.md](C:/Users/aliri/conexao-dados/docs/diagnostico-neofim-billings-queued-2026-04-04.md) e os tickets registrados em `public.suporte_tickets`.

## Resumo executivo

- A integracao Neofim segue com comportamento assincrono em lote, com janela principal de materializacao apos `23h30`.
- O diagnostico direto na API em `2026-04-04` encontrou uma divergencia entre a documentacao e a validacao real do payload: a API respondeu `400` com `installment_type[0]: Field not found.` nos testes minimos executados.
- Existem 5 pendencias operacionais abertas no suporte que exigem acompanhamento manual e, em alguns casos, correcao de codigo.

## Pendencias abertas

| Prioridade | Tema | Acao pendente | Referencia |
|---|---|---|---|
| Alta | Neofim / schema | Confirmar com a Neofim o contrato real do campo `installment_type`, se ele continua valido em `POST /billing/` e se houve mudanca de schema nao refletida na documentacao publica. | [diagnostico-neofim-billings-queued-2026-04-04.md](C:/Users/aliri/conexao-dados/docs/diagnostico-neofim-billings-queued-2026-04-04.md) |
| Alta | Fatura 385 | Cadastrar CPF valido da responsavel de Carmecinda Rodrigues Pereira e reprocessar `POST /api/financeiro/credito-conexao/faturas/385/gerar-cobranca` com body `{ "force": true }`. | Ticket `SUP-20260405-000094` |
| Alta | Neofim / marco 2026 | Acompanhar o proximo ciclo apos `2026-04-04 23:30`, executar polling e verificar se as faturas `39, 123, 147, 159, 183, 253, 265, 308, 344, 354 e 389` materializam na Neofim. Se persistir `404`, abrir chamado com evidencias. | Ticket `SUP-20260405-000096` |
| Alta | Competencia Brasilidades | Corrigir os lancamentos das parcelas `2` e `3` do evento Brasilidades 2026 para usar competencia do mes anterior ao vencimento, mover para as faturas corretas e ajustar a logica de geracao futura. | Ticket `SUP-20260405-000098` |
| Media | Inscricoes sem fatura | Revisar manualmente os casos de Julia Martins de Alencar e Maria Isadora Reis Pires para decidir entre gerar fatura, confirmar pagamento por outro meio ou cancelar rascunho. | Ticket `SUP-20260405-000100` |
| Media | Folha | Fechar manualmente a folha de `2026-03` no modulo financeiro. | Ticket `SUP-20260405-000102` |

## Evidencias e orientacao operacional

### 1. Divergencia entre documentacao e comportamento real da API

- O manual tecnico do projeto esta em [integracao-neofim.md](C:/Users/aliri/conexao-dados/docs/integracao-neofim.md).
- O diagnostico executado em producao em `2026-04-04` retornou erro de schema antes da criacao do billing.
- Antes de alterar o codigo de producao, validar com a Neofim qual payload continua oficialmente suportado.

### 2. Evidencias minimas para chamado com a Neofim

Ao abrir chamado, anexar:

- payload completo enviado
- headers utilizados, com segredos redigidos
- timestamp exato da chamada
- response body e status HTTP
- `integration_identifier` consultado
- janela do polling manual executado apos `23h30`

### 3. Ordem recomendada de tratamento

1. Confirmar o contrato do payload da Neofim.
2. Rodar polling das cobrancas pendentes apos a janela de processamento.
3. Reprocessar a fatura 385 apos corrigir o CPF.
4. Corrigir a regra de competencia do parcelamento do evento.
5. Encerrar os casos manuais remanescentes no financeiro.

## Status esperado para fechamento deste documento

Este documento pode ser considerado encerrado quando:

- a Neofim confirmar o schema esperado para `POST /billing/`
- as faturas pendentes de marco estiverem materializadas ou formalmente escaladas
- a fatura 385 for reprocessada com sucesso
- a regra de competencia do Brasilidades estiver corrigida
- os dois casos sem fatura e a folha de `2026-03` estiverem resolvidos

---

*Atualizado em: 2026-04-04*
