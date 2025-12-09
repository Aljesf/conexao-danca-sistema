import type { SidebarSection } from "./types";

export const escolaSidebar: SidebarSection[] = [
  {
    id: "escola-inicio",
    title: "Início",
    items: [{ label: "Início", href: "/escola" }],
  },
  {
    id: "escola-caixa",
    title: "Caixa (Escola)",
    items: [{ label: "Frente de caixa", href: "/escola/caixa" }],
  },
  {
    id: "escola-calendario",
    title: "Calendário",
    items: [
      { label: "Visão geral", href: "/escola/calendario" },
      { label: "Eventos internos", href: "/escola/calendario/eventos-internos" },
      { label: "Eventos externos", href: "/escola/calendario/eventos-externos" },
      { label: "Feriados", href: "/escola/calendario/feriados" },
    ],
  },
  {
    id: "escola-captacao",
    title: "Captação (CRM)",
    items: [
      { label: "Visão geral", href: "/escola/captacao" },
      { label: "Novo interessado", href: "/escola/captacao/novo" },
      { label: "Interessados", href: "/escola/captacao/interessados" },
    ],
  },
  {
    id: "escola-pessoas",
    title: "Pessoas",
    items: [
      { label: "Nova pessoa", href: "/escola/pessoas/nova" },
      { label: "Lista de pessoas", href: "/escola/pessoas" },
    ],
  },
  {
    id: "escola-alunos",
    title: "Alunos",
    items: [
      { label: "Novo aluno", href: "/escola/alunos/novo" },
      { label: "Lista de alunos", href: "/escola/alunos" },
      { label: "Matrículas", href: "/escola/alunos/matriculas" },
      { label: "Currículo", href: "/escola/alunos/curriculo" },
      { label: "Grupos de alunos", href: "/escola/alunos/grupos" },
    ],
  },
  {
    id: "escola-academico",
    title: "Acadêmico",
    items: [
      { label: "Cursos", href: "/escola/academico/cursos" },
      { label: "Níveis", href: "/escola/academico/niveis" },
      { label: "Módulos", href: "/escola/academico/modulos" },
      { label: "Avaliações", href: "/escola/academico/avaliacoes" },
      { label: "Professores", href: "/escola/academico/professores" },
      { label: "Nova turma", href: "/escola/academico/turmas/nova" },
      { label: "Turmas", href: "/escola/academico/turmas" },
      { label: "Grade", href: "/escola/academico/grade" },
      { label: "Frequência", href: "/escola/academico/frequencia" },
    ],
  },
  {
    id: "escola-movimento",
    title: "Movimento Conexão Dança",
    items: [
      { label: "Bolsas", href: "/escola/movimento/bolsas" },
      { label: "Acolhimento", href: "/escola/movimento/acolhimento" },
      { label: "Ações solidárias", href: "/escola/movimento/acoes-solidarias" },
      { label: "Informações sociais", href: "/escola/movimento/informacoes-sociais" },
    ],
  },
];
