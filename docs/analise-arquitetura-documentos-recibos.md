# Analise tecnica - arquitetura final de Documentos para recibos financeiros

Data: 2026-03-07

## Escopo desta fase

Esta fase nao implementa novas regras produtivas.

Objetivo:

- mapear o estado atual do modulo Documentos e do fluxo oficial de recibos;
- separar o que ja e generico do que ainda esta acoplado a recibos;
- propor a arquitetura final do dominio Documentos;
- definir a ordem recomendada da proxima execucao SQL -> API -> Paginas.

## Estado atual mapeado

### Fluxo oficial de recibo por recebimento ja existente

Arquivos analisados:

- `C:\Users\aliri\conexao-dados\src\app\api\documentos\recibos\recebimento\route.ts`
- `C:\Users\aliri\conexao-dados\src\app\api\documentos\recibos\recebimento\preview\route.ts`
- `C:\Users\aliri\conexao-dados\src\components\documentos\recibos\GerarReciboButton.tsx`
- `C:\Users\aliri\conexao-dados\src\lib\documentos\recibos\montar-recibo-por-recebimento.ts`
- `C:\Users\aliri\conexao-dados\src\lib\documentos\recibos\mapear-variaveis-recibo.ts`
- `C:\Users\aliri\conexao-dados\src\lib\documentos\recibos\emitir-recibo-por-recebimento.ts`

Comportamento atual:

- o recibo principal ja nasce de `public.recebimentos`;
- o snapshot financeiro ja e montado server-side;
- a persistencia ja acontece em `public.documentos_emitidos`;
- o modelo ativo ja e lido em `public.documentos_modelo`;
- o preview autenticado ja existe, mas ainda usa montagem HTML especifica do caso de recibo;
- a UI ja possui um botao funcional de emissao.

### Estrutura atual do dominio Documentos

Tabelas e camadas mapeadas:

- `public.documentos_tipos`
- `public.documentos_conjuntos`
- `public.documentos_grupos`
- `public.documentos_modelo`
- `public.documentos_emitidos`
- `public.documentos_emitidos_termos`
- `public.documentos_variaveis`
- `public.documentos_layouts`
- `public.documentos_layout_templates`
- `public.documentos_colecoes`
- `public.documentos_colecoes_colunas`

Arquivos de apoio analisados:

- `C:\Users\aliri\conexao-dados\src\app\api\documentos\emissao\contexto\route.ts`
- `C:\Users\aliri\conexao-dados\src\app\api\documentos\emissao\emitir\route.ts`
- `C:\Users\aliri\conexao-dados\src\app\api\documentos\emitidos\route.ts`
- `C:\Users\aliri\conexao-dados\src\app\api\documentos\recibos\conta\route.ts`
- `C:\Users\aliri\conexao-dados\src\app\api\documentos\recibos\preview\route.ts`
- `C:\Users\aliri\conexao-dados\src\app\api\documentos\recibos\gerar-pdf\route.ts`
- `C:\Users\aliri\conexao-dados\src\lib\documentos\templateRenderer.ts`
- `C:\Users\aliri\conexao-dados\src\lib\documentos\sanitizeHtml.ts`
- `C:\Users\aliri\conexao-dados\src\lib\documentos\documentos-variaveis.ts`
- `C:\Users\aliri\conexao-dados\src\lib\documentos\operacaoTipos.ts`
- `C:\Users\aliri\conexao-dados\src\components\documentos\ReciboModal.tsx`
- `C:\Users\aliri\conexao-dados\src\components\documentos\ReciboBusca.tsx`
- `C:\Users\aliri\conexao-dados\src\components\documentos\RecibosContaConexao.tsx`

Migrations relevantes do schema atual:

- `C:\Users\aliri\conexao-dados\supabase\migrations\20251230_0001_contratos_mvp.sql`
- `C:\Users\aliri\conexao-dados\supabase\migrations\20260101_0100_rename_contratos_para_documentos.sql`
- `C:\Users\aliri\conexao-dados\supabase\migrations\20260102_0005_documentos_tipos_e_fk_modelo.sql`
- `C:\Users\aliri\conexao-dados\supabase\migrations\20260102_0006_documentos_modelos_tipo_e_grupo.sql`
- `C:\Users\aliri\conexao-dados\supabase\migrations\20260102_1600_documentos_layouts.sql`
- `C:\Users\aliri\conexao-dados\supabase\migrations\20260103_0100_documentos_layout_templates.sql`
- `C:\Users\aliri\conexao-dados\supabase\migrations\20260224_01_documentos_recibo_mensalidade.sql`
- `C:\Users\aliri\conexao-dados\supabase\migrations\20260226_01_documentos_busca_recibo_view.sql`
- `C:\Users\aliri\conexao-dados\supabase\migrations\20260307_02_documentos_recibos_recebimentos.sql`

