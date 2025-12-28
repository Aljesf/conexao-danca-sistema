# estado-atual-do-projeto.md

## Módulo atual
Matrículas — Tabelas de Preços e Precificação (Serviço + Unidade de Execução)

---

## SQL concluído

- Criação do conceito canônico **Unidade de Execução**:
  - Tabela `escola_unidades_execucao`
  - Campos principais:
    - `unidade_execucao_id`
    - `servico_id`
    - `denominacao` (ex.: Turma, Grupo, Elenco, Coreografia, Personagem)
    - `nome`
    - `origem_tipo` (TURMA, GRUPO, ELENCO, COREOGRAFIA, etc.)
    - `origem_id`
    - `ativo`
- Backfill automático:
  - Todas as `turmas` existentes foram convertidas em **Unidades de Execução**
  - `origem_tipo = 'TURMA'`
  - `origem_id = turmas.turma_id`
- Criação do pivot:
  - `matricula_tabelas_unidades_execucao`
  - Relaciona **0..N unidades de execução** por tabela de preços
  - Regra: pivot vazio = tabela válida para **todas** as unidades do serviço

---

## APIs concluídas

### Serviços e Unidades de Execução
- `GET /api/matriculas/tabelas/servicos`
  - Lista serviços por categoria:
    - CURSO_REGULAR
    - CURSO_LIVRE
    - PROJETO_ARTISTICO
- `GET /api/matriculas/tabelas/unidades-execucao?servico_id=`
  - Lista unidades de execução do serviço
  - Label padronizado:
    - `<Denominação>: <Nome> [UE: <id>]`

### Tabelas de Preços
- `POST /api/matriculas/tabelas`
- `PUT /api/matriculas/tabelas/[id]`
  - Novo modelo aceito:
    - `servico_tipo`
    - `servico_id`
    - `unidade_execucao_ids[]`
  - Compatibilidade temporária mantida com:
    - `alvo_tipo`
    - `alvo_ids`
- Salvamento correto:
  - Referência canônica no serviço
  - Escopo por unidade de execução via pivot

### Precificação
- `GET /api/matriculas/precos/resolver`
  - Alinhado ao modelo **Serviço + Unidade de Execução**
  - Fluxo:
    1. Resolve `servico_id`
    2. Resolve `unidade_execucao_id`
    3. Busca tabela ativa por serviço + ano
    4. Valida escopo pelo pivot
    5. Tenta aplicar tier (quando existir)
    6. **Fallback para MENSALIDADE/RECORRENTE** quando não há tier
  - Retornos:
    - `200` quando precificação válida
    - `409` quando não há cobertura financeira (regra de negócio)

---

## Páginas / componentes concluídos

### Administração — Tabelas de Preços
- Nova tabela de preços:
  - Fluxo: **Categoria do serviço → Serviço → Unidades de Execução**
  - Opção:
    - “Aplicar a todas as unidades de execução deste serviço”
- Editar tabela:
  - Carregamento correto de:
    - categoria
    - serviço
    - unidades selecionadas
  - Feedback visual de sucesso/erro

### Escola — Nova Matrícula
- Matrícula funcionando ponta a ponta:
  - Seleção de aluno e responsável
  - Seleção de curso (serviço)
  - Seleção de turma (unidade de execução)
  - Ano de referência validado
- Resumo final exibindo:
  - Tabela aplicada
  - Mensalidade aplicada
  - Plano de pagamento
- Debounce implementado no resolver para evitar múltiplas chamadas simultâneas

---

## Pendências

- Ajuste pontual em `/api/pessoas/[id]`:
  - Adequar uso de `await ctx.params` (Next.js 15)
- Refinamentos de UX:
  - Reduzir logs visuais de 409 intermediários no console
  - Ajustar textos de ajuda na matrícula nova

---

## Bloqueios
Nenhum bloqueio técnico ativo no módulo de Matrículas.

---

## Versão do sistema
Sistema Conexão Dança — Matrículas  
Versão lógica: **v1.0 (Serviço + Unidade de Execução)**

---

## Próximas ações

1. Planejar regra avançada de **pacote / múltiplas modalidades (tier dinâmico)**
   - Contagem de matrículas ativas por aluno
   - Reprecificação prospectiva
2. Refinar UX da Matrícula Nova
3. Avançar para:
   - Projeto Artístico (criação de unidades de execução específicas)
   - Vínculo de matrícula diretamente à `unidade_execucao_id`

---

## Atualizacoes recentes (2025-12-28)

- Tier dinamico em preco: tabelas `financeiro_tier_grupos` e `financeiro_tiers` + vinculo em `escola_produtos_educacionais.tier_grupo_id`.
- Resolver de precos com fallback MENSALIDADE/RECORRENTE permanece e agora aplica tier dinamico quando houver grupo ativo.
- UI operacional: `/escola/matriculas` (lista) e `/escola/matriculas/[id]` (detalhe) com resolucao de servico e UE.
- Labels de UE padronizadas via helper `formatUnidadeExecucaoLabel`.

- Refatoracao UX: Lista operacional de matriculas (/escola/matriculas) agora exibe aluno, responsavel, servico, turma/UE (nome curto + tooltip), status e resumo por servico.


- Criado padrao-base de paginas operacionais (PageHeader/SectionCard/ToolbarRow) e aplicado em /escola/matriculas.

- Pessoas: adicionada aba "Dados escolares" (matriculas/vinculos) em /pessoas/[id] e bloco de vinculos em /pessoas/[id]/curriculo.

