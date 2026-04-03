export const SUPORTE_TICKET_TIPOS = ["ERRO_SISTEMA", "MELHORIA_SISTEMA"] as const;
export const SUPORTE_TICKET_STATUS = [
  "ABERTO",
  "EM_TRIAGEM",
  "EM_ANALISE",
  "EM_DESENVOLVIMENTO",
  "AGUARDANDO_VALIDACAO",
  "CONCLUIDO",
  "CANCELADO",
] as const;
export const SUPORTE_TICKET_STATUS_RESOLVIDOS = ["CONCLUIDO", "CANCELADO"] as const;
export const SUPORTE_TICKET_PRIORIDADES = ["BAIXA", "MEDIA", "ALTA", "CRITICA"] as const;
export const SUPORTE_TICKET_ORIGENS = ["BOTAO_FLUTUANTE", "PAINEL_SUPORTE", "API", "INTERNO"] as const;
export const SUPORTE_TICKET_VIEWS = ["abertos", "resolvidos", "todos"] as const;
export const SUPORTE_UPLOAD_ORIGENS = [
  "file_picker",
  "clipboard",
  "drag_drop",
  "auto_capture",
  "legacy",
] as const;
export const SUPORTE_ANALISE_IA_STATUS = [
  "nao_solicitada",
  "solicitada",
  "processando",
  "concluida",
  "falhou",
] as const;
export const SUPORTE_ANALISE_IA_MODOS = ["contextual", "aprofundada"] as const;

export type SuporteTicketTipo = (typeof SUPORTE_TICKET_TIPOS)[number];
export type SuporteTicketStatus = (typeof SUPORTE_TICKET_STATUS)[number];
export type SuporteTicketPrioridade = (typeof SUPORTE_TICKET_PRIORIDADES)[number];
export type SuporteTicketOrigem = (typeof SUPORTE_TICKET_ORIGENS)[number];
export type SuporteTicketView = (typeof SUPORTE_TICKET_VIEWS)[number];
export type SuporteUploadOrigem = (typeof SUPORTE_UPLOAD_ORIGENS)[number];
export type SuporteAnaliseIaStatus = (typeof SUPORTE_ANALISE_IA_STATUS)[number];
export type SuporteAnaliseIaModo = (typeof SUPORTE_ANALISE_IA_MODOS)[number];

export type SupportLastError = {
  message: string | null;
  stack: string | null;
  name: string | null;
  timestamp: string;
};

export type SuporteUsuarioContexto = {
  id: string | null;
  email: string | null;
  nome: string | null;
};

export type SuporteContextoTela = {
  pathname: string | null;
  href: string | null;
  pageTitle: string | null;
  contextoSlug: string | null;
  contextoNome: string | null;
  entityType: string | null;
  entityId: string | null;
  entityLabel: string | null;
  alunoNome: string | null;
  responsavelNome: string | null;
  turmaNome: string | null;
  observacoesContexto: string | null;
  resumoLegivel: string | null;
  usuario: SuporteUsuarioContexto;
  userAgent: string | null;
  viewport: {
    largura: number | null;
    altura: number | null;
  };
  timestampIso: string;
  lastError: SupportLastError | null;
};

export type SuporteTicketAnexo = {
  id: number;
  ticket_id: number;
  storage_bucket: string;
  storage_path: string;
  public_url: string;
  nome_arquivo: string;
  mime_type: string;
  tamanho_bytes: number;
  largura: number | null;
  altura: number | null;
  origem_upload: SuporteUploadOrigem;
  screen_context_json: Record<string, unknown>;
  metadata_json: Record<string, unknown>;
  created_at: string;
};

export type SuporteAnaliseIa = {
  resumo: string;
  natureza_problema: string;
  impacto_estimado: string;
  area_sistema: string;
  hipoteses: string[];
  sinais_detectados: string[];
  sugestoes_investigacao: string[];
  limitacoes: string[];
  fontes_utilizadas: string[];
  meta: {
    fonte: "OPENAI";
    model: string | null;
    createdAt: string;
    modo: SuporteAnaliseIaModo;
    status: Exclude<SuporteAnaliseIaStatus, "nao_solicitada" | "solicitada" | "processando">;
    attachmentsConsiderados: number;
    imagensConsideradas: number;
    leituraTecnicaAprofundada: boolean;
  };
};

export type SuporteTicketTempoResumo = {
  esta_resolvido: boolean;
  tempo_aberto_ms: number | null;
  tempo_resolucao_ms: number | null;
  tempo_aberto_formatado: string | null;
  tempo_resolucao_formatado: string | null;
};

export type SuporteTicketsMetricas = {
  total_tickets: number;
  total_abertos: number;
  total_resolvidos: number;
  total_criticos: number;
  total_erros: number;
  tempo_medio_resolucao_ms: number | null;
  tempo_medio_abertos_ms: number | null;
  ticket_aberto_mais_antigo_ms: number | null;
  tempo_medio_resolucao_formatado: string | null;
  tempo_medio_abertos_formatado: string | null;
  ticket_aberto_mais_antigo_formatado: string | null;
};

export type SuporteTicketResumo = SuporteTicketTempoResumo & {
  id: number;
  codigo: string | null;
  tipo: SuporteTicketTipo;
  status: SuporteTicketStatus;
  prioridade: SuporteTicketPrioridade;
  titulo: string | null;
  descricao: string;
  contexto_slug: string | null;
  contexto_nome: string | null;
  rota_path: string | null;
  pagina_titulo: string | null;
  screenshot_url: string | null;
  reported_by: string | null;
  responsavel_uuid: string | null;
  created_at: string;
  updated_at: string;
  resolved_at: string | null;
  dados_tecnicos_json?: Record<string, unknown> | null;
  attachments_count?: number | null;
  analise_ia_texto?: string | null;
  analise_ia_md?: string | null;
  analise_ia_json?: SuporteAnaliseIa | null;
  analise_ia_solicitada?: boolean;
  analise_ia_status?: SuporteAnaliseIaStatus | null;
  analise_ia_modo?: SuporteAnaliseIaModo | null;
  analise_ia_solicitada_em?: string | null;
  analise_ia_solicitada_por?: string | null;
  analise_ia_concluida_em?: string | null;
};

