# estado-atual-do-projeto.md

## Módulo atual
Documentos — Motor institucional (Modelos, Variáveis, Operações, Conjuntos, Grupos)

---

## SQL concluído (Documentos)

- Domínio Documentos consolidado (renomeado de Contratos → Documentos):
  - tabelas documentos_* (modelos, emitidos, variáveis) já existem no banco conforme migração aplicada.
- Motor de Conjuntos e Grupos criado:
  - public.documentos_conjuntos
    - codigo único
    - ativo
    - timestamps
  - public.documentos_grupos
    - FK conjunto_id → documentos_conjuntos(id) (on delete cascade)
    - codigo único por conjunto
    - obrigatorio
    - papel (PRINCIPAL/OBRIGATORIO/OPCIONAL/ADICIONAL)
    - regra: 1 PRINCIPAL por conjunto
    - ordem
  - public.documentos_grupos_modelos
    - pivot grupo_id ↔ documento_modelo_id
    - PK composta
    - FK modelo com on delete restrict

---

## APIs concluídas (Documentos)

- GET /api/documentos/conjuntos?include=grupos (lista conjuntos com grupos)
- (pendente) APIs de Conjuntos/Grupos/Modelos vinculados
- (pendente) APIs de seleção por Operação e emissão em Conjunto

---

## Páginas/componentes concluídos (Documentos)

- Sidebar Admin: menu “Documentos” com:
  - Novo documento
  - Modelos
  - Variáveis
  - Documentos emitidos
  - Tipos de documento
- Editor rico (modelo) e gestão de variáveis já disponíveis no módulo Documentos
- (pendente) UI de Conjuntos/Grupos e vínculo com modelos

- UI unica de Conjuntos + Grupos em /admin/config/documentos/conjuntos
- Governanca de grupos por papel (PRINCIPAL/OBRIGATORIO/OPCIONAL/ADICIONAL)
- Regra de emissao: matricula exige 1 grupo PRINCIPAL
- Redirect legado: /admin/config/documentos/conjuntos/[id] -> #conjunto-<id>
- Admin Documentos completo (editar conjuntos/grupos, vincular modelos, ordenar/remover)
- Governanca de grupos finalizada (papel + PRINCIPAL unico)
- Matricula depende apenas da configuracao de grupos/modelos

---

## Documentação concluída (Documentos)

Canônicos (pai/filhos):
- docs/documentos/documentos-visao-geral.md
- docs/documentos/documentos-tipo-contrato.md
- docs/documentos/documentos-operacoes.md
- docs/documentos/documentos-conjuntos.md
- docs/documentos/documentos-variaveis.md

---

## Pendências

- Implementar APIs do motor:
  - CRUD Conjuntos
  - CRUD Grupos
  - Vínculo Grupo ↔ Modelos
- Implementar UI Admin:
  - cadastro/edição de Conjuntos
  - cadastro/edição de Grupos dentro do Conjunto
  - seleção de modelos por Grupo
- (futuro) Tipos de documento no banco e seleção automática por Operação

---

## Próximas ações

1) APIs do motor Documentos (Conjuntos/Grupos/Modelos)
2) UI Admin para Conjuntos/Grupos
3) Seed inicial de Conjuntos e Grupos (Matrícula Regular, Bolsa, Venda Loja, Prestação Serviço)
4) Depois: PDF e assinatura

---
## SQL conclu├¡do

- Cria├º├úo do conceito can├┤nico **Unidade de Execu├º├úo**:
  - Tabela `escola_unidades_execucao`
  - Campos principais:
    - `unidade_execucao_id`
    - `servico_id`
    - `denominacao` (ex.: Turma, Grupo, Elenco, Coreografia, Personagem)
    - `nome`
    - `origem_tipo` (TURMA, GRUPO, ELENCO, COREOGRAFIA, etc.)
    - `origem_id`
    - `ativo`
- Backfill autom├ítico:
  - Todas as `turmas` existentes foram convertidas em **Unidades de Execu├º├úo**
  - `origem_tipo = 'TURMA'`
  - `origem_id = turmas.turma_id`
- Cria├º├úo do pivot:
  - `matricula_tabelas_unidades_execucao`
  - Relaciona **0..N unidades de execu├º├úo** por tabela de pre├ºos
  - Regra: pivot vazio = tabela v├ílida para **todas** as unidades do servi├ºo

---

## APIs conclu├¡das

### Servi├ºos e Unidades de Execu├º├úo
- `GET /api/matriculas/tabelas/servicos`
  - Lista servi├ºos por categoria:
    - CURSO_REGULAR
    - CURSO_LIVRE
    - PROJETO_ARTISTICO
