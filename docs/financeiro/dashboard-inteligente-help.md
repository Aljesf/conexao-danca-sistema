# Help — Diretor Inteligente (Bloco 2)

## O que você vê hoje (blocos 1–5)
- Bloco 1 — Saúde imediata: caixa de hoje, entradas/saídas previstas 30d, fôlego estimado.
- Bloco 2 — Leitura inteligente (GPT): resumo executivo + até 3 alertas priorizados.
- Bloco 3 — Fluxo de caixa no tempo: histórico 90d + projeção 30d (entradas, saídas, saldo).
- Bloco 4 — Resultado por centro: cada centro comparado consigo mesmo (30d vs janela anterior).
- Bloco 5 — Drill-down: atalhos para módulos financeiros (receber, pagar, movimento, centros, categorias).

## O que o GPT analisa hoje
- Tendências de entradas, saídas e resultado (30d vs 30d anterior).
- Fôlego de caixa estimado em dias.
- Fluxo de caixa histórico/projeção (saldo acumulado).
- Resumo por centro (resultado 30d e tendência).
- Alertas internos simples (ex.: fôlego baixo, entradas zeraram, saídas acelerando).
- Inadimplência objetiva: valor atrasado, quantidade, atraso médio, sinal base zero/sem histórico/reduziu.
- Concentração de receita: top 3 e top 5 pagadores sobre a base dos últimos 30d.
- Recorrência vs pontual (proxy): peso de pagadores recorrentes vs pagadores únicos nos últimos 30d.

## O que ainda NÃO está incluído (planejado/evolução)
- Cartão Conexão como ativo financeiro dedicado (projeção e risco próprio).
- Qualidade de receita por produto/serviço (mix e dependência de SKU).
- Adequação fiscal/contábil e conciliações bancárias.
- Previsões de inadimplência (modelos preditivos) além do atraso real.
- Recomendações automáticas de ação integradas a cobrança/cobrança inteligente.

## Como atualizar este help
- Fonte oficial: `docs/financeiro/dashboard-inteligente-help.md`.
- Sempre que mudar snapshot, alertas internos ou prompt GPT, atualizar este arquivo.
- Mantenha a constante de renderização em `src/lib/financeiro/helpDashboardInteligente.ts` alinhada com este conteúdo.

---
Versão: v2025-12-15 • Data: 2025-12-15
