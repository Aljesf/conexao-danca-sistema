📘 Estrutura de Arquivos do Projeto — Sistema Conexão Dança  
Snapshot da estrutura: 2025-12-07

---

## 1. Introdução
Este documento é o mapa oficial do repositório. Ele reflete a situação real das pastas/rotas e deve ser atualizado sempre que módulos grandes forem criados ou movidos. A visão conceitual do sistema está em `docs/visao-geral-sistema-conexao-danca.md`, e o VNB (📘 VNB — Estrutura Oficial do Sideb.md) define os contextos Escola, Loja, Café e Administração.  
Use este mapa para localizar arquivos, entender a arquitetura e orientar refatorações sem sobrescrever partes incorretas.

---

## 2. Estrutura geral da raiz do projeto
- `src/` — Código-fonte da aplicação (Next.js App Router, componentes, libs).
- `docs/` — Documentação interna (modelos conceituais, estado atual, instruções oficiais, VNB, IA).
- `scripts/` — Ferramentas/automação (snapshot de schema, diagnóstico de conexão, seeds e utilitários da Loja v0).
- `supabase/` e/ou `migrations/` — Migrações SQL do Supabase (quando presentes).
- `.temp/`, `tmp/` — Pastas temporárias (se existirem).
- Arquivos de configuração: `next.config.*`, `tsconfig.*`, `tailwind.config.*`, entre outros de build/linters.

---

## 3. src/app — Rotas Next.js (App Router)
Estrutura resumida (2–3 níveis):
```
src/app
  layout.tsx
  page.tsx
  login/
  (private)/
    administracao/
    loja/
    cafe/
    pessoas/
    turmas/
    financeiro/  (quando existir)
    relatorios/  (quando existir)
    ...
  api/
    ... (ver seção 4)
```
- `src/app` define rotas públicas e privadas.  
- A pasta `(private)` concentra contextos internos alinhados ao VNB:
  - `/administracao/**` → contexto Administração (financeiro, loja admin, configurações, relatórios).
  - `/loja/**` → contexto Loja operacional (caixa, produtos, vendas, estoque).
  - `/cafe/**` → contexto Ballet Café.
  - `/pessoas/**` → cadastros de pessoas/identidade.
  - `/turmas/**` e variações acadêmicas → turmas, avaliações, cursos.
  - Outras pastas internas podem existir para matrículas, relatórios, etc.

Exemplos de rotas:  
- `/administracao/loja/compras`, `/administracao/loja/compras/[id]`, `/administracao/loja/fornecedores`  
- `/administracao/financeiro/contas-a-pagar` (quando presente)  
- `/loja/caixa`, `/loja/produtos`, `/loja/estoque`, `/loja/fornecedores`  
- `/pessoas/[id]`, `/turmas/[id]`

---

## 4. src/app/api — Rotas de API
Árvore resumida:
```
src/app/api
  pessoas/
  alunos/          (legado/compatibilidade)
  turmas/
  matriculas/
  financeiro/      (contas_pagar, cobrancas, contas_financeiras, etc.)
  loja/
  admin/
    ia/            (quando presente)
  ...
```
- Cada subpasta corresponde a um domínio. Rotas seguem o modelo do App Router (`route.ts`).
- Exemplos:
  - `/api/matriculas/novo`, `/api/matriculas/...` → usa `matriculas`, `turma_aluno`, `pessoas`.
  - `/api/financeiro/contas-pagar/pagar`, `/api/financeiro/contas-financeiras` → `contas_pagar`, `contas_financeiras`, `movimento_financeiro`.
  - `/api/loja/produtos`, `/api/loja/vendas`, `/api/loja/compras/[id]`, `/api/loja/fornecedores` → `loja_produtos`, `loja_vendas`, `loja_pedidos_compra`, etc.
  - `/api/pessoas/busca` → `pessoas` e dados auxiliares.

---

## 5. src/components — Componentes Compartilhados
- Layout: Sidebar, AppShell, cabeçalhos, cards genéricos.
- Formulários: inputs, selects, combobox reutilizáveis, componentes de busca de pessoa/aluno.
- Componentes específicos de módulo: cards financeiros, cards de turmas/avaliações, cards de loja (produtos/estoque).
- Usados em múltiplos contextos (Escola, Loja, Café, Administração).

