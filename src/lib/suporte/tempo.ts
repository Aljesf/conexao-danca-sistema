import {
  isSuporteTicketResolvido,
  type SuporteTicketPrioridade,
  type SuporteTicketStatus,
  type SuporteTicketTempoResumo,
  type SuporteTicketTipo,
  type SuporteTicketsMetricas,
} from "./constants";

type TicketTempoBase = {
  status: SuporteTicketStatus;
  created_at: string;
  resolved_at: string | null;
};

type TicketMetricasBase = TicketTempoBase & {
  prioridade: SuporteTicketPrioridade;
  tipo: SuporteTicketTipo;
};

function parseTimestamp(value: string | null | undefined) {
  if (!value) return null;
  const parsed = Date.parse(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function normalizeNow(now: Date | number | string) {
  if (typeof now === "number") return now;
  if (typeof now === "string") return parseTimestamp(now) ?? Date.now();
  return now.getTime();
}

function calcularMedia(valores: number[]) {
  if (valores.length === 0) return null;
  return Math.round(valores.reduce((total, atual) => total + atual, 0) / valores.length);
}

export function formatarDuracaoHumana(ms: number | null | undefined) {
  if (ms == null || !Number.isFinite(ms)) return null;

  const duracao = Math.max(0, Math.trunc(ms));
  const totalMinutos = Math.floor(duracao / 60_000);

  if (totalMinutos <= 0) return "< 1 min";

  const dias = Math.floor(totalMinutos / 1_440);
  const horas = Math.floor((totalMinutos % 1_440) / 60);
  const minutos = totalMinutos % 60;
  const partes: string[] = [];

  if (dias > 0) partes.push(`${dias}d`);
  if (horas > 0) partes.push(`${horas}h`);
  if (minutos > 0) partes.push(`${minutos}min`);

  return partes.slice(0, 2).join(" ");
}

export function calcularTempoAberto(createdAt: string, now: Date | number | string = new Date()) {
  const createdAtMs = parseTimestamp(createdAt);
  if (createdAtMs == null) return null;
  return Math.max(0, normalizeNow(now) - createdAtMs);
}

export function calcularTempoResolucao(createdAt: string, resolvidoEm: string | null | undefined) {
  const createdAtMs = parseTimestamp(createdAt);
  const resolvedAtMs = parseTimestamp(resolvidoEm);
  if (createdAtMs == null || resolvedAtMs == null) return null;
  return Math.max(0, resolvedAtMs - createdAtMs);
}

export function enriquecerTicketComTempo<T extends TicketTempoBase>(
  ticket: T,
  now: Date | number | string = new Date(),
): T & SuporteTicketTempoResumo {
  const estaResolvido = isSuporteTicketResolvido(ticket.status);
  const tempoAberto = estaResolvido ? null : calcularTempoAberto(ticket.created_at, now);
  const tempoResolucao = estaResolvido ? calcularTempoResolucao(ticket.created_at, ticket.resolved_at) : null;

  return {
    ...ticket,
    esta_resolvido: estaResolvido,
    tempo_aberto_ms: tempoAberto,
    tempo_resolucao_ms: tempoResolucao,
    tempo_aberto_formatado: formatarDuracaoHumana(tempoAberto),
    tempo_resolucao_formatado: formatarDuracaoHumana(tempoResolucao),
  };
}

export function agregarMetricasTickets<T extends TicketMetricasBase>(
  lista: T[],
  now: Date | number | string = new Date(),
): SuporteTicketsMetricas {
  const nowMs = normalizeNow(now);
  const temposAbertos: number[] = [];
  const temposResolucao: number[] = [];

  let totalAbertos = 0;
  let totalResolvidos = 0;
  let totalCriticos = 0;
  let totalErros = 0;
  let ticketAbertoMaisAntigoMs: number | null = null;

  for (const ticket of lista) {
    if (ticket.prioridade === "CRITICA") totalCriticos += 1;
    if (ticket.tipo === "ERRO_SISTEMA") totalErros += 1;

    if (isSuporteTicketResolvido(ticket.status)) {
      totalResolvidos += 1;
      const tempoResolucao = calcularTempoResolucao(ticket.created_at, ticket.resolved_at);
      if (tempoResolucao != null) {
        temposResolucao.push(tempoResolucao);
      }
      continue;
    }

    totalAbertos += 1;
    const tempoAberto = calcularTempoAberto(ticket.created_at, nowMs);
    if (tempoAberto == null) continue;
    temposAbertos.push(tempoAberto);
    ticketAbertoMaisAntigoMs =
      ticketAbertoMaisAntigoMs == null ? tempoAberto : Math.max(ticketAbertoMaisAntigoMs, tempoAberto);
  }

  const tempoMedioResolucao = calcularMedia(temposResolucao);
  const tempoMedioAbertos = calcularMedia(temposAbertos);

  return {
    total_tickets: lista.length,
    total_abertos: totalAbertos,
    total_resolvidos: totalResolvidos,
    total_criticos: totalCriticos,
    total_erros: totalErros,
    tempo_medio_resolucao_ms: tempoMedioResolucao,
    tempo_medio_abertos_ms: tempoMedioAbertos,
    ticket_aberto_mais_antigo_ms: ticketAbertoMaisAntigoMs,
    tempo_medio_resolucao_formatado: formatarDuracaoHumana(tempoMedioResolucao),
    tempo_medio_abertos_formatado: formatarDuracaoHumana(tempoMedioAbertos),
    ticket_aberto_mais_antigo_formatado: formatarDuracaoHumana(ticketAbertoMaisAntigoMs),
  };
}