- `GET /api/matriculas/tabelas/unidades-execucao?servico_id=`
  - Lista unidades de execu├º├úo do servi├ºo
  - Label padronizado:
    - `<Denomina├º├úo>: <Nome> [UE: <id>]`

### Tabelas de Pre├ºos
- `POST /api/matriculas/tabelas`
- `PUT /api/matriculas/tabelas/[id]`
  - Novo modelo aceito:
    - `servico_tipo`
    - `servico_id`
    - `unidade_execucao_ids[]`
  - Compatibilidade tempor├íria mantida com:
    - `alvo_tipo`
    - `alvo_ids`
- Salvamento correto:
  - Refer├¬ncia can├┤nica no servi├ºo
  - Escopo por unidade de execu├º├úo via pivot

### Precifica├º├úo
- `GET /api/matriculas/precos/resolver`
  - Alinhado ao modelo **Servi├ºo + Unidade de Execu├º├úo**
  - Fluxo:
    1. Resolve `servico_id`
    2. Resolve `unidade_execucao_id`
    3. Busca tabela ativa por servi├ºo + ano
    4. Valida escopo pelo pivot
    5. Tenta aplicar tier (quando existir)
    6. **Fallback para MENSALIDADE/RECORRENTE** quando n├úo h├í tier
  - Retornos:
    - `200` quando precifica├º├úo v├ílida
    - `409` quando n├úo h├í cobertura financeira (regra de neg├│cio)

---

## P├íginas / componentes conclu├¡dos

### Administra├º├úo ÔÇö Tabelas de Pre├ºos
- Nova tabela de pre├ºos:
  - Fluxo: **Categoria do servi├ºo ÔåÆ Servi├ºo ÔåÆ Unidades de Execu├º├úo**
  - Op├º├úo:
    - ÔÇ£Aplicar a todas as unidades de execu├º├úo deste servi├ºoÔÇØ
- Editar tabela:
  - Carregamento correto de:
    - categoria
    - servi├ºo
    - unidades selecionadas
  - Feedback visual de sucesso/erro
- Admin Matriculas: refatoradas telas de Planos de Pagamento (detalhe), Tabelas de Precos (lista) e Tabela de Precos (detalhe) para o padrao PageHeader/SectionCard/ToolbarRow.

### Escola ÔÇö Nova Matr├¡cula
- Matr├¡cula funcionando ponta a ponta:
  - Sele├º├úo de aluno e respons├ível
  - Sele├º├úo de curso (servi├ºo)
  - Sele├º├úo de turma (unidade de execu├º├úo)
  - Ano de refer├¬ncia validado
- Resumo final exibindo:
  - Tabela aplicada
  - Mensalidade aplicada
  - Plano de pagamento
- Debounce implementado no resolver para evitar m├║ltiplas chamadas simult├óneas

---

## Pend├¬ncias

- Ajuste pontual em `/api/pessoas/[id]`:
  - Adequar uso de `await ctx.params` (Next.js 15)
- Refinamentos de UX:
  - Reduzir logs visuais de 409 intermedi├írios no console
  - Ajustar textos de ajuda na matr├¡cula nova

---

## Bloqueios
Nenhum bloqueio t├®cnico ativo no m├│dulo de Matr├¡culas.

---

## Vers├úo do sistema
Sistema Conex├úo Dan├ºa ÔÇö Matr├¡culas  
Vers├úo l├│gica: **v1.0 (Servi├ºo + Unidade de Execu├º├úo)**

---

## Pr├│ximas a├º├Áes

1. Planejar regra avan├ºada de **pacote / m├║ltiplas modalidades (tier din├ómico)**
   - Contagem de matr├¡culas ativas por aluno
   - Reprecifica├º├úo prospectiva
2. Refinar UX da Matr├¡cula Nova
3. Avan├ºar para:
   - Projeto Art├¡stico (cria├º├úo de unidades de execu├º├úo espec├¡ficas)
   - V├¡nculo de matr├¡cula diretamente ├á `unidade_execucao_id`

---

## Atualizacoes recentes (2025-12-28)

- Tier dinamico em preco: tabelas `financeiro_tier_grupos` e `financeiro_tiers` + vinculo em `escola_produtos_educacionais.tier_grupo_id`.
- Resolver de precos com fallback MENSALIDADE/RECORRENTE permanece e agora aplica tier dinamico quando houver grupo ativo.
- UI operacional: `/escola/matriculas` (lista) e `/escola/matriculas/[id]` (detalhe) com resolucao de servico e UE.
- Labels de UE padronizadas via helper `formatUnidadeExecucaoLabel`.

