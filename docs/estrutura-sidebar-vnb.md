📘 VNB — Estrutura Oficial do Sidebar do Sistema Conexão Dança

Versão: 1.2
Última atualização: 28-11-2025
Responsável: Alírio de Jesus e Silva Filho

🔄 Alterações desta versão (v1.1)

Inclusão do Painel do Diretor (Relatórios) no contexto Administração.

Inclusão da página de Auditoria do Sistema dentro de Usuários & Segurança.

Reforço da estrutura hierárquica do Admin.

Mantidas todas as seções dos demais contextos (Escola, Loja e Café).

1. CONTEXTO ESCOLA — Conexão Dança
1. CONTEXTO ESCOLA — Conexão Dança
1.1 INÍCIO

Início → /escola

1.2 CAIXA (ESCOLA)

Frente de caixa → /escola/caixa

1.3 CALENDÁRIO

Visão geral → /escola/calendario

Eventos internos → /escola/calendario/eventos-internos

Eventos externos → /escola/calendario/eventos-externos

Feriados → /escola/calendario/feriados

1.4 CAPTAÇÃO (CRM)

Visão geral → /escola/captacao

Novo interessado → /escola/captacao/novo

Interessados → /escola/captacao/interessados

1.5 PESSOAS

Nova pessoa → /escola/pessoas/nova

Lista de pessoas → /escola/pessoas

1.6 ALUNOS

Novo aluno → /escola/alunos/novo
(atalho direto para o fluxo completo de matrícula)

Lista de alunos → /escola/alunos

Matrículas → /escola/alunos/matriculas

Currículo → /escola/alunos/curriculo

Grupos de alunos → /escola/alunos/grupos
(bolsistas, companhia, GAV etc.)

1.7 ACADÊMICO

Cursos → /escola/academico/cursos

Níveis → /escola/academico/niveis

Módulos → /escola/academico/modulos

Avaliações → /escola/academico/avaliacoes

Professores → /escola/academico/professores
(somente visualização no contexto ESCOLA)

Nova turma → /escola/academico/turmas/nova

Turmas → /escola/academico/turmas

Grade → /escola/academico/grade

Frequência → /escola/academico/frequencia

1.8 MOVIMENTO CONEXÃO DANÇA (AGORA NO FINAL)

Bolsas → /escola/movimento/bolsas

Acolhimento → /escola/movimento/acolhimento

Ações solidárias → /escola/movimento/acoes-solidarias

Informações sociais → /escola/movimento/informacoes-sociais

2. CONTEXTO LOJA — AJ Dance Store
2.1 INÍCIO

Início → /loja

2.2 CAIXA & VENDAS

Frente de caixa → /loja/caixa

Pedidos da escola → /loja/pedidos/escola

Pedidos externos → /loja/pedidos/externos

Trocas & devoluções → /loja/trocas

2.3 PRODUTOS & ESTOQUE

Produtos → /loja/produtos

Estoque → /loja/estoque

Fornecedores → /loja/fornecedores

2.4 PESSOAL DA LOJA

Colaboradores da loja → /loja/colaboradores

3. CONTEXTO LANCHONETE — Ballet Café
3.1 INÍCIO

Início → /cafe

3.2 COMANDAS & CAIXA

Comandas → /cafe/comandas

Pedidos → /cafe/pedidos

Caixa → /cafe/caixa

3.3 PRODUTOS & ESTOQUE

Cardápio → /cafe/cardapio

Estoque da cozinha → /cafe/estoque

Fornecedores → /cafe/fornecedores

3.4 PESSOAL DO CAFÉ

Colaboradores do Café → /cafe/colaboradores

4. CONTEXTO ADMINISTRAÇÃO DO SISTEMA

(Atualizado na v1.1)

4.1 INÍCIO

Painel de administração → /admin

4.2 CONFIGURAÇÕES DAS UNIDADES

Configuração da escola → /admin/config/escola

Configuração da loja → /admin/config/loja

Configuração do Ballet Café → /admin/config/cafe

4.3 COLABORADORES

Centros de custo / centros base → /admin/colaboradores/centros-custo

Gestão de colaboradores → /admin/colaboradores

Tipos de vínculo → /admin/colaboradores/tipos-vinculo

Tipos de função → /admin/colaboradores/tipos-funcao

Jornadas de trabalho → /admin/colaboradores/jornadas (futuro)

4.4 USUÁRIOS & SEGURANÇA

Usuários → /admin/usuarios

Perfis → /admin/perfis

Permissões → /admin/permissoes

Auditoria do sistema → /admin/relatorios/auditoria ✔️ (novo)

4.5 FINANCEIRO (ADMIN)

Dashboard financeiro → /admin/financeiro

Centros de custo (financeiro) → /admin/financeiro/centros-custo

Plano de contas → /admin/financeiro/plano-contas

Categorias financeiras → /admin/financeiro/categorias

Contas a receber (Admin) → /admin/financeiro/contas-receber

Contas a pagar (Admin) → /admin/financeiro/contas-pagar

Caixa geral / Movimentação → /admin/financeiro/caixa-geral

Lançamentos manuais → /admin/financeiro/lancamentos-manuais

4.6 PAINEL DO DIRETOR — RELATÓRIOS (NOVO MÓDULO)
Página raiz

Painel do Diretor → /admin/relatorios

Sub-relatórios:
📘 Acadêmicos / Alunos

Alunos por turma → /admin/relatorios/alunos/turmas

Alunos ativos e inativos → /admin/relatorios/alunos/status

Grupos & Projetos (GAV, Companhia, Bolsistas) → /admin/relatorios/alunos/grupos

Conversão de interessados → /admin/relatorios/captacao/conversao

💰 Financeiros

Resumo financeiro → /admin/relatorios/financeiro/resumo

Movimentação → /admin/relatorios/financeiro/movimento

Contas a receber → /admin/relatorios/financeiro/receber

Contas a pagar → /admin/relatorios/financeiro/pagar

🛍️ Comerciais (Loja e Café)

Vendas por período → /admin/relatorios/comercial/vendas

Estoque crítico → /admin/relatorios/comercial/estoque

❤️ Sociais

Bolsas e ações sociais → /admin/relatorios/social

5. Regras de Ouro

(Inalteradas)

Financeiro pesado só no Admin.

Frente de caixa separada por contexto.

Configurações apenas no Admin.

Colaboradores apenas no Admin.

Professores: edição só no Admin; visualização na Escola.

Toda alteração grande deve atualizar este arquivo.

6. Implementação (para Codex)

(Mantido igual)

export type SidebarItem = { label: string; href: string; icon?: any };
export type SidebarSection = { id: string; title: string; items: SidebarItem[] };

export type SidebarConfig = {
  escola: SidebarSection[];
  loja: SidebarSection[];
  cafe: SidebarSection[];
  admin: SidebarSection[];
};