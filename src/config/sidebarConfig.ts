// Configuração central do sidebar (Escola, Loja, Café, Administração).
// Arquivo recriado em 2026-06-17 em UTF-8, corrigindo problemas de encoding e
// alinhando o menu à VNB v2.0 + estado real das rotas.

export type SidebarItem = {
  label: string;
  href: string;
  icon?: string; // usar emojis simples
  matchPrefix?: boolean;
};

export type SidebarSection = {
  id: string;
  title: string;
  items: SidebarItem[];
  defaultOpen?: boolean;
};

export type SidebarContexts = {
  escola: SidebarSection[];
  loja: SidebarSection[];
  cafe: SidebarSection[];
  admin: SidebarSection[];
};

export const sidebarConfig: SidebarContexts = {
  escola: [
    {
      id: "escola-inicio",
      title: "Início",
      items: [{ label: "Início", href: "/", icon: "🏫" }],
    },
    {
      id: "escola-caixa",
      title: "Caixa",
      items: [{ label: "Frente de caixa", href: "/financeiro/caixa", icon: "💰" }],
    },
    {
      id: "escola-calendario",
      title: "Calendário",
      items: [
        { label: "Visão geral", href: "/calendario", icon: "📅" },
        { label: "Eventos internos", href: "/calendario/eventos-internos", icon: "🏠" },
        { label: "Eventos externos", href: "/calendario/eventos-externos", icon: "🌐" },
        { label: "Feriados", href: "/calendario/feriados", icon: "🏖️" },
      ],
    },
    {
      id: "escola-captacao",
      title: "Captação (CRM)",
      items: [
        { label: "Visão geral", href: "/captacao", icon: "📞" },
        { label: "Novo interessado", href: "/captacao/novo", icon: "➕" },
        { label: "Interessados", href: "/captacao/interessados", icon: "👥" },
      ],
    },
    {
      id: "escola-pessoas",
      title: "Pessoas",
      items: [
        { label: "Nova pessoa", href: "/pessoas/nova", icon: "➕" },
        { label: "Lista de pessoas", href: "/pessoas", icon: "👤" },
      ],
    },
    {
      id: "escola-alunos",
      title: "Alunos",
      items: [
        { label: "Novo aluno", href: "/alunos/novo", icon: "🧑‍🎓" },
        { label: "Lista de alunos", href: "/alunos", icon: "👥" },
        { label: "Matrículas", href: "/alunos/matriculas", icon: "🧾" },
        { label: "Currículos", href: "/alunos/curriculo", icon: "📑" },
        { label: "Grupos de alunos", href: "/alunos/grupos", icon: "👥" },
      ],
    },
    {
      id: "escola-academico",
      title: "Acadêmico",
      items: [
        { label: "Cursos", href: "/academico/cursos", icon: "🎓" },
        { label: "Níveis", href: "/academico/niveis", icon: "📶" },
        { label: "Módulos", href: "/academico/modulos", icon: "🧩" },
        { label: "Habilidades", href: "/academico/habilidades", icon: "🛠️" },
        { label: "Avaliações", href: "/academico/avaliacoes", icon: "📝" },
        { label: "Modalidades", href: "/academico/modalidades", icon: "🎭" },
        { label: "Professores", href: "/academico/professores", icon: "👨‍🏫" },
        { label: "Nova turma", href: "/academico/turmas/nova", icon: "➕" },
        { label: "Turmas", href: "/academico/turmas", icon: "🏫" },
        { label: "Grade", href: "/academico/grade", icon: "📆" },
        { label: "Frequência", href: "/academico/frequencia", icon: "📊" },
      ],
    },
    {
      id: "escola-movimento",
      title: "Movimento Conexão Dança",
      items: [
        { label: "Bolsas", href: "/movimento/bolsas", icon: "🎟️" },
        { label: "Acolhimento", href: "/movimento/acolhimento", icon: "🤝" },
        { label: "Ações solidárias", href: "/movimento/acoes", icon: "❤️" },
        { label: "Informações sociais", href: "/movimento/informacoes-sociais", icon: "📄" },
      ],
    },
  ],

  loja: [
    {
      id: "loja-inicio",
      title: "Início",
      items: [{ label: "Início", href: "/loja", icon: "🛍️" }],
    },
    {
      id: "loja-caixa",
      title: "Caixa & vendas",
      items: [
        { label: "Frente de caixa", href: "/loja/caixa", icon: "💳" },
        { label: "Pedidos da escola", href: "/loja/pedidos/escola", icon: "🏫" },
        { label: "Pedidos externos", href: "/loja/pedidos/externos", icon: "🌐" },
        { label: "Trocas & devoluções", href: "/loja/trocas", icon: "♻️" },
      ],
    },
    {
      id: "loja-produtos",
      title: "Produtos & estoque",
      items: [
        { label: "Produtos", href: "/loja/produtos", icon: "🎁" },
        { label: "Estoque", href: "/loja/estoque", icon: "📦" },
        { label: "Categorias", href: "/loja/categorias", icon: "🏷️" },
        { label: "Compras", href: "/loja/compras", icon: "🧾" },
        { label: "Relatórios", href: "/loja/relatorios", icon: "📊" },
        { label: "Fornecedores", href: "/loja/fornecedores", icon: "🤝" },
      ],
    },
    {
      id: "loja-pessoas",
      title: "Pessoas",
      items: [
        { label: "Nova pessoa", href: "/pessoas/nova", icon: "➕" },
        { label: "Lista de pessoas", href: "/pessoas", icon: "👤" },
      ],
    },
    {
      id: "loja-colaboradores",
      title: "Pessoal da loja",
      items: [{ label: "Colaboradores da loja", href: "/loja/colaboradores", icon: "🧑‍💼" }],
    },
  ],

  cafe: [
    {
      id: "cafe-inicio",
      title: "Início",
      items: [{ label: "Início", href: "/cafe", icon: "☕️" }],
    },
    {
      id: "cafe-comandas",
      title: "Comandas & caixa",
      items: [
        { label: "Comandas", href: "/cafe/comandas", icon: "📋" },
        { label: "Pedidos", href: "/cafe/pedidos", icon: "🧾" },
        { label: "Caixa", href: "/cafe/caixa", icon: "💵" },
      ],
    },
    {
      id: "cafe-produtos",
      title: "Produtos & estoque",
      items: [
        { label: "Cardápio", href: "/cafe/cardapio", icon: "🍽️" },
        { label: "Estoque da cozinha", href: "/cafe/estoque", icon: "🍳" },
        { label: "Categorias", href: "/cafe/categorias", icon: "🏷️" },
        { label: "Compras", href: "/cafe/compras", icon: "🧾" },
        { label: "Relatórios", href: "/cafe/relatorios", icon: "📊" },
      ],
    },
    {
      id: "cafe-pessoas",
      title: "Pessoas",
      items: [
        { label: "Nova pessoa", href: "/pessoas/nova", icon: "➕" },
        { label: "Lista de pessoas", href: "/pessoas", icon: "👤" },
      ],
    },
    {
      id: "cafe-colaboradores",
      title: "Pessoal do café",
      items: [{ label: "Colaboradores do café", href: "/cafe/colaboradores", icon: "🧑‍🍳" }],
    },
  ],

  admin: [
    {
      id: "admin-inicio",
      title: "Início",
      items: [{ label: "Painel de administração", href: "/admin", icon: "⚙️" }],
    },
    {
      id: "admin-config",
      title: "Configurações das unidades",
      items: [
        { label: "Configuração da escola", href: "/config/escola", icon: "🏫" },
        { label: "Configuração da loja", href: "/config/comercial/loja", icon: "🛍️" },
        { label: "Configuração do Ballet Café", href: "/config/comercial/ballet-cafe", icon: "☕️" },
        { label: "Endereços", href: "/config/enderecos", icon: "🏠" },
      ],
    },
    {
      id: "admin-colaboradores",
      title: "Colaboradores",
      items: [
        { label: "Gestão de colaboradores", href: "/config/colaboradores", icon: "🧑‍💼" },
        { label: "Tipos de vínculo", href: "/config/colaboradores/tipos-vinculo", icon: "🧷" },
        { label: "Tipos de função", href: "/config/colaboradores/tipos-funcao", icon: "🛠️" },
        { label: "Jornadas de trabalho", href: "/config/colaboradores/jornadas", icon: "⏱️" },
      ],
    },
    {
      id: "admin-usuarios",
      title: "Usuários & Segurança",
      items: [
        { label: "Usuários", href: "/config/usuarios", icon: "👤" },
        { label: "Perfis", href: "/config/perfis", icon: "🧭" },
        { label: "Permissões", href: "/config/permissoes", icon: "🛡️" },
        { label: "Auditoria do sistema", href: "/relatorios/auditoria", icon: "📜" },
      ],
    },
    {
      id: "admin-financeiro",
      title: "Financeiro (Admin)",
      items: [
        { label: "Dashboard financeiro", href: "/administracao/financeiro", icon: "💰" },
        { label: "Centros de custo", href: "/administracao/financeiro/centros-custo", icon: "🏦" },
        { label: "Plano de contas", href: "/administracao/financeiro/plano-contas", icon: "📒" },
        { label: "Categorias financeiras", href: "/administracao/financeiro/categorias", icon: "🏷️" },
        { label: "Contas a receber (Admin)", href: "/administracao/financeiro/contas-receber", icon: "📥" },
        { label: "Contas a pagar (Admin)", href: "/administracao/financeiro/contas-pagar", icon: "📤" },
        { label: "Movimentação", href: "/administracao/financeiro/movimento", icon: "🔀" },
        { label: "Lançamentos manuais", href: "/administracao/financeiro/lancamentos-manuais", icon: "✏️" },
      ],
    },
    {
      id: "admin-contratos",
      title: "Contratos & Integrações",
      items: [
        { label: "Modelos de contrato", href: "/config/contratos", icon: "📄" },
        { label: "Integrações gerais", href: "/config/integacoes", icon: "🔗" },
      ],
    },
    {
      id: "admin-loja",
      title: "Loja (Admin)",
      items: [
        { label: "Gestão de estoque", href: "/administracao/loja/gestao-estoque", icon: "📦" },
        { label: "Compras", href: "/administracao/loja/compras", icon: "🧾" },
        { label: "Fornecedores", href: "/administracao/loja/fornecedores", icon: "🤝" },
        { label: "Configurações da loja", href: "/admin/loja/configuracoes", icon: "⚙️" },
      ],
    },
    {
      id: "admin-ia",
      title: "IA & Automação",
      items: [{ label: "Painel de IA", href: "/admin/ia", icon: "🤖" }],
    },
    {
      id: "admin-relatorios",
      title: "Relatórios",
      items: [
        { label: "Relatórios", href: "/relatorios", icon: "📊" },
        { label: "Auditoria", href: "/relatorios/auditoria", icon: "📜" },
      ],
    },
  ],
};