- Refatoracao UX: Lista operacional de matriculas (/escola/matriculas) agora exibe aluno, responsavel, servico, turma/UE (nome curto + tooltip), status e resumo por servico.


- Criado padrao-base de paginas operacionais (PageHeader/SectionCard/ToolbarRow) e aplicado em /escola/matriculas.

- Pessoas: adicionada aba "Dados escolares" (matriculas/vinculos) em /pessoas/[id] e bloco de vinculos em /pessoas/[id]/curriculo.

## Atualizacoes recentes (Documentos - 2026-01-02)

- Variaveis por introspeccao do schema: root_table + join_path (ate 3 saltos) + target_table/target_column.
- RPCs de schema: documentos_schema_columns, documentos_schema_table_columns, documentos_schema_fks, documentos_schema_adj.
- RPC de resolucao: documentos_resolver_por_join_path (resolve valor por matricula_id).
- Emissao resolve variaveis via join_path quando root_table esta preenchido.
- UI de variaveis com wizard de joins e selecao de coluna final.

## Atualizacoes recentes (Documentos - 2026-01-03)

- Banco de imagens: catalogo + upload em Storage (bucket documentos-imagens) e seletor no RichTextEditor.
- Layouts reutilizaveis: documentos_layouts + layout_id em documentos_modelo.
- Emissao congela cabecalho/rodape do layout no documentos_emitidos (nao muda apos edicao).
- Layout fisico HEADER/BODY/FOOTER: templates dedicados e alturas no modelo (header/footer/page margin).
- Emissao agora congela header_html/footer_html e alturas no documentos_emitidos.
- Sanitizacao do HTML emitido remove estilos de background do corpo (MVP).

## Atualizacoes recentes (Documentos - 2026-01-03 - Colecoes)

SQL concluido:

- Documentos: catalogo de colecoes e colunas (documentos_colecoes / documentos_colecoes_colunas) + seeds iniciais.

APIs concluidas:

- GET /api/documentos/colecoes/catalogo
- POST /api/documentos/colecoes/resolve

Paginas/componentes concluidos:

- /admin/config/documentos/colecoes (catalogo institucional, somente leitura)
- Editor de modelos com insercao assistida de colecoes (modal + tabela padrao)

Pendencias:

- Evoluir registry de resolvers (retirar hardcode e organizar por modulos)
- Criar colecoes adicionais (parcelas com vencimento, se houver fonte especifica)

## Atualizacoes recentes (Matriculas/Documentos - 2026-01-04)

SQL concluido:

- Matriculas: ledger canonico de linhas financeiras (`matriculas_financeiro_linhas`).
- Documentos: novas colecoes `MATRICULA_ENTRADAS` e `MATRICULA_PARCELAS` (seeds no catalogo).

APIs concluidas:

- Liquidacao de matricula grava ledger para ENTRADA e LANCAMENTO_CREDITO.
- Resolver de colecoes usa ledger para ENTRADAS/PARCELAS e prioriza ledger em LANCAMENTOS_CREDITO.

Paginas:

- Detalhe de matricula exibe resumo financeiro baseado no ledger.

Pendencias:

- Backfill/geracao de parcelas no ledger a partir da fonte real (cobrancas/planos).

## Atualizacoes recentes (Documentos/Matrículas - 2026-01-05)

APIs concluidas:

- Normalizacao de operacaoTipo no pipeline de documento emitido (matricula).
- Log temporario (flag DOCS_EMIT_DEBUG=1) para diagnostico de colecoes no emitido.

Paginas:

- /escola/matriculas/[id]/documentos (lista de emitidos com links).
- Bloco Documentos no detalhe da matricula (atalhos para listar/emitir).

## Atualizacoes recentes (Matriculas - 2026-01-06)

APIs concluidas:

- Detalhe da matricula agrega resumo do Cartao Conexao (parcelas pendentes e proximo vencimento).

Paginas:

- Resumo financeiro da matricula usa o agregado do Cartao Conexao para parcelas/vencimento.

## Atualizacoes recentes (Documentos/Matrículas - 2026-01-07)

- Listagem de emitidos por matricula usa o campo correto `documentos_emitidos.contrato_modelo_id`.
- Detalhe da matricula exibe documentos emitidos e linka para o admin.
- Botao "Ver documentos" aponta para `/escola/matriculas/[id]/documentos`.

## Atualizacoes recentes (Documentos - 2026-01-08)

- Contexto do emitido agora inclui colecao `parcelas[]` para templates (dados do Cartao Conexao).
- Recarregar emitido recalcula parcelas via `matriculas_financeiro_linhas` e atualiza o HTML.

