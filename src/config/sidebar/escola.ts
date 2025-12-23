import type { SidebarSection } from "./types";

export const escolaSidebar: SidebarSection[] = [
  {
    id: "escola-inicio",
    title: "Início",
    items: [{ label: "🚧 🏫 Início", href: "/escola" }], // TODO(migracao): rota /escola ainda não existe
  },
  {
    id: "escola-caixa",
    title: "Caixa (Escola)",
    items: [{ label: "🚧 💳 Frente de caixa", href: "/escola/caixa" }], // TODO(migracao): ainda sem equivalente confirmado
  },
  {
    id: "escola-calendario",
    title: "Calendário",
    items: [
      { label: "🚧 📅 Visão geral", href: "/calendario" },
      { label: "🚧 📅 Eventos internos", href: "/calendario/eventos-internos" },
      { label: "🚧 📅 Eventos externos", href: "/calendario/eventos-externos" },
      { label: "🚧 📅 Feriados", href: "/calendario/feriados" },
    ],
  },
  {
    id: "escola-captacao",
    title: "Captação (CRM)",
    items: [
      { label: "🚧 🎯 Visão geral", href: "/captacao" },
      { label: "🚧 🎯 Novo interessado", href: "/captacao/novo" },
      { label: "🚧 🎯 Interessados", href: "/captacao/interessados" },
    ],
  },
  {
    id: "escola-pessoas",
    title: "Pessoas",
    items: [
      { label: "👥 Nova pessoa", href: "/escola/pessoas/nova" },
      { label: "👥 Lista de pessoas", href: "/escola/pessoas" },
    ],
  },
  {
    id: "escola-alunos",
    title: "Alunos",
    items: [
      { label: "🚧 🎓 Novo aluno", href: "/alunos/novo" },
      { label: "🚧 🎓 Lista de alunos", href: "/alunos" },
      { label: "🚧 🎓 Matrículas", href: "/alunos/matriculas" },
      { label: "🚧 🎓 Currículo", href: "/alunos/curriculo" },
      { label: "🚧 🎓 Grupos de alunos", href: "/escola/alunos/grupos" }, // TODO(migracao): rota ainda não existe
    ],
  },
  {
    id: "escola-academico",
    title: "Acadêmico",
    items: [
      { label: "🚧 📚 Cursos", href: "/academico/cursos" },
      { label: "🚧 📚 Níveis", href: "/academico/niveis" },
      { label: "🚧 📚 Módulos", href: "/academico/modulos" },
      { label: "🚧 📚 Avaliações", href: "/academico/avaliacoes" },
      { label: "🚧 📚 Professores", href: "/escola/academico/professores" }, // TODO(migracao): rota ainda não existe
      { label: "📚 Nova turma", href: "/escola/academico/turmas/nova" },
      { label: "📚 Turmas", href: "/escola/academico/turmas" },
      { label: "🚧 📚 Grade", href: "/academico/turmas/grade" },
      { label: "🚧 📚 Frequência", href: "/academico/frequencia" },
    ],
  },
  {
    id: "escola-movimento",
    title: "Movimento Conexão Dança",
    items: [
      { label: "🚧 🤝 Bolsas", href: "/movimento/bolsas" },
      { label: "🚧 🤝 Acolhimento", href: "/movimento/acolhimento" },
      { label: "🚧 🤝 Ações solidárias", href: "/movimento/acoes" }, // TODO(migracao): equivalência incerta
      { label: "🚧 🤝 Informações sociais", href: "/movimento/informacoes-sociais" },
    ],
  },
];
