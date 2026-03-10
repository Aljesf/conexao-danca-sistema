# Revisao SRS/UX - Documentos / Autoria

Data: 2026-03-10

## Escopo analisado

Telas principais:
- `src/app/(private)/admin/config/documentos/modelos/page.tsx`
- `src/app/(private)/admin/config/documentos/modelos/[id]/ModeloDocumentoEditarClient.tsx`
- `src/app/(private)/admin/config/documentos/variaveis/page.tsx`
- `src/app/(private)/admin/config/documentos/conjuntos/page.tsx`
- `src/app/(private)/admin/config/documentos/colecoes/page.tsx`

Componentes centrais mapeados:
- `src/components/documentos/AiAssistenteModelos.tsx`
- `src/components/documentos/DocumentoTemplateEditor.tsx`
- `src/components/documentos/ColecaoPickerModal.tsx`
- `src/components/ui/RichTextEditor/RichTextEditor`

## Diagnostico por tela

### Modelos - listagem e criacao

O que esta bom:
- a tela ja concentra os recursos centrais de criacao;
- existe integracao com variaveis, conjuntos e templates reutilizaveis;
- o editor rico e o assistente de IA aceleram o primeiro rascunho.

O que esta confuso:
- criacao de modelo mistura identidade, operacao, layout, conjuntos, preview mental e autoria do corpo na mesma etapa;
- o usuario precisa entender `tipo_documento`, `header template`, `footer template`, `grupo`, `ordem` e formato antes de ter clareza do que esta criando;
- a listagem mostra pouco contexto operacional e muito pouco criterio de ativacao/versionamento.

O que esta tecnico demais:
- alturas em px, margem em mm e detalhes de layout ficam expostos logo no cadastro inicial;
- conjuntos e grupos aparecem cedo demais para um fluxo que deveria comecar pelo documento em si.

O que esta duplicado:
- a tela de criacao e a tela de edicao repetem quase a mesma estrutura de campos;
- a autoria do corpo reaparece com pouca diferenca entre criar e editar.

O que esta visualmente pesado:
- formulario extenso, com muitas decisoes horizontais e sem progressao;
- ajuda e IA aparecem antes de uma estrutura clara do fluxo.

O que prejudica a operacao humana:
- alta carga cognitiva para usuarios que querem apenas criar um modelo funcional;
- falta de separacao entre modo simples e modo avancado.

### Modelos - edicao

O que esta bom:
- permite editar conteudo, vinculos e configuracoes sem trocar de tela;
- preserva o modelo atual e ja exibe vinculos existentes.

O que esta confuso:
- a secao `Schema de placeholders (JSON)` exposta como bloco principal sugere que o usuario precise governar JSON manualmente;
- o preview/teste do modelo nao esta acoplado diretamente ao ato de editar.

O que esta tecnico demais:
- JSON de schema como superficie primaria;
- linguagem de DB/CALC/MANUAL no subtitulo.

O que esta duplicado:
- os mesmos campos estruturais da criacao reaparecem com quase a mesma ordem;
- configuracoes de layout continuam misturadas com autoria do texto.

O que prejudica a operacao humana:
- a tela parece mais um painel tecnico do que um fluxo de autoria documental;
- a ausencia de preview contextual reduz confianca antes de ativar.

### Variaveis

O que esta bom:
- o wizard de joins tem potencia e cobre casos complexos;
- a listagem traz sinais de pendencia, formato e atividade;
- existe atalho para colecoes relacionadas.

O que esta confuso:
- a tela mistura cadastro operacional de variavel com modelagem de schema e exploracao tecnica de joins;
- a pergunta principal para o usuario nao e "qual dado eu quero usar?", mas sim "como navegar pelo schema?".

O que esta tecnico demais:
- root, PK, hops, `join_path`, `target_table`, `target_column`, labels tecnicos e caminho tecnico;
- a experiencia presume entendimento de relacionamento relacional.

