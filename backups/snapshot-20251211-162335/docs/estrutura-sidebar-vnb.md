ðŸ“˜ VNB â€” Estrutura Oficial do Sidebar do Sistema ConexÃ£o DanÃ§a

VersÃ£o: 1.2
Ãšltima atualizaÃ§Ã£o: 28-11-2025
ResponsÃ¡vel: AlÃ­rio de Jesus e Silva Filho

ðŸ”„ AlteraÃ§Ãµes desta versÃ£o (v1.1)

InclusÃ£o do Painel do Diretor (RelatÃ³rios) no contexto AdministraÃ§Ã£o.

InclusÃ£o da pÃ¡gina de Auditoria do Sistema dentro de UsuÃ¡rios & SeguranÃ§a.

ReforÃ§o da estrutura hierÃ¡rquica do Admin.

Mantidas todas as seÃ§Ãµes dos demais contextos (Escola, Loja e CafÃ©).

1. CONTEXTO ESCOLA â€” ConexÃ£o DanÃ§a
1. CONTEXTO ESCOLA â€” ConexÃ£o DanÃ§a
1.1 INÃCIO

InÃ­cio â†’ /escola

1.2 CAIXA (ESCOLA)

Frente de caixa â†’ /escola/caixa

1.3 CALENDÃRIO

VisÃ£o geral â†’ /escola/calendario

Eventos internos â†’ /escola/calendario/eventos-internos

Eventos externos â†’ /escola/calendario/eventos-externos

Feriados â†’ /escola/calendario/feriados

1.4 CAPTAÃ‡ÃƒO (CRM)

VisÃ£o geral â†’ /escola/captacao

Novo interessado â†’ /escola/captacao/novo

Interessados â†’ /escola/captacao/interessados

1.5 PESSOAS

Nova pessoa â†’ /escola/pessoas/nova

Lista de pessoas â†’ /escola/pessoas

1.6 ALUNOS

Novo aluno â†’ /escola/alunos/novo
(atalho direto para o fluxo completo de matrÃ­cula)

Lista de alunos â†’ /escola/alunos

MatrÃ­culas â†’ /escola/alunos/matriculas

CurrÃ­culo â†’ /escola/alunos/curriculo

Grupos de alunos â†’ /escola/alunos/grupos
(bolsistas, companhia, GAV etc.)

1.7 ACADÃŠMICO

Cursos â†’ /escola/academico/cursos

NÃ­veis â†’ /escola/academico/niveis

MÃ³dulos â†’ /escola/academico/modulos

AvaliaÃ§Ãµes â†’ /escola/academico/avaliacoes

Professores â†’ /escola/academico/professores
(somente visualizaÃ§Ã£o no contexto ESCOLA)

Nova turma â†’ /escola/academico/turmas/nova

Turmas â†’ /escola/academico/turmas

Grade â†’ /escola/academico/grade

FrequÃªncia â†’ /escola/academico/frequencia

1.8 MOVIMENTO CONEXÃƒO DANÃ‡A (AGORA NO FINAL)

Bolsas â†’ /escola/movimento/bolsas

Acolhimento â†’ /escola/movimento/acolhimento

AÃ§Ãµes solidÃ¡rias â†’ /escola/movimento/acoes-solidarias

InformaÃ§Ãµes sociais â†’ /escola/movimento/informacoes-sociais

2. CONTEXTO LOJA â€” AJ Dance Store
2.1 INÃCIO

InÃ­cio â†’ /loja

2.2 CAIXA & VENDAS

Frente de caixa â†’ /loja/caixa

Pedidos da escola â†’ /loja/pedidos/escola

Pedidos externos â†’ /loja/pedidos/externos

Trocas & devoluÃ§Ãµes â†’ /loja/trocas

2.3 PRODUTOS & ESTOQUE

Produtos â†’ /loja/produtos

Estoque â†’ /loja/estoque

Fornecedores â†’ /loja/fornecedores

2.4 PESSOAL DA LOJA

Colaboradores da loja â†’ /loja/colaboradores

