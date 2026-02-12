## Matriculas - Cancelamento x Conclusao + Frequencia + Cartao Conexao (2026-02-09)
- Ajustado fluxo: CANCELAR matricula marca status CANCELADA e exibe detalhes (tipo/motivo/data).
- Frequencia: apenas ATIVAS entram no painel de presenca; canceladas/concluidas vao para Historico.
- Financeiro: cancelamento encerra cobrancas futuras nao pagas e elimina previsoes futuras do Cartao Conexao ligadas a matricula.

---

## Atualizacoes recentes (Perfil do Colaborador + Folha UX + Cartao Conexao) - 2026-02-11

APIs concluidas:
- GET /api/admin/colaboradores/opcoes
  - Lista colaboradores para selecao operacional na folha (sem digitar ID manual).
- GET /api/admin/colaboradores/[id]/resumo-financeiro
  - Retorna conta Cartao Conexao (COLABORADOR), fatura aberta do periodo atual, resumo de lancamentos do mes,
    ultimas despesas e folhas recentes com calculo de liquido.
- GET /api/admin/colaboradores/[id]/folhas
  - Lista folhas do colaborador por competencia/status com proventos, descontos e liquido.
- GET /api/admin/folha/colaboradores (ajustado)
  - Mantem filtros por competencia/status/colaborador e agora retorna colaborador_nome no payload.

Paginas concluidas:
- /admin/colaboradores/[id]
  - Nova tela "Perfil do Colaborador" com abas:
    1) Visao geral
    2) Cartao / Despesas
    3) Folha
    4) Jornada (com link para modulo existente)
- /admin/financeiro/folha/colaboradores (ajustada)
  - Removido input manual de colaborador_id.
  - Adicionado select de colaborador por nome.
  - Adicionado filtro por status.
  - Adicionado atalho para o Perfil do Colaborador.

Pendencias:
- Jornada/ponto de colaborador ainda sem fluxo operacional completo (tela atual segue como referencia de implementacao futura).
- Fechamento mensal em lote de folha (por competencia para multiplos colaboradores) ainda nao implementado.
- Captura de prints depende de execucao manual autenticada no ambiente local.

---

## Atualizacoes recentes (Entrega 1 - Modulo Colaborador) - 2026-02-11

SQL:
- Nova migration: `supabase/migrations/20260211074000_colaborador_remuneracoes_pagamentos.sql`.
- Nova tabela `colaborador_remuneracoes` com vigencia, salario base e conta financeira origem.
- Nova tabela `colaborador_pagamentos` para historico operacional (pagamento/adiantamento/saque), com vinculo opcional a folha/evento.
- Indices adicionados para consultas por colaborador/data e competencia.

APIs concluidas:
- `GET|POST /api/admin/colaboradores/[id]/remuneracao`
  - Consulta historico + ativa e cria/substitui remuneracao ativa.
- `GET|POST /api/admin/colaboradores/[id]/pagamentos`
  - Lista historico e registra pagamento/adiantamento/saque.
  - Suporte opcional para:
    - gerar desconto em folha (ADIANTAMENTO/SAQUE),
    - gerar saida em `movimento_financeiro`.

Paginas concluidas:
- `/admin/colaboradores/[id]`
  - Nova aba **Remuneracao** com:
    - cadastro de salario base/vigencia/conta origem,
    - registro de pagamentos e adiantamentos,
    - listagem de historico.
- `/admin/financeiro/folha/colaboradores/[id]`
  - Acao rapida: **Adicionar salario base do cadastro** (provento), evitando digitacao manual.
- `/cafe/vendas`
  - UX ajustada para exibir rotulos explicitos:
    - Cartao Conexao Aluno
    - Cartao Conexao Colaborador

Pendencias futuras:
- Encargos e integracao contabil completa (INSS, DARF, provisoes).
- Fechamento mensal em lote de folha por competencia.
- Painel operacional completo de jornada/ponto integrado a folha.