## Atualizacoes recentes (Diagnostico - 2026-01-09)

- RPC `admin_schema_snapshot` criada para snapshot seguro do schema (service_role).
- Rota `/api/internal/schema` usa a RPC para diagnostico de documentos.
- Pagina `/admin/diagnostico/schema` exibe o JSON e permite copiar.

## Atualizacoes recentes (Documentos - 2026-01-10)

- Admin Documentos: Colecoes agora listam e permitem edicao (metadados + colunas).
- Variaveis: secao de colecoes com atalho para edicao.
- Modelos: editor mostra colecoes detectadas no template (padroniza codigo usado).

## Atualizacoes recentes (Documentos - 2026-01-11)

- Detector de colecoes nao depende de conjuntos/grupos para carregar modelos.
- Tabela `documentos_conjuntos_grupos` criada como base minima (quando ausente).

## Atualizacoes recentes (Documentos - 2026-01-12)

- Resolver de colecoes: root Matricula usa matricula_id como origem.
- Colecao MATRICULA_LANCAMENTOS_CREDITO busca no ledger e faz fallback para credito_conexao_lancamentos.
- Origem_sistema usada: MATRICULA (com fallback MATRICULAS).

## Atualizacoes recentes (Documentos - 2026-01-14)

- Fonte de parcelas no emitido: usa a mesma base do resumo financeiro (credito_conexao_lancamentos).
- Colecao MATRICULA_PARCELAS usa matricula_id como origem e injeta chave exata no contexto.
- Recarregar emitido busca o modelo atual (contrato_modelo_id) antes de renderizar.

## Atualizacoes recentes (Documentos - 2026-01-15)

- Preview do emitido renderiza com o contexto final (inclui colecoes).
- Log de confirmacao inclui chaves do contexto e tamanho de MATRICULA_PARCELAS.
- POST de recarregar emitido retorna JSON mesmo em erro (sem ReferenceError).
- Page do emitido aguarda params (corrige warning do Next.js).

## Atualizacoes recentes (Documentos - 2026-01-16)

- POST de recarregar emitido inclui bloco debug no JSON quando DOCS_EMIT_DEBUG=1.
- UI do emitido exibe painel Debug (recarregar) quando a resposta traz debug.
- Preview do emitido agora aplica o HTML retornado pelo POST de recarregar.
- Debug do recarregar inclui htmlLen/primeiraParcela e o preview mostra o HTML len.
- Preview usa fallback apenas quando previewHtml vazio e debug sempre mostra payload apos recarregar.
- Contrato de matricula usa vencimento nas parcelas e remove status da colecao MATRICULA_PARCELAS.

## Atualizacoes recentes (Matriculas - 2026-01-04)

- Contexto de matricula criado (escola_contextos_matricula) e turmas agora apontam contexto_matricula_id.
- API: GET /api/matriculas/contextos e /api/matriculas/contextos/[id]/unidades-execucao.
- Turmas: criacao/edicao exige contexto_matricula_id (REGULAR resolve periodo letivo automaticamente).
- Escola > Nova matricula: seleciona contexto, lista UEs do contexto e permite selecao multipla em REGULAR.
- Periodo letivo / Curso livre / Projeto artistico agora sao ancoras formais de matricula.

## Atualizacoes recentes (Matriculas - 2026-01-18)

- Turmas: contexto_matricula_id reforcado como referencia principal de contexto (FK e indice).
- Novo ledger de previsao: tabela `matriculas_compromissos_previstos` com snapshot financeiro.
- API: `POST /api/credito-conexao/gerar-lancamentos-mensais` (lancamentos por turma no contexto).
- API: `POST /api/matriculas/preview-financeiro` (snapshot de compromisso previsto).
- Matrícula nova: suporte a Projeto artistico na selecao de tipo e resumo de contexto.

## Atualizacoes recentes (Credito Conexao - 2026-01-19)

- SQL: unicidade de fatura por conta+periodo_referencia (cc_faturas_unique_conta_periodo).
- Lib: helper de fechamento mensal em src/lib/creditoConexao/fechamento.ts (idempotencia por competencia).
- API: POST /api/credito-conexao/fechar-fatura (fecha 1 conta por competencia).
- API: POST /api/credito-conexao/fechar-faturas (lote por competencia).

## Atualizacoes recentes (Credito Conexao - 2026-01-20)

- SQL: tabela credito_conexao_configuracoes (ciclo, tolerancia, multa e juros por tipo_conta).
- API: GET/PUT /api/admin/credito-conexao/configuracoes.
- UI: /admin/financeiro/credito-conexao/configuracoes com card de ciclo/politica + regras de parcelamento.