O que esta duplicado:
- origem funcional, origem de join e nome humano disputam atencao;
- listagem exibe varios sinais tecnicos repetidos.

O que esta visualmente pesado:
- formulario longo, com secoes densas e pouco contraste entre essencial e avancado;
- a tela de variaveis acabou absorvendo parte da governanca de colecoes.

O que prejudica a operacao humana:
- operadores nao tecnicos tendem a evitar manutencao de variaveis;
- o cadastro simples nao esta protegido do modo avancado.

### Conjuntos e grupos

O que esta bom:
- a tela permite ver a arvore funcional de conjunto -> grupo -> modelos;
- o vinculo de modelos ao grupo esta acessivel no mesmo contexto.

O que esta confuso:
- uma unica tela tenta ser cadastro de conjunto, cadastro de grupo, edicao de conjunto, edicao de grupo e matriz de vinculacao de modelos;
- o conceito de conjunto, grupo, papel, obrigatoriedade, ordem e ativo aparece junto sem progressao.

O que esta tecnico demais:
- `papel`, `ordem`, `ativo` e gestao de vinculo ficam expostos em massa;
- a tela parece uma grade de administracao, nao uma organizacao semantica de documentos.

O que esta duplicado:
- formularios inline repetidos;
- muita repeticao de metadados por card.

O que esta visualmente pesado:
- cards dentro de cards dentro de blocos de edicao;
- excesso de controles inline no mesmo nivel visual.

O que prejudica a operacao humana:
- dificulta entender o que e estrutura semantica e o que e apenas parametrizacao tecnica;
- aumenta o risco de erro por edicao no lugar errado.

### Colecoes

O que esta bom:
- o catalogo mostra exemplos concretos de uso;
- editar colecao por selecao explicita reduz risco de edicao acidental.

O que esta confuso:
- a tela mistura catalogo, formulacao tecnica e microeditor de colunas;
- o usuario precisa entender root, codigo de bloco e colunas tecnicas ao mesmo tempo.

O que esta tecnico demais:
- nomenclatura de root e colunas ainda e muito orientada a implementacao;
- exemplos em template aparecem como suporte, mas nao como parte de uma jornada assistida.

O que esta duplicado:
- a ideia de colecao aparece na tela de variaveis, no picker modal e na propria tela de colecoes com pouca hierarquia entre os pontos.

O que esta visualmente pesado:
- grid de colunas em modo tabela improvisada;
- detalhes expandidos e editor convivem sem separar consulta de manutencao.

O que prejudica a operacao humana:
- colecoes parecem um conceito tecnico "a ser evitado", nao uma capacidade clara do motor documental.

## Problemas transversais do submodulo

### Navegacao
- o hub existe, mas as telas internas ainda exigem saber previamente onde cada conceito mora;
- ha pouca orientacao de "o que fazer primeiro".

### Semantica
- termos como modelo, tipo, conjunto, grupo, colecao, layout, template, header e footer ainda competem em vez de se complementarem;
- governanca tecnica e autoria operacional aparecem no mesmo plano.

### Descoberta de funcionalidades
- preview e teste nao estao proximos o suficiente da autoria;
- IA, variaveis e colecoes aparecem como recursos tecnicos, nao como assistentes de criacao.

### Carga cognitiva
- campos demais expostos por padrao;
- baixa separacao entre essencial, opcional e avancado.

### Falta de separacao entre modo simples e avancado
- hoje quase toda tela nasce em modo avancado;
- o fluxo ideal precisa proteger o operador da complexidade estrutural.

### Mistura entre governanca tecnica e autoria operacional
- editar modelo nao deveria exigir pensar como administrador de schema;
- cadastrar variavel nao deveria parecer uma tarefa de engenharia de dados para casos simples.

## Jornada ideal do usuario

### Criar modelo
1. Escolher nome, operacao documental e tipo basico do documento.
2. Escolher se usa estrutura institucional padrao.
3. Escrever o corpo.
4. Inserir variaveis e colecoes.
5. Testar preview.
6. Ativar ou salvar como rascunho.

