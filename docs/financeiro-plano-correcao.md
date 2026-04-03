# Modulo Financeiro - Plano de Correcao
**Sistema:** Conexao Danca  
**Versao:** 2.0  
**Data:** 2026-04-03  
**Status:** Ciclo critico encerrado  
**Referencia:** [financeiro-especificacao-oficial.md](C:/Users/aliri/conexao-dados/docs/financeiro-especificacao-oficial.md)

Este documento registra o plano de correcao do ciclo financeiro de 2026-04-03, o que foi efetivamente concluido e o que permanece como prioridade de evolucao.

---

## 1. Resultado Do Ciclo

O ciclo financeiro de 2026-04-03 encerrou os itens criticos e altos do plano:
- idempotencia de cobrancas em eventos
- scheduler de fechamento mensal, IA diaria e polling Neofim
- fechamento no ultimo dia do mes
- configuracao correta de formas de pagamento da Escola e do Cafe
- prorata configuravel
- data limite do exercicio configuravel
- taxa de matricula no fluxo de matricula
- recalculo de tiers na desmatricula
- bloqueio de limite de credito
- reprocessamento de multa e juros em faturas em atraso
- FIN como camara de compensacao
- limpeza dos principais residuos e dados de teste

---

## 2. Pendencias Conhecidas

As pendencias abaixo nao impedem a operacao atual do sistema, mas seguem no backlog:

### M10. Faturas sem `neofin_invoice_id`
- ainda existem faturas com `cobranca_id` preenchido e `neofin_invoice_id` nulo
- o polling automatico deve reduzir esse passivo gradualmente, mas ainda exige acompanhamento operacional

### B4. Evolucao Multi-tenant
- o sistema continua instalacao unica
- toda nova tabela financeira deve prever `organizacao_id`

### B6. Loja com perfil do comprador
- ainda falta identificar formalmente se o comprador da Loja e aluno, colaborador ou externo
- ainda falta tabela de preco por perfil de comprador

### Operacao manual remanescente
- folha de marco/2026 permanece para fechamento manual
- Aurora Cunha Silva deve receber nova matricula apenas quando necessario

---

## 3. Registro De Itens Concluidos

| Item | Descricao | Concluido em | Responsavel |
|------|-----------|-------------|-------------|
| C1 | Idempotencia eventos | 2026-04-03 | Claude + Codex |
| C2 | Scheduler | 2026-04-03 | Claude + Codex |
| C3 | Webhook/Polling Neofim | 2026-04-03 | Claude + Codex |
| C4 | Dia de fechamento | 2026-04-03 | Claude + Codex |
| C5 | PIX/Cartao Cafe | 2026-04-03 | Codex |
| C6 | Formas pagamento Escola | 2026-04-03 | Codex |
| M1 | Lancamento orfao 437 | 2026-04-03 | Codex |
| M2 | Faturas fantasma | 2026-04-03 | Codex |
| M3 | Matriculas sem turma | 2026-04-03 | Codex |
| M4 | Colaboradores sem CC | 2026-04-03 | Codex |
| M5 | Categorias de teste | 2026-04-03 | Codex |
| M6 | Pro-rata configuravel | 2026-04-03 | Claude |
| M7 | Data limite exercicio | 2026-04-03 | Claude |
| M8 | Tipo ENTRADA legado | 2026-04-03 | Codex |
| M9 | Folha fev/2026 fechada | 2026-04-03 | Codex |
| A1 | FIN camara compensacao | 2026-04-03 | Claude |
| A2 | Recalculo tiers | 2026-04-03 | Claude |
| A3 | Taxa de matricula | 2026-04-03 | Claude |
| A4 | Limite credito bloqueio | 2026-04-03 | Claude |
| A5 | Multa e juros | 2026-04-03 | Claude + Codex |

---

## 4. Decisoes Arquiteturais Registradas

| Decisao | Descricao | Data |
|---------|-----------|------|
| Neofim - polling | A Neofim nao suporta webhook customizado. Polling automatico a cada 6h via cron. Futuro: integracao bancaria direta. | 2026-04-03 |
| Nomenclatura Conta Interna | Cartao Conexao aposentado. Banco usa `credito_conexao`. Interface usa Conta Interna. | 2026-04-03 |
| FIN - Visao A | FIN e camara de compensacao real. Todo credito passa pelo FIN na ida e na volta. Pagamentos a vista nao passam pelo FIN. | 2026-04-03 |
| Fechamento mensal | Faturas fecham no ultimo dia do mes (`dia_fechamento=0`). Vencimento padrao dia 12. | 2026-04-03 |
| Multi-tenant | Sistema atual e instalacao unica. Toda nova tabela financeira deve prever `organizacao_id`. | 2026-04-03 |

---

## 5. Prioridades Pos-Ciclo

1. Atacar M10 e reduzir o passivo de faturas sem `neofin_invoice_id`.
2. Estruturar B6 na Loja com perfil do comprador e precificacao por perfil.
3. Preparar B4 para futura evolucao SaaS com `organizacao_id`.

---

*Fim do documento - financeiro-plano-correcao.md*  
*Atualizado em: 2026-04-03*
