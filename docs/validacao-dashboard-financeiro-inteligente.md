# Validação - Dashboard Financeiro Inteligente

## URLs de teste
- Snapshot do dia: `GET /api/financeiro/dashboard-inteligente`
- Reanalisar + GPT: `POST /api/financeiro/dashboard-inteligente/reanalisar`
- Cron idempotente: `POST /api/financeiro/dashboard-inteligente/cron-diario`
- Histórico por data: `GET /api/financeiro/dashboard-inteligente/historico?data_base=YYYY-MM-DD`

## SQL de conferência
1) Último snapshot gerado (consolidado):
```sql
select id, created_at, data_base, periodo_inicio, periodo_fim,
       caixa_hoje_centavos, entradas_previstas_30d_centavos, saidas_comprometidas_30d_centavos,
       folego_caixa_dias, jsonb_array_length(regras_alerta) as qtd_alertas
from financeiro_snapshots
where centro_custo_id is null
order by created_at desc
limit 3;
```

2) Série e resumo armazenados no snapshot:
```sql
select id,
       jsonb_array_length(serie_fluxo_caixa) as pontos_serie,
       jsonb_array_length(resumo_por_centro) as qtd_centros
from financeiro_snapshots
where centro_custo_id is null
order by created_at desc
limit 3;
```

3) Análises GPT vinculadas:
```sql
select a.id, a.created_at, a.model,
       jsonb_array_length(a.alertas) as qtd_alertas,
       s.data_base
from financeiro_analises_gpt a
join financeiro_snapshots s on s.id = a.snapshot_id
order by a.created_at desc
limit 5;
```

4) Conferir movimentos e cruzar com o cálculo de caixa:
```sql
-- saldo até hoje (entradas - saídas)
select
  sum(case when upper(tipo) in ('ENTRADA','RECEITA') then valor_centavos else 0 end) -
  sum(case when upper(tipo) in ('SAIDA','DESPESA') then valor_centavos else 0 end) as caixa_ate_hoje
from movimento_financeiro
where data_movimento <= now();
```

## Dicas rápidas de validação manual
- Chamar `GET /api/financeiro/dashboard-inteligente` e conferir se retorna `snapshot_id`, datas e `has_gpt`.
- Rodar `POST /api/financeiro/dashboard-inteligente/reanalisar` e verificar se `has_gpt` e `analise.qtd_alertas` são populados.
- Verificar logs em dev: criação de snapshot, snapshot já existente e sucesso/falha de análise GPT.