3. CONTEXTO LANCHONETE â€” Ballet CafÃ©
3.1 INÃCIO

InÃ­cio â†’ /cafe

3.2 COMANDAS & CAIXA

Comandas â†’ /cafe/comandas

Pedidos â†’ /cafe/pedidos

Caixa â†’ /cafe/caixa

3.3 PRODUTOS & ESTOQUE

CardÃ¡pio â†’ /cafe/cardapio

Estoque da cozinha â†’ /cafe/estoque

Fornecedores â†’ /cafe/fornecedores

3.4 PESSOAL DO CAFÃ‰

Colaboradores do CafÃ© â†’ /cafe/colaboradores

4. CONTEXTO ADMINISTRACAO DO SISTEMA

(Atualizado na v1.4 — pos-unificacao admin/administracao em 2025-12-08)

Raiz tecnica do contexto Admin:
- src/app/(private)/admin

Observacao:
- A antiga arvore src/app/(private)/administracao foi unificada em /admin para os modulos Financeiro e Loja.

4.1 CONFIGURACOES DAS UNIDADES

Configuracao da escola -> /admin/config/escola
Configuracao da loja -> /admin/config/loja
Configuracao do Ballet Cafe -> /admin/config/cafe

4.2 COLABORADORES

Gestao de colaboradores -> /admin/colaboradores
Centros de custo / centros base -> /admin/colaboradores/centros-custo
Tipos de vinculo -> /admin/colaboradores/tipos-vinculo
Tipos de funcao -> /admin/colaboradores/tipos-funcao
Jornadas de trabalho -> /admin/colaboradores/jornadas

4.3 USUARIOS & SEGURANCA

Usuarios -> /admin/usuarios
Perfis -> /admin/perfis
Permissoes -> /admin/permissoes
Auditoria do sistema -> /admin/relatorios/auditoria

4.4 FINANCEIRO (ADMIN)

Dashboard financeiro -> /admin/financeiro

Centros de custo (financeiro) -> /admin/financeiro/centros-custo
Plano de contas -> /admin/financeiro/plano-contas
Categorias financeiras -> /admin/financeiro/categorias

Contas a receber (Admin) -> /admin/financeiro/contas-receber
Contas a pagar (Admin) -> /admin/financeiro/contas-pagar

Movimentacao financeira -> /admin/financeiro/movimento

Lancamentos manuais -> /admin/financeiro/lancamentos-manuais

4.5 LOJA (ADMIN)

Fornecedores da loja -> /admin/loja/fornecedores
Gestao de estoque da loja v0 -> /admin/loja/gestao-estoque

Categorias de produtos da loja -> /admin/loja/categorias
Compras da loja -> /admin/loja/compras
Configuracoes da loja (Admin) -> /admin/loja/configuracoes
Estoque da loja (Admin) -> /admin/loja/estoque

4.6 IA / ASSISTENTES

Painel de IA — Administracao -> /admin/ia

4.7 PAINEL DO DIRETOR — RELATORIOS

Pagina raiz -> /admin/relatorios

Relatorios Academicos / Alunos
- Alunos por turma -> /admin/relatorios/alunos/turmas
- Alunos ativos e inativos -> /admin/relatorios/alunos/status
- Grupos & Projetos (GAV, Companhia, Bolsistas) -> /admin/relatorios/alunos/grupos

Relatorios de Captacao / CRM
- Conversao de interessados -> /admin/relatorios/captacao/conversao

Relatorios Financeiros
- Resumo financeiro -> /admin/relatorios/financeiro/resumo
- Movimentacao financeira -> /admin/relatorios/financeiro/movimento
- Contas a receber -> /admin/relatorios/financeiro/receber
- Contas a pagar -> /admin/relatorios/financeiro/pagar

Relatorios Comerciais (Loja / Cafe)
- Vendas por periodo -> /admin/relatorios/comercial/vendas
- Estoque critico -> /admin/relatorios/comercial/estoque

Relatorios Sociais
- Bolsas e acoes sociais -> /admin/relatorios/social

## 4. CD-BAR — Cabecalho dinamico da sidebar por contexto