## Diagnostico tecnico do estado atual

### O que ja esta generico e reaproveitavel

1. `documentos_modelo` ja e um repositrio de templates versionados.
   - suporta `texto_modelo_md`, `conteudo_html`, `formato`, `placeholders_schema_json`, `layout_id`, `header_template_id`, `footer_template_id`.

2. `documentos_emitidos` ja e a tabela canonica de instancias emitidas.
   - ja guarda conteudo resolvido, snapshot, variaveis, hash, status, html final e metadata de layout.

3. `documentos_tipos`, `documentos_conjuntos` e `documentos_grupos` ja formam a base de catalogo institucional.

4. `documentos_layouts` e `documentos_layout_templates` ja oferecem uma camada reutilizavel de layout institucional.

5. `templateRenderer.ts` e `sanitizeHtml.ts` ja sao utilitarios genericos do motor documental.

6. `documentos_variaveis` ja existe como catalogo global do dominio.

7. `api/documentos/emissao/contexto` ja expressa uma ideia generica de conjuntos, grupos e modelos por operacao.

### O que ainda esta acoplado a recibo

1. `montar-recibo-por-recebimento.ts`
   - conhece diretamente `recebimentos`, `cobrancas`, `matriculas`, `pessoas`, `centros_custo` e `vw_financeiro_cobrancas_operacionais`;
   - isso e correto para o builder do snapshot, mas ainda nao esta encaixado num pipeline documental mais generico de `origem -> snapshot -> variaveis`.

2. `emitir-recibo-por-recebimento.ts`
   - mistura tres responsabilidades:
     - montar preview;
     - resolver layout;
     - persistir emitido.
   - isso deve virar pipeline generico com estagios mais claros.

3. selecao do modelo de recibo
   - ainda depende de heuristica por `observacoes ilike '%RECIBO_MENSALIDADE%'` e fallback por `titulo ilike '%Recibo%'`;
   - isso e fragil e deveria ser substituido por tipo/operacao/codigo canonico.

4. bloqueio por `matricula_id`
   - o fluxo atual exige matricula resolvida para persistir;
   - isso atende o legado de `documentos_emitidos`, mas limita recibos financeiros que poderiam nascer de outro contexto documental no futuro.

### O que ainda esta hardcoded

1. `api/documentos/recibos/recebimento/preview`
   - gera HTML wrapper fixo com CSS inline.
   - isso deveria vir de um renderer institucional comum.

2. `mapear-variaveis-recibo.ts`
   - embute aliases especificos como `PAGADOR_CPF`, `ALUNO_NOME`, `ESCOLA_NOME`, `CIDADE_DATA`.
   - parte disso e desejavel por compatibilidade, mas precisa migrar para catalogo formal de variaveis.

3. `api/documentos/recibos/preview` e `api/documentos/recibos/gerar-pdf`
   - mantem fluxo paralelo com HTML fixo de conta interna e cobranca avulsa;
   - esse fluxo ainda nao consome o mesmo motor oficial.

4. `GerarReciboButton.tsx`
   - conhece especificamente a rota de recibo por recebimento;
   - no estado final, o botao ideal deve receber uma acao documental genrica e um descriptor de operacao.

5. `ReciboModal.tsx`
   - ainda esta acoplado ao preview antigo e a ideia de "Gerar PDF" que hoje retorna apenas HTML validado.

### O que pode ser reaproveitado no motor documental final

1. `documentos_modelo`
2. `documentos_emitidos`
3. `documentos_tipos`
4. `documentos_conjuntos`
5. `documentos_grupos`
6. `documentos_variaveis`
7. `documentos_layouts`
8. `documentos_layout_templates`
9. `templateRenderer.ts`
10. `sanitizeHtml.ts`
11. o snapshot financeiro ja montado pelo builder de recibo
12. o preview autenticado como conceito

## Proposta da estrutura final do dominio Documentos

### 1. `documentos_tipos`

Papel no dominio:

- classificar a natureza do documento.

Campos principais:

- `tipo_documento_id`
- `codigo`
- `nome`
- `descricao`
- `ativo`
- `created_at`
- `updated_at`

Relacionamentos:

- 1:N com `documentos_modelo`