### Editar modelo
1. Abrir o modelo.
2. Ver estado atual, operacao e versao.
3. Editar corpo e estrutura relacionada.
4. Testar preview.
5. Salvar nova revisao ou reativar.

### Testar preview
1. Escolher um contexto de teste.
2. Conferir variaveis resolvidas.
3. Conferir cabecalho, corpo e rodape.
4. Validar antes de ativar.

### Ativar modelo
1. Conferir se existe versao ativa anterior.
2. Confirmar ativacao com impacto claro.
3. Ver historico/versionamento na propria tela.

### Consultar modelos existentes
1. Filtrar por operacao, status, tipo e uso.
2. Identificar rapidamente qual e o ativo.
3. Abrir historico e edicao sem ruido tecnico.

### Gerenciar variaveis
1. Comecar por busca de variavel ja existente.
2. Cadastrar em modo simples quando possivel.
3. Abrir modo avancado so para joins e casos especiais.

### Entender colecoes
1. Ver o conceito por exemplo funcional.
2. Ver em quais modelos a colecao e usada.
3. Editar a estrutura tecnica apenas quando necessario.

### Organizar conjuntos/grupos
1. Entender conjunto como pacote semantico.
2. Entender grupo como organizacao interna do pacote.
3. Vincular modelos depois da estrutura ficar clara.

## Diretrizes obrigatorias de refatoracao

- progressao por etapas;
- separacao entre cadastro tecnico e uso operacional;
- reducao de campos expostos por padrao;
- taxonomia visual clara;
- preview/teste mais proximo da edicao;
- governanca sem expor complexidade demais;
- modo simples como default;
- modo avancado recolhido e explicitamente aberto.

## Nova arquitetura de telas proposta

### Camada 1 - Autorar modelo

Responsabilidade:
- criar, editar, testar e ativar modelos.

Estrutura recomendada:
- pagina principal de modelos com filtros, status, operacao e acesso a novo modelo;
- tela de criacao/edicao em fluxo guiado por etapas;
- preview persistente ao lado ou em etapa dedicada;
- versionamento e ativacao no fim do fluxo.

Deve permanecer em pagina propria:
- listagem de modelos;
- criacao/edicao detalhada de modelo.

Deve virar aba ou secao:
- identidade;
- operacao documental;
- estrutura reutilizavel;
- corpo;
- variaveis/colecoes detectadas;
- preview/teste;
- ativacao/versionamento.

Deve virar modal:
- escolher variavel existente;
- escolher colecao;
- confirmar ativacao.

Deve sair da tela principal:
- JSON cru como elemento primario;
- parametros avancados de layout por padrao.

### Camada 2 - Governanca documental

Responsabilidade:
- manter o catalogo tecnico do motor documental.

Entram aqui:
- variaveis;
- colecoes;
- conjuntos;
- grupos;
- layouts e componentes reutilizaveis.

Direcao de UX:
- cada tela deve ter modo catalogo primeiro e edicao tecnica depois;
- linguagem menos orientada a schema e mais a efeito funcional;
- relacoes com modelos devem aparecer como contexto, nao como ruido.

### Camada 3 - Operacao documental

Responsabilidade:
- emitidos;
- PDF;
- reemissao;
- cadeia documental.

Direcao de UX:
- foco em consulta, rastreabilidade e operacao administrativa;
- manter separado do ambiente de autoria.

## Novo fluxo proposto para modelos

### Etapa 1 - Identidade do modelo

Modo simples:
- titulo;
- resumo/descricao curta;
- tipo de documento.

Avancado:
- tags internas;
- observacoes administrativas.

### Etapa 2 - Operacao documental vinculada

Modo simples:
- operacao documental;
- status inicial rascunho.

Avancado:
- parametros de compatibilidade;
- regras especiais de contexto, se existirem.

