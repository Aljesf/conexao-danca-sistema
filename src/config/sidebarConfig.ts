export type SidebarItem = {
  label: string;
  href: string;
  icon?: string; // emoji
};

export type SidebarSection = {
  id: string;
  title: string;
  items: SidebarItem[];
  defaultOpen?: boolean;
};

export const sidebarConfig: {
  escola: SidebarSection[];
  loja: SidebarSection[];
  cafe: SidebarSection[];
  admin: SidebarSection[];
} = {
  escola: [
    {
      id: "inicio",
      title: "Início",
      items: [{ label: "Início", href: "/", icon: "🏠" }],
    },
    {
      id: "caixa",
      title: "Caixa",
      items: [{ label: "Frente de caixa", href: "/financeiro/caixa", icon: "💳" }],
    },
    {
      id: "calendario",
      title: "Calendário",
      items: [
        { label: "Visão geral", href: "/calendario", icon: "📅" },
        { label: "Eventos internos", href: "/calendario/eventos-internos", icon: "🎉" },
        { label: "Eventos externos", href: "/calendario/eventos-externos", icon: "🎉" },
        { label: "Feriados", href: "/calendario/feriados", icon: "📅" },
      ],
    },
    {
      id: "crm",
      title: "Captação (CRM)",
      items: [
        { label: "Visão geral", href: "/captacao", icon: "📈" },
        { label: "Novo interessado", href: "/captacao/novo", icon: "➕" },
        { label: "Interessados", href: "/captacao/interessados", icon: "👥" },
      ],
    },
    {
      id: "pessoas",
      title: "Pessoas",
      items: [
        { label: "Nova pessoa", href: "/pessoas/nova", icon: "➕" },
        { label: "Lista de pessoas", href: "/pessoas", icon: "📋" },
        { label: "Interessados (pessoas)", href: "/pessoas/interessados", icon: "👥" },
        { label: "Colaboradores", href: "/pessoas/colaboradores", icon: "👥" },
      ],
    },
    {
      id: "alunos",
      title: "Alunos",
      items: [
        { label: "Novo aluno", href: "/alunos", icon: "🧑‍🎓" }, // TODO: rota específica /alunos/novo
        { label: "Lista de alunos", href: "/alunos", icon: "📋" },
        { label: "Matrículas", href: "/alunos/matriculas", icon: "📝" }, // TODO: rota ainda não implementada
        { label: "Currículos", href: "/alunos/curriculo", icon: "📄" },
        { label: "Grupos de alunos", href: "/alunos/grupos", icon: "👥" }, // TODO: rota ainda não implementada
      ],
    },
    {
      id: "academico",
      title: "Acadêmico",
      items: [
        { label: "Cursos", href: "/academico/cursos", icon: "📘" },
        { label: "Níveis", href: "/academico/niveis", icon: "🧱" },
        { label: "Módulos", href: "/academico/modulos", icon: "📚" },
        { label: "Avaliações", href: "/academico/avaliacoes", icon: "📝" },
        { label: "Habilidades", href: "/academico/habilidades", icon: "✨" },
        { label: "Modalidades", href: "/academico/modalidades", icon: "🎭" },
        { label: "Professores", href: "/academico/professores", icon: "🧑‍🏫" },
        { label: "Nova turma", href: "/academico/turmas/nova", icon: "🏫" },
        { label: "Turmas", href: "/academico/turmas", icon: "🏫" },
        { label: "Grade", href: "/academico/grade", icon: "📊" },
        { label: "Frequência", href: "/academico/frequencia", icon: "✅" },
      ],
    },
    {
      id: "movimento",
      title: "Movimento Conexão Dança",
      items: [
        { label: "Bolsas", href: "/movimento/bolsas", icon: "🎓" },
        { label: "Acolhimento", href: "/movimento/acolhimento", icon: "🤝" },
        { label: "Ações solidárias", href: "/movimento/acoes", icon: "❤️" },
        { label: "Informações sociais", href: "/movimento/informacoes-sociais", icon: "📂" },
      ],
    },
  ],

  loja: [
    {
      id: "inicio",
      title: "Início",
      items: [{ label: "Início", href: "/comercial/loja", icon: "🏪" }],
    },
    {
      id: "caixa",
      title: "Caixa & vendas",
      items: [
        { label: "Frente de caixa", href: "/loja/caixa", icon: "🧾" }, // TODO: rota não encontrada; revisar quando existir
        { label: "Pedidos da escola", href: "/comercial/loja/pedidos", icon: "📦" },
        { label: "Pedidos externos", href: "/comercial/loja/pedidos", icon: "📦" },
        { label: "Trocas & devoluções", href: "/comercial/loja/vendas", icon: "♻️" }, // TODO: rota específica não encontrada
      ],
    },
    {
      id: "produtos-estoque",
      title: "Produtos & estoque",
      items: [
        { label: "Produtos", href: "/comercial/loja/produtos", icon: "🎽" },
        { label: "Estoque", href: "/comercial/loja/estoque", icon: "📦" },
        { label: "Categorias", href: "/comercial/loja/categorias", icon: "🏷️" },
        { label: "Compras", href: "/comercial/loja/compras", icon: "🛒" },
        { label: "Relatórios", href: "/comercial/loja/relatorios", icon: "📊" },
      ],
    },
    {
      id: "pessoal-loja",
      title: "Pessoal da loja",
      items: [{ label: "Colaboradores da loja", href: "/comercial/loja", icon: "👥" }],
    },
  ],

  cafe: [
    {
      id: "inicio",
      title: "Início",
      items: [{ label: "Início", href: "/comercial/ballet-cafe", icon: "☕" }],
    },
    {
      id: "comandas-caixa",
      title: "Comandas & caixa",
      items: [
        { label: "Comandas", href: "/cafe/comandas", icon: "🧾" }, // TODO: rota não encontrada
        { label: "Pedidos", href: "/comercial/ballet-cafe/pedidos", icon: "🍰" },
        { label: "Caixa", href: "/cafe/caixa", icon: "💳" }, // TODO: rota não encontrada
      ],
    },
    {
      id: "produtos-estoque",
      title: "Produtos & estoque",
      items: [
        { label: "Cardápio", href: "/cafe/cardapio", icon: "📜" }, // TODO: rota não encontrada
        { label: "Estoque da cozinha", href: "/comercial/ballet-cafe/estoque", icon: "📦" },
        { label: "Categorias", href: "/comercial/ballet-cafe/categorias", icon: "🏷️" },
        { label: "Compras", href: "/comercial/ballet-cafe/compras", icon: "🛒" },
        { label: "Relatórios", href: "/comercial/ballet-cafe/relatorios", icon: "📊" },
      ],
    },
    {
      id: "pessoal-cafe",
      title: "Pessoal do café",
      items: [{ label: "Colaboradores do Café", href: "/comercial/ballet-cafe", icon: "👥" }],
    },
  ],

  admin: [
    {
      id: "inicio",
      title: "Início",
      items: [{ label: "Painel de administração", href: "/config/escola", icon: "📊" }],
    },
    {
      id: "config-unidades",
      title: "Configurações das unidades",
      items: [
        { label: "Configuração da escola", href: "/config/escola", icon: "🏫" },
        { label: "Configuração da loja", href: "/config/comercial/loja", icon: "🏪" },
        { label: "Configuração do Ballet Café", href: "/config/comercial/ballet-cafe", icon: "☕" },
        { label: "Endereços", href: "/config/enderecos", icon: "📍" },
      ],
    },
    {
      id: "colaboradores",
      title: "Colaboradores",
      items: [
        { label: "Gestão de colaboradores", href: "/config/colaboradores", icon: "👥" },
        { label: "Tipos de vínculo", href: "/config/colaboradores/tipos-vinculo", icon: "🔗" },
        { label: "Tipos de função", href: "/config/colaboradores/tipos-funcao", icon: "🧩" },
        { label: "Centros de custo / centros base", href: "/administracao/financeiro/centros-custo", icon: "🧮" },
        { label: "Jornadas de trabalho", href: "/config/colaboradores/jornadas", icon: "⏱️" }, // TODO: rota não encontrada
      ],
    },
    {
      id: "usuarios",
      title: "Usuários & segurança",
      items: [
        { label: "Usuários", href: "/config/usuarios", icon: "👤" },
        { label: "Perfis", href: "/config/perfis", icon: "❤️" },
        { label: "Permissões", href: "/config/permissoes", icon: "🔒" },
        { label: "Auditoria do sistema", href: "/relatorios/auditoria", icon: "📜" },
      ],
    },
    {
      id: "financeiro",
      title: "Financeiro (Admin)",
      items: [
        { label: "Dashboard financeiro", href: "/administracao/financeiro", icon: "📊" },
        { label: "Centros de custo (financeiro)", href: "/administracao/financeiro/centros-custo", icon: "🧮" },
        { label: "Plano de contas", href: "/administracao/financeiro/plano-contas", icon: "📘" },
        { label: "Categorias financeiras", href: "/administracao/financeiro/categorias", icon: "🏷️" },
        { label: "Contas a receber (Admin)", href: "/administracao/financeiro/contas-receber", icon: "💰" },
        { label: "Contas a pagar (Admin)", href: "/administracao/financeiro/contas-pagar", icon: "💳" },
        { label: "Movimentação", href: "/administracao/financeiro/movimento", icon: "💸" },
        { label: "Lançamentos manuais", href: "/administracao/financeiro/lancamentos-manuais", icon: "✍️" },
      ],
    },
    {
      id: "contratos",
      title: "Contratos & integrações",
      items: [
        { label: "Modelos de contrato", href: "/config/contratos", icon: "📄" },
        { label: "Integrações gerais", href: "/config/integacoes", icon: "🔌" },
      ],
    },
    {
      id: "relatorios",
      title: "Painel do Diretor — Relatórios",
      items: [
        { label: "Relatórios", href: "/relatorios", icon: "📊" },
        { label: "Auditoria do sistema", href: "/relatorios/auditoria", icon: "📜" },
      ],
    },
  ],
};