Versionamento e auditoria:

- sem versionamento por linha;
- alteracoes relevantes devem ir para auditoria administrativa.

Observacao:

- tabela ja existe e deve ser reaproveitada.

### 2. `documentos_operacoes`

Papel no dominio:

- registrar o contexto gerador do documento.
- responder "qual evento administrativo/financeiro esta gerando este documento?".

Campos principais propostos:

- `operacao_id`
- `codigo`
- `nome`
- `descricao`
- `dominio_origem`
- `ativo`
- `permite_reemissao`
- `snapshot_strategy`
- `created_at`
- `updated_at`

Relacionamentos:

- N:N com `documentos_conjuntos`
- 1:N com `documentos_emitidos` por operacao resolvida

Versionamento e auditoria:

- sem versionamento por linha;
- mudancas de estrategia devem ser auditadas.

Observacao:

- tabela ainda nao existe;
- hoje o conceito esta espalhado em `operacaoTipos.ts`, conjuntos e heuristicas de rota.

### 3. `documentos_conjuntos`

Papel no dominio:

- agrupar documentos institucionais por operacao.

Campos principais esperados:

- `id`
- `codigo`
- `nome`
- `descricao`
- `ativo`
- `ordem`

Relacionamentos:

- 1:N com `documentos_grupos`
- N:N com `documentos_operacoes`

Versionamento e auditoria:

- versao conceitual pode ser controlada por auditoria;
- o conjunto em si nao precisa gerar copias a cada alteracao.

Observacao:

- tabela ja existe e deve ser reaproveitada.

### 4. `documentos_grupos`

Papel no dominio:

- organizar blocos documentais dentro do conjunto.

Campos principais:

- `id`
- `conjunto_id`
- `codigo`
- `nome`
- `descricao`
- `papel`
- `obrigatorio`
- `ordem`
- `ativo`

Relacionamentos:

- N:1 com `documentos_conjuntos`
- N:N com `documentos_modelo`

Versionamento e auditoria:

- auditoria de alteracoes de ordem, obrigatoriedade e papel.

Observacao:

- tabela ja existe e deve ser reaproveitada.

### 5. `documentos_cabecalhos`

Papel no dominio:

- normalizar cabecalhos institucionais reutilizaveis.

Campos principais propostos:

- `cabecalho_id`
- `codigo`
- `nome`
- `html`
- `css_inline`
- `height_px`
- `ativo`
- `versao`
- `tags`
- `created_at`
- `updated_at`

Relacionamentos:

- 1:N com `documentos_modelo`
- opcionalmente 1:N com `documentos_emitidos` quando o cabecalho for "congelado" na emissao

Versionamento e auditoria:

- precisa versao explicita;
- troca de versao nao deve alterar documentos ja emitidos.

Observacao:

- hoje esse papel esta parcialmente coberto por `documentos_layout_templates` com `tipo = HEADER`.
- recomendacao: migrar conceitualmente sem quebrar a tabela atual, podendo usar view ou rename no futuro.

### 6. `documentos_rodapes`

Papel no dominio:

- normalizar rodapes institucionais reutilizaveis.

Campos principais propostos:

- `rodape_id`
- `codigo`
- `nome`
- `html`
- `css_inline`
- `height_px`
- `ativo`
- `versao`
- `tags`
- `created_at`
- `updated_at`

Relacionamentos:

- 1:N com `documentos_modelo`
- opcionalmente 1:N com `documentos_emitidos`

Versionamento e auditoria:

- mesmo criterio do cabecalho.

Observacao:

- hoje esse papel esta parcialmente coberto por `documentos_layout_templates` com `tipo = FOOTER`.

### 7. `documentos_variaveis`

Papel no dominio:

- catalogo global de placeholders oficiais do motor documental.

Campos principais esperados:

- `id`
- `codigo`
- `descricao`
- `display_label`
- `origem`
- `tipo`
- `formato`
- `ativo`
- `ai_gerada`
- `created_at`
- `updated_at`

Relacionamentos:

- uso logico por `documentos_modelo`
- uso efetivo por `documentos_emitidos` via `variaveis_utilizadas_json`

Versionamento e auditoria:

- alteracoes de formato/origem devem ser auditadas;
- exclusao logica preferivel a remocao fisica.

Observacao:

- tabela ja existe e deve ser a base oficial dos placeholders.

### 8. `documentos_modelo`

Papel no dominio:

- armazenar o corpo versionado do documento e sua configuracao de layout.

Campos principais atuais e futuros:

