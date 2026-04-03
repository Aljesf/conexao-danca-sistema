import type { SidebarSection } from "./types";

export const escolaSidebar: SidebarSection[] = [
  {
    id: "escola-inicio",
    title: "🏠 Início",
    items: [{ label: "🏠 Início", href: "/escola" }], // TODO(migracao): rota /escola ainda nao existe
  },
  {
    id: "escola-caixa",
    title: "💰 Caixa / Secretaria",
    items: [{ label: "💰 Caixa da Secretaria", href: "/secretaria/caixa" }],
  },
  {
    id: "escola-calendario",
    title: "📅 Calendário",
    items: [
      { label: "📅 Visão geral", href: "/escola/calendario" },
      { label: "🗓️ Feriados", href: "/escola/calendario/feriados" },
    ],
  },
  {
    id: "escola-eventos",
    title: "🎭 Eventos da Escola",
    items: [
      { label: "🎭 Visão geral", href: "/escola/eventos" },
      { label: "🧱 Novo evento-base", href: "/escola/eventos/novo-evento" },
      { label: "➕ Nova edição", href: "/escola/eventos/nova" },
      { label: "🗓️ Agenda / calendário", href: "/escola/eventos/agenda" },
      { label: "🧾 Inscrições", href: "/escola/eventos/inscricoes" },
      { label: "💃 Coreografias / elencos", href: "/escola/eventos/coreografias" },
      { label: "🏷️ Estilos de coreografia", href: "/escola/eventos/coreografia-estilos" },
      { label: "🎬 Produções / contratações", href: "/escola/eventos/producoes" },
      { label: "💰 Financeiro", href: "/escola/eventos/financeiro" },
      { label: "📊 Relatórios", href: "/escola/eventos/relatorios" },
    ],
  },
  {
    id: "escola-captacao",
    title: "🎯 Captação (CRM)",
    items: [
      { label: "📌 Visão geral", href: "/captacao" },
      { label: "➕ Novo interessado", href: "/captacao/novo" },
      { label: "👥 Interessados", href: "/captacao/interessados" },
    ],
  },
  {
    id: "escola-pessoas",
    title: "👤 Pessoas",
    items: [
      { label: "➕ Nova pessoa", href: "/escola/pessoas/nova" },
      { label: "📋 Lista de pessoas", href: "/escola/pessoas" },
    ],
  },
  {
    id: "escola-alunos",
    title: "🎓 Alunos",
    items: [
      { label: "🧾 Matrículas", href: "/escola/matriculas" },
      { label: "📋 Lista de alunos", href: "/escola/alunos/lista" },
      { label: "🧠 Currículo", href: "/escola/alunos/curriculos" },
      { label: "👥 Núcleos", href: "/escola/alunos/grupos" },
    ],
  },
  {
    id: "escola-academico",
    title: "📚 Acadêmico",
    items: [
      { label: "📘 Cursos", href: "/escola/academico/cursos" },
      { label: "🧩 Cursos Livres", href: "/escola/academico/cursos-livres" },
      { label: "🧠 Níveis", href: "/escola/academico/niveis" },
      { label: "🗂️ Módulos", href: "/escola/academico/modulos" },
      { label: "📝 Plano de aula", href: "/academico/planejamento" },
      { label: "🗓️ Períodos letivos", href: "/escola/academico/periodos-letivos" },
      { label: "📊 Avaliações", href: "/escola/academico/avaliacoes" },
      { label: "👩‍🏫 Professores", href: "/config/escola/professores" },
      { label: "➕ Nova turma", href: "/escola/academico/turmas/nova" },
      { label: "🏫 Turmas", href: "/escola/turmas" },
      { label: "🧮 Grade", href: "/escola/academico/turmas/grade" },
      { label: "📒 Diário de classe", href: "/escola/diario-de-classe" },
    ],
  },
  {
    id: "escola-movimento",
    title: "💜 Movimento Conexão Dança",
    items: [
      { label: "🎓 Bolsas", href: "/movimento/bolsas" },
      { label: "🤝 Acolhimento", href: "/movimento/acolhimento" },
      { label: "🎁 Ações solidárias", href: "/movimento/acoes" }, // TODO(migracao): equivalencia incerta
      { label: "🧾 Informações sociais", href: "/movimento/informacoes-sociais" },
    ],
  },
];