---

## 6. src/lib — Camada de Infra e Domínio
- Clientes Supabase (server/browser) e helpers de autenticação.
- Helpers de domínio (turmas, avaliações, matrículas, loja, financeiro).
- Integrações de IA (quando presentes: ex. openaiClient, fluxos de IA) conforme `arquitetura-ia.md`.
- Funções utilitárias e modelos TypeScript reaproveitáveis.

---

## 7. scripts — Ferramentas e Automação
- `scripts/snapshotDb.ts` — Gera `schema-supabase.sql` via `pg` lendo o `information_schema` (usa SUPABASE_DB_URL).
- `scripts/testSupabaseConnection.ts` — Diagnóstico de conexão (SELECT 1, máscara de URL, SSL).
- Scripts da Loja v0 (quando presentes): seeds, migrations auxiliares, aplicação de migrations.
- Outros scripts de manutenção/migração/testes, conforme necessidade.

---

## 8. docs — Documentação Interna
Principais MDs por grupo:
- Base do sistema:
  - `visao-geral-sistema-conexao-danca.md`
  - `📘 VNB — Estrutura Oficial do Sideb.md`
  - `instrucoes-oficiais-chatgpt-2.0.md`
  - `instrucao_rastreabilidade.md`
- Banco de dados:
  - `estado-atual-banco.md` (estado real)
  - `modelo-banco-padrao.md`
- Matrículas:
  - `estado-atual-matriculas.md`
  - `modelo-de-matriculas.md`
  - `modelo-fisico-matriculas.md`
  - `plano-migracao-matriculas.md`
  - `api-matriculas.md`
- Turmas:
  - `estado-atual-turmas-01-12-2025.md`
  - `Modelo de Turmas — Conexão Dança 1.3.md`
- Loja:
  - `modelo-loja-v0.md` (histórico v0)
  - `estado-atual-loja-v0.md`
- Financeiro:
  - `modelo_financeiro.md`
- IA:
  - `arquitetura-ia.md`
  - `ia-integracao-passos.md`
  - `ia-economia-tokens.md`
- Contratos e acessórios:
  - `modelo-decontratos-academicos-e-artistico.md`
  - `modelo-contratos-acessorios.md`
- Currículo / cuidados / outros:
  - `modelo_curriculo.1.0.md`
  - `matricula_ficha_cuidados_alunos.md`

Cada grupo deve ser consultado junto com `estado-atual-banco.md` para refletir o estado real.

---

## 9. Mapa “Pasta → Domínio”
- `src/app/(private)/administracao/financeiro/**` → Financeiro Admin
- `src/app/(private)/administracao/loja/**` → Loja Admin (gestão de estoque/compras/fornecedores)
- `src/app/(private)/loja/**` → Loja Operacional (caixa, produtos, vendas, estoque)
- `src/app/(private)/academico/**` e `src/app/(private)/turmas/**` → Domínio Acadêmico (Cursos, Turmas, Avaliações)
- `src/app/(private)/matriculas/**` → Matrículas
- `src/app/(private)/pessoas/**` → Pessoas / Cadastros
- `src/app/(private)/cafe/**` → Ballet Café
- `src/app/(private)/relatorios/**` ou `admin/relatorios/**` → Painéis e relatórios
- `src/app/api/matriculas/**` → API de Matrículas
- `src/app/api/financeiro/**` → API Financeiro (cobrancas, recebimentos, contas_pagar)
- `src/app/api/loja/**` → API da Loja (produtos, vendas, compras, fornecedores)
- `src/app/api/admin/ia/**` → Painel/integração de IA (quando presente)

---

## 10. Notas de Manutenção
- Atualize este arquivo sempre que:
  - um novo módulo ou contexto for criado,
  - pastas forem renomeadas ou movidas,
  - APIs importantes mudarem de lugar.
- O Codex usa este mapa para localizar arquivos, entender a arquitetura e evitar sobrescritas indevidas. Mantê-lo atualizado reduz riscos em refatorações e migrações.

---

Rodapé  
Snapshot da estrutura de arquivos em 2025-12-07 — primeiro snapshot oficial desta árvore. Atualize nas próximas mudanças estruturais.