- `id`
- `titulo`
- `versao`
- `formato`
- `texto_modelo_md`
- `conteudo_html`
- `placeholders_schema_json`
- `tipo_documento_id`
- `layout_id`
- `header_template_id`
- `footer_template_id`
- `cabecalho_html`
- `rodape_html`
- `header_height_px`
- `footer_height_px`
- `page_margin_mm`
- `observacoes`
- `ativo`

Relacionamentos:

- N:1 com `documentos_tipos`
- N:1 com `documentos_layouts`
- N:1 com `documentos_cabecalhos` ou `documentos_layout_templates`
- N:1 com `documentos_rodapes` ou `documentos_layout_templates`
- N:N com `documentos_grupos`

Versionamento e auditoria:

- a versao do modelo deve ser imutavel para documentos ja emitidos;
- edicao deve gerar nova versao logica, nao alterar historico retroativamente.

Observacao:

- tabela ja existe e e o ponto central reaproveitavel.

### 9. `documentos_emitidos`

Papel no dominio:

- registrar a instancia canonica emitida.

Campos principais atuais e futuros:

- `id`
- `contrato_modelo_id`
- `matricula_id`
- `documento_conjunto_id`
- `documento_grupo_id`
- `recebimento_id`
- `status_assinatura`
- `conteudo_renderizado_md`
- `conteudo_template_html`
- `conteudo_resolvido_html`
- `cabecalho_html`
- `rodape_html`
- `header_html`
- `footer_html`
- `header_height_px`
- `footer_height_px`
- `page_margin_mm`
- `variaveis_utilizadas_json`
- `snapshot_financeiro_json`
- `contexto_json`
- `hash_conteudo`
- `pdf_url`
- `created_by`
- `created_at`
- `updated_at`
- `editado_manual`

Relacionamentos:

- N:1 com `documentos_modelo`
- N:1 com `documentos_conjuntos`
- N:1 com `documentos_grupos`
- N:1 com `matriculas`
- N:1 com `recebimentos`
- futuramente N:1 com `documentos_operacoes`

Versionamento e auditoria:

- o emitido e imutavel como evidencia;
- reemissao deve gerar novo registro;
- reimpressao reutiliza o mesmo registro e o mesmo snapshot.

Observacao:

- tabela ja existe e deve continuar como instancia canonica.

## Pipeline oficial de emissao proposto

### 1. Resolver contexto de origem

Entrada:

- `tipo_operacao`
- `origem_id`
- `opcoes`

Exemplos:

- `RECEBIMENTO_CONFIRMADO` + `recebimento_id`
- `CONTA_INTERNA_COMPETENCIA` + `pessoa_id + competencia`

Saida:

- `documento_operacao_contexto`

### 2. Gerar `snapshot_documento`

Regra:

- o snapshot e fechado, serializavel e auditavel;
- nao deve depender de consultas posteriores para renderizacao.

Conteudo:

- ids de negocio;
- dados da pessoa;
- dados financeiros;
- labels resolvidas;
- metadata de auditoria;
- indicadores de bloqueio/gaps.

### 3. Resolver `variaveis_documento`

Regra:

- toda variavel usada no template deve vir do snapshot;
- aliases antigos podem existir, mas o catalogo oficial deve apontar para uma origem canonica.

Saida:

- `Record<string, string | number | boolean | null>`

### 4. Montar HTML institucional

Etapas:

- carregar modelo;
- resolver cabecalho;
- resolver corpo;
- resolver rodape;
- aplicar sanitizacao;
- congelar o HTML final da emissao.

### 5. Gerar preview autenticado

Regra:

- preview autentica o acesso, mas ainda nao grava o documento;
- usa o mesmo pipeline do emit, sem duplicar logica.

### 6. Confirmar emissao

Regra:

- confirmacao final persiste o documento emitido;
- se houver politica de idempotencia, ela deve ser avaliada aqui.

### 7. Persistir em `documentos_emitidos`

Persistir sempre:

- snapshot;
- variaveis;
- html resolvido;
- referencias de modelo;
- referencias da operacao;
- hash de conteudo;
- metadata de auditoria.

### 8. Gerar PDF final

Regra:

- o PDF deve ser derivado do HTML congelado do emitido;
- nunca deve regenerar variaveis fora do snapshot persistido.

### 9. Permitir reemissao com historico

Regra:

- reemissao gera um novo `documentos_emitidos`;
- deve carregar o snapshot original ou um novo snapshot conforme politica da operacao.

## Padrao proposto para cabecalho e rodape

### Cabecalho reutilizavel