### Etapa 3 - Estrutura reutilizavel

Modo simples:
- usar cabecalho padrao;
- usar rodape padrao.

Avancado:
- escolher cabecalho especifico;
- escolher rodape especifico;
- ajustar alturas e margens.

### Etapa 4 - Corpo do documento

Modo simples:
- editor principal;
- blocos prontos;
- assistente de IA como opcional.

Avancado:
- alternancia HTML/markdown legado;
- configuracoes tecnicas de compatibilidade.

### Etapa 5 - Variaveis e colecoes

Modo simples:
- painel lateral com busca;
- inserir variavel;
- inserir colecao pronta;
- detectar placeholders faltantes.

Avancado:
- abrir governanca de variaveis;
- abrir governanca de colecoes;
- revisar schema tecnico.

### Etapa 6 - Preview/teste

Modo simples:
- escolher contexto de teste;
- ver documento renderizado;
- ver variaveis resolvidas por grupo.

Avancado:
- metadados tecnicos de renderizacao;
- fallbacks e diagnostico.

### Etapa 7 - Ativacao e versionamento

Modo simples:
- salvar rascunho;
- ativar;
- duplicar versao.

Avancado:
- historico completo;
- comparacao de versoes;
- substituicao controlada.

## O que pode ser reaproveitado da implementacao atual

- `RichTextEditor` como base do corpo do modelo;
- `AiAssistenteModelos` como assistente contextual, desde que saia do topo e entre no fluxo de autoria;
- `ColecaoPickerModal` como seletor de blocos reutilizaveis;
- a estrutura de `documentos_operacoes`, `documentos_cabecalhos`, `documentos_rodapes` e historico de emitidos;
- os recursos de emitidos, PDF e reemissao ja consolidados.

## Classificacao do que e SQL, API e UX

### Mudancas que sao so de paginas/componentes

- reorganizar modelos em fluxo por etapas;
- recolher configuracoes avancadas;
- aproximar preview da edicao;
- melhorar listagens e taxonomia visual;
- separar melhor catalogo tecnico de uso operacional.

### Mudancas que exigem ajuste de contrato API

- endpoint de modelos devolver status operacional mais rico para listagem;
- endpoint de preview de modelos aceitar contexto de teste mais guiado;
- possivel endpoint de historico/versionamento focado em autoria;
- relacoes de uso: em quais modelos uma variavel ou colecao esta sendo usada.

### Mudancas que exigem ajuste SQL

- nenhuma mudanca SQL obrigatoria foi identificada para iniciar a refatoracao de UX;
- ajustes SQL futuros podem surgir apenas se versionamento de autoria exigir entidade propria mais explicita.

### Mudancas que podem ser feitas so por reorganizacao visual

- separar modo simples e avancado;
- transformar formularios monoliticos em etapas;
- reduzir ruido de campos tecnicos;
- mover IA e colecoes para apoio contextual;
- unificar linguagem de conjunto/grupo/colecao/variavel.

## Ordem recomendada de implementacao

1. API minima, apenas se necessario:
   - enriquecer listagem/preview de modelos com contexto de autoria.
2. Refatorar a tela de modelos:
   - listagem;
   - criacao/edicao por etapas;
   - preview e ativacao.
3. Refatorar variaveis:
   - separar modo simples de modo avancado.
4. Refatorar colecoes:
   - fortalecer catalogo funcional e reduzir editor tecnico exposto.
5. Refatorar conjuntos/grupos:
   - separar estrutura semantica de matriz de vinculacao.
6. Prints e revisao.
7. Ajustes finos.
8. Atualizacao do estado do projeto.

## Conclusao

O submodulo de autoria documental ja tem base funcional suficiente, mas ainda opera com ergonomia de painel tecnico. A proxima fase nao precisa reabrir arquitetura do motor documental; precisa reorganizar a experiencia para que autoria, governanca e operacao sejam camadas diferentes, com complexidade progressiva e preview mais proximo da edicao.