export type SuporteTicketDetalhe = SuporteTicketResumo & {
  url_completa: string | null;
  origem: SuporteTicketOrigem;
  dados_contexto_json: Record<string, unknown>;
  dados_tecnicos_json: Record<string, unknown>;
  erro_mensagem: string | null;
  erro_stack: string | null;
  erro_nome: string | null;
  user_agent: string | null;
  viewport_largura: number | null;
  viewport_altura: number | null;
  attachments: SuporteTicketAnexo[];
  legacyScreenshotUrl: string | null;
};

export const SUPORTE_TIPO_LABEL: Record<SuporteTicketTipo, string> = {
  ERRO_SISTEMA: "Erro do sistema",
  MELHORIA_SISTEMA: "Melhoria do sistema",
};

export const SUPORTE_STATUS_LABEL: Record<SuporteTicketStatus, string> = {
  ABERTO: "Aberto",
  EM_TRIAGEM: "Em triagem",
  EM_ANALISE: "Em analise",
  EM_DESENVOLVIMENTO: "Em desenvolvimento",
  AGUARDANDO_VALIDACAO: "Aguardando validacao",
  CONCLUIDO: "Concluido",
  CANCELADO: "Cancelado",
};

export const SUPORTE_PRIORIDADE_LABEL: Record<SuporteTicketPrioridade, string> = {
  BAIXA: "Baixa",
  MEDIA: "Media",
  ALTA: "Alta",
  CRITICA: "Critica",
};

export const SUPORTE_ANALISE_IA_STATUS_LABEL: Record<SuporteAnaliseIaStatus, string> = {
  nao_solicitada: "Nao solicitada",
  solicitada: "Solicitada",
  processando: "Processando",
  concluida: "Concluida",
  falhou: "Falhou",
};

export const SUPORTE_ANALISE_IA_MODO_LABEL: Record<SuporteAnaliseIaModo, string> = {
  contextual: "Leitura inicial do contexto",
  aprofundada: "Leitura tecnica aprofundada",
};

export const SUPORTE_BADGE_CLASS: Record<SuporteTicketStatus | SuporteTicketPrioridade, string> = {
  ABERTO: "border-amber-200 bg-amber-50 text-amber-800",
  EM_TRIAGEM: "border-sky-200 bg-sky-50 text-sky-800",
  EM_ANALISE: "border-indigo-200 bg-indigo-50 text-indigo-800",
  EM_DESENVOLVIMENTO: "border-violet-200 bg-violet-50 text-violet-800",
  AGUARDANDO_VALIDACAO: "border-cyan-200 bg-cyan-50 text-cyan-800",
  CONCLUIDO: "border-emerald-200 bg-emerald-50 text-emerald-800",
  CANCELADO: "border-slate-200 bg-slate-100 text-slate-700",
  BAIXA: "border-slate-200 bg-slate-50 text-slate-700",
  MEDIA: "border-sky-200 bg-sky-50 text-sky-800",
  ALTA: "border-orange-200 bg-orange-50 text-orange-800",
  CRITICA: "border-rose-200 bg-rose-50 text-rose-800",
};

export function inferirPrioridadePorTipo(tipo: SuporteTicketTipo): SuporteTicketPrioridade {
  return tipo === "ERRO_SISTEMA" ? "ALTA" : "MEDIA";
}

export function isSuporteTicketTipo(value: unknown): value is SuporteTicketTipo {
  return typeof value === "string" && SUPORTE_TICKET_TIPOS.includes(value as SuporteTicketTipo);
}

export function isSuporteTicketStatus(value: unknown): value is SuporteTicketStatus {
  return typeof value === "string" && SUPORTE_TICKET_STATUS.includes(value as SuporteTicketStatus);
}

export function isSuporteTicketResolvido(value: unknown): value is (typeof SUPORTE_TICKET_STATUS_RESOLVIDOS)[number] {
  return typeof value === "string" && SUPORTE_TICKET_STATUS_RESOLVIDOS.includes(value as (typeof SUPORTE_TICKET_STATUS_RESOLVIDOS)[number]);
}

export function isSuporteTicketPrioridade(value: unknown): value is SuporteTicketPrioridade {
  return typeof value === "string" && SUPORTE_TICKET_PRIORIDADES.includes(value as SuporteTicketPrioridade);
}

export function isSuporteTicketView(value: unknown): value is SuporteTicketView {
  return typeof value === "string" && SUPORTE_TICKET_VIEWS.includes(value as SuporteTicketView);
}

export function isSuporteUploadOrigem(value: unknown): value is SuporteUploadOrigem {
  return typeof value === "string" && SUPORTE_UPLOAD_ORIGENS.includes(value as SuporteUploadOrigem);
}

export function isSuporteAnaliseIaStatus(value: unknown): value is SuporteAnaliseIaStatus {
  return typeof value === "string" && SUPORTE_ANALISE_IA_STATUS.includes(value as SuporteAnaliseIaStatus);
}

export function isSuporteAnaliseIaModo(value: unknown): value is SuporteAnaliseIaModo {
  return typeof value === "string" && SUPORTE_ANALISE_IA_MODOS.includes(value as SuporteAnaliseIaModo);
}
