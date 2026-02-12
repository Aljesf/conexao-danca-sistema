// Encoding: UTF-8
import type { SidebarSection } from "./types";

export const adminSidebar: SidebarSection[] = [
  {
    id: "admin-inicio",
    title: "🏠 Inicio",
    items: [{ label: "🧭 Painel de administracao", href: "/admin" }],
  },
  {
    id: "admin-financeiro",
    title: "💰 Financeiro (Admin)",
    items: [
      { label: "📊 Dashboard financeiro", href: "/admin/financeiro" },
      { label: "🧾 Folha - Colaboradores", href: "/admin/financeiro/folha/colaboradores" },
      { label: "🧾 Planos de preco (aluno)", href: "/admin/financeiro/planos-preco-alunos" },
      { label: "📥 Contas a receber", href: "/admin/financeiro/contas-receber" },
      { label: "📤 Contas a pagar", href: "/admin/financeiro/contas-pagar" },
      { label: "🎯 Centros de custo (financeiro)", href: "/admin/financeiro/centros-custo" },
      { label: "📚 Plano de contas", href: "/admin/financeiro/plano-contas" },
      { label: "🏷️ Categorias financeiras", href: "/admin/financeiro/categorias" },
      { label: "🏦 Contas financeiras", href: "/admin/financeiro/contas-financeiras" },
      { label: "🔄 Movimento", href: "/admin/financeiro/movimento" },
      { label: "✍️ Lancamentos manuais", href: "/admin/financeiro/lancamentos-manuais" },
    ],
  },
  {
    id: "admin-bolsas-projetos",
    title: "🎓 Bolsas & Projetos Sociais (Admin)",
    items: [
      { label: "🏠 Painel de bolsas", href: "/administracao/bolsas" },
      { label: "🧩 Projetos sociais", href: "/administracao/bolsas/projetos" },
      { label: "🏷️ Tipos de bolsa", href: "/administracao/bolsas/tipos" },
      { label: "🎟️ Concessoes", href: "/administracao/bolsas/concessoes" },
      { label: "📒 Ledger de investimento", href: "/administracao/bolsas/ledger" },
      { label: "🗂️ Legado: Painel do Movimento", href: "/admin/movimento" },
      { label: "🗂️ Legado: Analises socioeconomicas", href: "/admin/movimento/analises" },
      { label: "🗂️ Legado: Beneficiarios", href: "/admin/movimento/beneficiarios" },
      { label: "🗂️ Legado: Conceder creditos", href: "/admin/movimento/creditos" },
      { label: "🗂️ Legado: Lotes", href: "/admin/movimento/lotes" },
      { label: "🗂️ Legado: Saldos", href: "/admin/movimento/saldos" },
      { label: "🗂️ Legado: Deficit institucional", href: "/admin/movimento/deficit" },
    ],
  },
  {
    id: "admin-cartoes",
    title: "💳 Cartoes (Admin)",
    items: [
      { label: "⚙️ Configuracao de cartoes", href: "/admin/financeiro/cartao/configuracoes" },
      { label: "💰 Recebiveis de cartao", href: "/admin/financeiro/cartao/recebiveis" },
    ],
  },
  {
    id: "admin-credito-conexao",
    title: "💠 Credito Conexao (Admin)",
    items: [
      { label: "🏦 Contas", href: "/admin/financeiro/credito-conexao/contas" },
      { label: "🧾 Faturas", href: "/admin/financeiro/credito-conexao/faturas" },
      { label: "⚙️ Configuracoes", href: "/admin/financeiro/credito-conexao/configuracoes" },
    ],
  },
  {
    id: "admin-documentos",
    title: "📄 Documentos",
    items: [
      { label: "🆕 Novo documento", href: "/admin/config/documentos" },
      { label: "🧩 Modelos", href: "/admin/config/documentos/modelos" },
      { label: "🔣 Variaveis", href: "/admin/config/documentos/variaveis" },
      { label: "🗂️ Colecoes", href: "/admin/config/documentos/colecoes" },
      { label: "🧱 Conjuntos", href: "/admin/config/documentos/conjuntos" },
      { label: "📤 Documentos emitidos", href: "/admin/config/documentos/emitidos" },
      { label: "🏷️ Tipos de documento", href: "/admin/config/documentos/tipos" },
    ],
  },
  {
    id: "admin-formularios",
    title: "?? Formularios",
    items: [
      { label: "?? Banco de Perguntas", href: "/admin/forms/questions" },
      { label: "?? Formularios (Templates)", href: "/admin/forms/templates" },
      { label: "\ud83d\udcca Resultados (Formularios)", href: "/admin/forms/results" },
    ],
  },
  {
    id: "admin-loja-admin",
    title: "🛍️ Loja (Admin)",
    items: [
      { label: "🏷️ Produtos", href: "/admin/loja/produtos" },
      { label: "📦 Gestao de estoque", href: "/admin/loja/gestao-estoque" },
      { label: "📋 Listas de demanda", href: "/admin/loja/listas-demanda" },
      { label: "🛒 Compras", href: "/admin/loja/compras" },
      { label: "🚚 Fornecedores", href: "/admin/loja/fornecedores" },
      { label: "🏷️ Categorias", href: "/admin/loja/categorias" },
      { label: "⚙️ Configuracoes do produto", href: "/admin/loja/cadastros" },
    ],
  },
  {
    id: "admin-cafe",
    title: "Ballet Cafe (Admin)",
    items: [
      { label: "Configuracoes", href: "/admin/cafe" },
      { label: "Insumos", href: "/admin/cafe/insumos" },
      { label: "Produtos", href: "/admin/cafe/produtos" },
      { label: "Tabelas de preco", href: "/admin/cafe/tabelas-preco" },
      { label: "Compras de insumos", href: "/admin/cafe/compras" },
    ],
  },
  {
    id: "admin-colaboradores",
    title: "👥 Colaboradores",
    items: [
      { label: "👥 Gestao de colaboradores", href: "/admin/config/colaboradores" },
      { label: "🧾 Folha de pagamento", href: "/admin/financeiro/folha/colaboradores" },
      { label: "🔗 Tipos de vinculo", href: "/admin/config/colaboradores/tipos-vinculo" },
      { label: "🧰 Tipos de funcao", href: "/admin/config/colaboradores/tipos-funcao" },
      { label: "🗓️ Jornadas de trabalho", href: "/admin/config/colaboradores/jornadas" },
    ],
  },
  {
    id: "admin-config-unidades",
    title: "🏢 Configuracoes das unidades",
    items: [
      { label: "🏫 Configuracao da escola", href: "/admin/config/escola" },
      { label: "📏 Regras de valor", href: "/admin/config/escola/regras-valor" },
      { label: "🛍️ Configuracao da loja", href: "/admin/config/loja" },
      { label: "☕ Configuracao do Ballet Cafe", href: "/admin/config/cafe" },
    ],
  },
  {
    id: "admin-config-escola",
    title: "⚙️ Configuracoes (Escola)",
    items: [
      { label: "📍 Locais", href: "/admin/configuracoes/locais" },
      { label: "🏟️ Espacos", href: "/admin/configuracoes/espacos" },
      { label: "💳 Planos de preco", href: "/admin/config/escola/regras-valor/planos" },
      { label: "🧾 Tabelas de precos (Escola)", href: "/admin/escola/configuracoes/matriculas/tabelas" },
      { label: "💰 Planos de pagamento (matricula)", href: "/admin/escola/configuracoes/matriculas/planos-pagamento" },
    ],
  },
  {
    id: "admin-auditoria",
    title: "🛡️ Governanca & Auditoria",
    items: [
      { label: "🛠️ Construtor de Relatorios", href: "/admin/relatorios/construtor" },
      { label: "🕵️ Auditoria do sistema", href: "/admin/relatorios/auditoria" },
      { label: "🧾 Boletos (NeoFin)", href: "/admin/governanca/boletos-neofin" },
      { label: "💸 Cobrancas", href: "/admin/governanca/cobrancas" },
    ],
  },
  {
    id: "admin-usuarios",
    title: "🔐 Usuarios & Seguranca",
    items: [
      { label: "👤 Usuarios", href: "/admin/usuarios" },
      { label: "🆔 Perfis", href: "/admin/perfis" },
      { label: "🗝️ Permissoes", href: "/admin/permissoes" },
    ],
  },
  {
    id: "admin-ui",
    title: "✨ UI / IA",
    items: [{ label: "🤖 Painel de IA (GPT interno)", href: "/admin/ia" }],
  },
];