Blocos recomendados:

- logomarca institucional
- nome oficial da instituicao
- identificacao do tipo documental
- metadata visual opcional:
  - numero do documento
  - competencia
  - data de emissao

### Rodape reutilizavel

Blocos recomendados:

- identificacao institucional resumida
- hash/verificador do documento
- QR code de validacao futura
- data/hora de emissao
- politica de autenticidade ou canal de verificacao

### Politica de reaproveitamento

- recibo, declaracao, contrato e comprovante devem compartilhar a mesma camada institucional;
- o corpo e especifico por tipo documental;
- cabecalho e rodape sao configuracoes independentes e versionadas.

### QR code / hash / validacao digital

Recomendacao:

- incluir `hash_conteudo` como ancora minima obrigatoria;
- evoluir para QR code com URL de validacao publica ou autenticada;
- manter o hash tambem no rodape textual para conferencia offline.

### Separacao entre layout institucional e corpo

Regra obrigatoria:

- cabecalho/rodape pertencem ao layout institucional;
- corpo pertence ao modelo;
- snapshot e variaveis nunca devem ficar espalhados em HTML hardcoded de rota.

## Governanca das variaveis

### Padrao de placeholder

Padrao oficial:

- `{{codigo_variavel}}`

### Catalogo global

Cada variavel deve ter:

- `codigo`
- `descricao`
- `origem`
- `tipo`
- `formato`
- `exemplo`
- `ativo`

### Regra de origem

Toda variavel deve apontar para uma origem unica:

- SNAPSHOT_DOCUMENTO
- METADATA_EMISSAO
- CONFIG_INSTITUCIONAL

### Snapshot como fonte de renderizacao

Regra obrigatoria:

- o renderer final so consome snapshot persistido + variaveis resolvidas;
- apos emissao, nao deve haver consulta dinamica para recompor texto.

### Politica anti-acoplamento

- rotas nao devem montar texto documental manualmente;
- helpers financeiros nao devem conhecer detalhes do template;
- alias legados devem ser tratados como compatibilidade, nao como desenho principal.

## Reemissao e historico

### Reimpressao

Definicao:

- reusa o mesmo `documentos_emitidos`;
- recalcula apenas a saida visual, se necessario, a partir do HTML congelado.

Quando usar:

- abrir novamente;
- baixar PDF de novo;
- reenviar o mesmo documento.

### Reemissao

Definicao:

- gera um novo `documentos_emitidos`;
- pode usar o snapshot original ou um novo snapshot, conforme regra da operacao.

Quando usar:

- modelo mudou e a instituicao quer uma nova versao;
- houve correcao administrativa;
- houve anulacao seguida de nova emissao.

### Politica de historico

- nunca sobrescrever o emitido original;
- manter encadeamento:
  - `documento_origem_id`
  - `motivo_reemissao`
  - `tipo_relacao` (`REEMISSAO`, `SUBSTITUICAO`, `ANULACAO`)

Observacao:

- esses campos ainda nao existem e entram como sugestao da proxima etapa SQL.

## Ordem recomendada de implementacao

### 1. SQL

- normalizar operacoes documentais;
- fechar a camada de cabecalho/rodape reutilizavel;
- preparar historico de reemissao sem quebrar `documentos_emitidos`.

### 2. API

- extrair pipeline generico de emissao;
- unificar preview, emissao e PDF em torno do mesmo snapshot;
- substituir heuristicas de selecao de modelo por tipo/operacao/codigo.

### 3. Paginas / componentes

- criar pagina oficial de preview autenticado;
- padronizar botao e drawer/modal de emissao;
- permitir abertura, reimpressao e reemissao com trilha clara.

## Proxima etapa SQL exata

Proxima etapa SQL recomendada:

1. criar `public.documentos_operacoes`;
2. criar tabela pivor `public.documentos_operacoes_conjuntos`;
3. adicionar em `public.documentos_emitidos` os campos:
   - `operacao_id`
   - `origem_tipo`
   - `origem_id`
   - `documento_origem_id`
   - `motivo_reemissao`
   - `tipo_relacao_documental`
4. decidir se `documentos_cabecalhos` e `documentos_rodapes` nascem como tabelas novas ou como evolucao controlada de `documentos_layout_templates`.

Recomendacao objetiva:

- a primeira migration do proximo chat deve focar em `documentos_operacoes` + historico de reemissao;
- cabecalho e rodape podem entrar na migration seguinte se a equipe optar por manter compatibilidade com `documentos_layout_templates`.