### 4.1. O que e o CD-BAR

CD-BAR e o “card de contexto ativo” exibido no topo da sidebar (logo + nome do contexto + texto “Contexto ativo”).

Ele e responsavel por:

- Exibir a IDENTIDADE visual do contexto atual (logo e nome).
- Deixar claro em qual “mundo” o usuario esta:
  - Escola -> Conexao Danca
  - Loja -> AJ Dance Store
  - Lanchonete -> Ballet Cafe
  - Administracao -> Administracao do Sistema
- Integrar a configuracao visual do contexto (BrandingContext) com a configuracao funcional do menu (sidebarConfig).

### 4.2. Arquivo tecnico de referencia

- Componente: Sidebar
- Caminho: src/components/Sidebar.tsx
- Principais pontos:

1. contextMap  
   Mapa que traduz o contexto “externo” vindo do Branding para a chave interna usada no sidebarConfig:

   ```ts
   const contextMap: Record<string, string> = {
     escola: "escola",
     loja: "loja",
     lanchonete: "cafe",
     administracao: "admin",
   };
   ```

2. contextMeta  
   Texto amigavel de cada contexto, usado para exibir o nome no CD-BAR:

   ```ts
   const contextMeta: Record<string, { label: string }> = {
     escola: { label: "Conexao Danca" },
     loja: { label: "AJ Dance Store" },
     lanchonete: { label: "Ballet Cafe" },
     administracao: { label: "Administracao do Sistema" },
   };
   ```

3. BrandingContext + logo  
   O componente le, via useBranding(), os dados de branding do contexto atual (configs[rawContext]) para exibir a logo (quando existir). Se nao houver logo, exibe as iniciais do nome do contexto.

### 4.3. Fluxo para adicionar um NOVO contexto ao CD-BAR

Sempre que for criar um novo contexto (ex.: Movimento, CRM, etc.), o fluxo deve ser SEMPRE este:

1) Branding / Contexto logico  
Configurar o novo contexto no BrandingContext (nome interno que sera usado em activeContext).

2) SidebarConfig  
Adicionar a chave correspondente no sidebarConfig com suas secoes e rotas. Ex.: movimento: SidebarSection[].

3) contextMap  
No componente Sidebar, atualizar o contextMap para apontar o nome vindo do Branding para a chave do sidebarConfig. Ex.:

   ```ts
   const contextMap: Record<string, string> = {
     // ...
     movimento: "movimento",
   };
   ```

4) contextMeta  
Ainda no Sidebar, adicionar a entrada no contextMeta com o rotulo que sera exibido no CD-BAR. Ex.:

   ```ts
   const contextMeta: Record<string, { label: string }> = {
     // ...
     movimento: { label: "Movimento Conexao Danca" },
   };
   ```

5) Logo (opcional mas recomendado)  
Configurar, no Branding, a logoUrl especifica para esse contexto (se existir). Dessa forma, o CD-BAR mostrara a logo do contexto em vez das iniciais do nome.

Com isso, cada contexto tera:

- Um CD-BAR proprio (logo + nome + contexto ativo).
- Um menu proprio (via sidebarConfig[contexto]).
- Um fluxo claro e padronizado para futuras expansoes.
5. Regras de Ouro

(Inalteradas)

Financeiro pesado sÃ³ no Admin.

Frente de caixa separada por contexto.

ConfiguraÃ§Ãµes apenas no Admin.

Colaboradores apenas no Admin.

Professores: ediÃ§Ã£o sÃ³ no Admin; visualizaÃ§Ã£o na Escola.

Toda alteraÃ§Ã£o grande deve atualizar este arquivo.

6. ImplementaÃ§Ã£o (para Codex)

(Mantido igual)

export type SidebarItem = { label: string; href: string; icon?: any };
export type SidebarSection = { id: string; title: string; items: SidebarItem[] };

export type SidebarConfig = {
  escola: SidebarSection[];
  loja: SidebarSection[];
  cafe: SidebarSection[];
  admin: SidebarSection[];
};
