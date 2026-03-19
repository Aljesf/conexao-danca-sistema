import { Pool, type PoolClient, type QueryResultRow } from "pg";

const STATUSS_QUITADOS = new Set([
  "PAGO",
  "PAGA",
  "RECEBIDO",
  "RECEBIDA",
  "LIQUIDADO",
  "LIQUIDADA",
  "QUITADO",
  "QUITADA",
]);

let pool: Pool | null = null;

export type TipoCancelamentoCobranca =
  | "CANCELAMENTO_OPERACIONAL"
  | "CANCELAMENTO_POR_MATRICULA_CANCELADA"
  | "CANCELAMENTO_POR_AJUSTE_SISTEMA"
  | "OUTRO";

export type CobrancaHistoricoEvento = {
  id: number;
  cobranca_id: number;
  tipo_evento: string;
  payload_anterior: unknown;
  payload_novo: unknown;
  observacao: string | null;
  created_at: string | null;
  created_by: string | null;
};

export type CobrancaOperacional = {
  id: number;
  pessoa_id: number | null;
  descricao: string | null;
  vencimento: string | null;
  valor_centavos: number;
  status: string | null;
  competencia_ano_mes: string | null;
  origem_tipo: string | null;
  origem_subtipo: string | null;
  origem_id: number | null;
  data_pagamento: string | null;
  neofin_charge_id: string | null;
  created_at: string | null;
  updated_at: string | null;
  vencimento_original: string | null;
  vencimento_ajustado_em: string | null;
  vencimento_ajustado_por: string | null;
  vencimento_ajuste_motivo: string | null;
  cancelada_em: string | null;
  cancelada_por: string | null;
  cancelada_por_user_id: string | null;
  cancelamento_motivo: string | null;
  cancelada_motivo: string | null;
  cancelamento_tipo: string | null;
  total_recebido_centavos: number;
  matricula_relacionada_id: number | null;
  matricula_status: string | null;
  matricula_cancelamento_tipo: string | null;
  esta_liquidada: boolean;
  esta_cancelada: boolean;
};

type CobrancaOperacionalRow = QueryResultRow & {
  id: number;
  pessoa_id: number | null;
  descricao: string | null;
  vencimento: string | Date | null;
  valor_centavos: number;
  status: string | null;
  competencia_ano_mes: string | null;
  origem_tipo: string | null;
  origem_subtipo: string | null;
  origem_id: number | null;
  data_pagamento: string | Date | null;
  neofin_charge_id: string | null;
  created_at: string | Date | null;
  updated_at: string | Date | null;
  vencimento_original: string | Date | null;
  vencimento_ajustado_em: string | Date | null;
  vencimento_ajustado_por: string | null;
  vencimento_ajuste_motivo: string | null;
  cancelada_em: string | Date | null;
  cancelada_por: string | null;
  cancelada_por_user_id: string | null;
  cancelamento_motivo: string | null;
  cancelada_motivo: string | null;
  cancelamento_tipo: string | null;
  total_recebido_centavos: number;
  matricula_relacionada_id: number | null;
  matricula_status: string | null;
  matricula_cancelamento_tipo: string | null;
};

type CobrancaHistoricoEventoRow = QueryResultRow & {
  id: number;
  cobranca_id: number;
  tipo_evento: string;
  payload_anterior: unknown;
  payload_novo: unknown;
  observacao: string | null;
  created_at: string | Date | null;
  created_by: string | null;
};

export class CobrancaOperacionalError extends Error {
  readonly status: number;
  readonly code: string;

  constructor(status: number, code: string, message: string) {
    super(message);
    this.status = status;
    this.code = code;
  }
}

function ensureDbUrl(): string {
  const connectionString = process.env.SUPABASE_DB_URL;
  if (!connectionString) {
    throw new CobrancaOperacionalError(500, "env_invalida", "SUPABASE_DB_URL nao configurada.");
  }
  return connectionString;
}

export function getCobrancasPgPool(): Pool {
  if (pool) return pool;

  const connectionString = ensureDbUrl();
  pool = new Pool({
    connectionString,
    ssl: connectionString.includes("sslmode=require") ? { rejectUnauthorized: false } : undefined,
  });
  return pool;
}

export function textOrNull(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed ? trimmed : null;
}

export function upper(value: unknown): string {
  return textOrNull(value)?.toUpperCase() ?? "";
}

export function normalizeDateOnly(value: unknown): string | null {
  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) ? null : value.toISOString().slice(0, 10);
  }
  if (typeof value === "string") {
    const trimmed = value.trim();
    if (!trimmed) return null;
    return trimmed.length >= 10 ? trimmed.slice(0, 10) : trimmed;
  }
  return null;
}

function normalizeDateTime(value: unknown): string | null {
  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) ? null : value.toISOString();
  }
  if (typeof value === "string") {
    const trimmed = value.trim();
    return trimmed || null;
  }
  return null;
}

function numberOrZero(value: unknown): number {
  return typeof value === "number" && Number.isFinite(value) ? value : 0;
}

function numberOrNull(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function resolveCanceladaPor(row: Pick<CobrancaOperacionalRow, "cancelada_por" | "cancelada_por_user_id">): string | null {
  return textOrNull(row.cancelada_por) ?? textOrNull(row.cancelada_por_user_id);
}

function resolveCancelamentoMotivo(
  row: Pick<CobrancaOperacionalRow, "cancelamento_motivo" | "cancelada_motivo">,
): string | null {
  return textOrNull(row.cancelamento_motivo) ?? textOrNull(row.cancelada_motivo);
}

export function isCobrancaCancelada(row: Pick<CobrancaOperacional, "status" | "cancelada_em">): boolean {
  return upper(row.status) === "CANCELADA" || Boolean(row.cancelada_em);
}

export function isCobrancaLiquidada(
  row: Pick<CobrancaOperacional, "status" | "data_pagamento" | "valor_centavos" | "total_recebido_centavos">,
): boolean {
  return (
    STATUSS_QUITADOS.has(upper(row.status)) ||
    Boolean(row.data_pagamento) ||
    (row.valor_centavos > 0 && row.total_recebido_centavos >= row.valor_centavos)
  );
}

export function isDateInput(value: string): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(value.trim());
}

function mapCobrancaOperacional(row: CobrancaOperacionalRow): CobrancaOperacional {
  const mapped: CobrancaOperacional = {
    id: row.id,
    pessoa_id: numberOrNull(row.pessoa_id),
    descricao: textOrNull(row.descricao),
    vencimento: normalizeDateOnly(row.vencimento),
    valor_centavos: numberOrZero(row.valor_centavos),
    status: textOrNull(row.status),
    competencia_ano_mes: textOrNull(row.competencia_ano_mes),
    origem_tipo: textOrNull(row.origem_tipo),
    origem_subtipo: textOrNull(row.origem_subtipo),
    origem_id: numberOrNull(row.origem_id),
    data_pagamento: normalizeDateTime(row.data_pagamento),
    neofin_charge_id: textOrNull(row.neofin_charge_id),
    created_at: normalizeDateTime(row.created_at),
    updated_at: normalizeDateTime(row.updated_at),
    vencimento_original: normalizeDateOnly(row.vencimento_original),
    vencimento_ajustado_em: normalizeDateTime(row.vencimento_ajustado_em),
    vencimento_ajustado_por: textOrNull(row.vencimento_ajustado_por),
    vencimento_ajuste_motivo: textOrNull(row.vencimento_ajuste_motivo),
    cancelada_em: normalizeDateTime(row.cancelada_em),
    cancelada_por: resolveCanceladaPor(row),
    cancelada_por_user_id: textOrNull(row.cancelada_por_user_id),
    cancelamento_motivo: resolveCancelamentoMotivo(row),
    cancelada_motivo: textOrNull(row.cancelada_motivo),
    cancelamento_tipo: textOrNull(row.cancelamento_tipo),
    total_recebido_centavos: numberOrZero(row.total_recebido_centavos),
    matricula_relacionada_id: numberOrNull(row.matricula_relacionada_id),
    matricula_status: textOrNull(row.matricula_status),
    matricula_cancelamento_tipo: textOrNull(row.matricula_cancelamento_tipo),
    esta_liquidada: false,
    esta_cancelada: false,
  };

  mapped.esta_liquidada = isCobrancaLiquidada(mapped);
  mapped.esta_cancelada = isCobrancaCancelada(mapped);
  return mapped;
}

function mapHistoricoRow(row: CobrancaHistoricoEventoRow): CobrancaHistoricoEvento {
  return {
    id: row.id,
    cobranca_id: row.cobranca_id,
    tipo_evento: row.tipo_evento,
    payload_anterior: row.payload_anterior,
    payload_novo: row.payload_novo,
    observacao: textOrNull(row.observacao),
    created_at: normalizeDateTime(row.created_at),
    created_by: textOrNull(row.created_by),
  };
}

const COBRANCA_OPERACIONAL_SELECT = `
  with recebimentos as (
    select cobranca_id, coalesce(sum(valor_centavos), 0)::int as total_recebido_centavos
    from public.recebimentos
    where cobranca_id = $1
    group by cobranca_id
  ),
  lancamento_principal as (
    select
      l.id,
      l.matricula_id,
      l.cobranca_id
    from public.credito_conexao_lancamentos l
    where l.cobranca_id = $1
    order by l.id
    limit 1
  )
  select
    c.id,
    c.pessoa_id,
    c.descricao,
    c.vencimento,
    c.valor_centavos,
    c.status,
    c.competencia_ano_mes,
    c.origem_tipo,
    c.origem_subtipo,
    c.origem_id,
    c.data_pagamento,
    c.neofin_charge_id,
    c.created_at,
    c.updated_at,
    c.vencimento_original,
    c.vencimento_ajustado_em,
    c.vencimento_ajustado_por,
    c.vencimento_ajuste_motivo,
    c.cancelada_em,
    c.cancelada_por,
    c.cancelada_por_user_id,
    c.cancelamento_motivo,
    c.cancelada_motivo,
    c.cancelamento_tipo,
    coalesce(r.total_recebido_centavos, 0)::int as total_recebido_centavos,
    coalesce(
      lp.matricula_id,
      case
        when upper(coalesce(c.origem_tipo, '')) like 'MATRICULA%' then c.origem_id
        else null
      end
    )::bigint as matricula_relacionada_id,
    m.status as matricula_status,
    m.cancelamento_tipo as matricula_cancelamento_tipo
  from public.cobrancas c
  left join recebimentos r on r.cobranca_id = c.id
  left join lancamento_principal lp on true
  left join public.matriculas m
    on m.id = coalesce(
      lp.matricula_id,
      case
        when upper(coalesce(c.origem_tipo, '')) like 'MATRICULA%' then c.origem_id
        else null
      end
    )
  where c.id = $1
`;

export async function loadCobrancaOperacional(
  client: PoolClient,
  cobrancaId: number,
): Promise<CobrancaOperacional | null> {
  const result = await client.query<CobrancaOperacionalRow>(COBRANCA_OPERACIONAL_SELECT, [cobrancaId]);
  if (result.rows.length === 0) return null;
  return mapCobrancaOperacional(result.rows[0]);
}

export async function loadCobrancaHistorico(
  client: PoolClient,
  cobrancaId: number,
): Promise<CobrancaHistoricoEvento[]> {
  try {
    const result = await client.query<CobrancaHistoricoEventoRow>(
      `
      select
        id,
        cobranca_id,
        tipo_evento,
        payload_anterior,
        payload_novo,
        observacao,
        created_at,
        created_by
      from public.cobrancas_historico_eventos
      where cobranca_id = $1
      order by created_at desc, id desc
      `,
      [cobrancaId],
    );
    return result.rows.map(mapHistoricoRow);
  } catch (error) {
    const code = typeof error === "object" && error && "code" in error ? String(error.code ?? "") : "";
    if (code === "42P01") {
      return [];
    }
    throw error;
  }
}

function buildHistorySnapshot(row: CobrancaOperacional) {
  return {
    id: row.id,
    status: row.status,
    vencimento: row.vencimento,
    vencimento_original: row.vencimento_original,
    vencimento_ajustado_em: row.vencimento_ajustado_em,
    vencimento_ajustado_por: row.vencimento_ajustado_por,
    vencimento_ajuste_motivo: row.vencimento_ajuste_motivo,
    cancelada_em: row.cancelada_em,
    cancelada_por: row.cancelada_por,
    cancelamento_motivo: row.cancelamento_motivo,
    cancelamento_tipo: row.cancelamento_tipo,
    total_recebido_centavos: row.total_recebido_centavos,
  };
}

export async function insertCobrancaHistoricoEvento(params: {
  client: PoolClient;
  cobrancaId: number;
  tipoEvento: string;
  payloadAnterior: unknown;
  payloadNovo: unknown;
  observacao: string | null;
  createdBy: string | null;
}) {
  const { client, cobrancaId, tipoEvento, payloadAnterior, payloadNovo, observacao, createdBy } = params;
  await client.query(
    `
    insert into public.cobrancas_historico_eventos (
      cobranca_id,
      tipo_evento,
      payload_anterior,
      payload_novo,
      observacao,
      created_by
    )
    values ($1, $2, $3::jsonb, $4::jsonb, $5, $6)
    `,
    [cobrancaId, tipoEvento, JSON.stringify(payloadAnterior), JSON.stringify(payloadNovo), observacao, createdBy],
  );
}

export async function alterarVencimentoCobranca(params: {
  client: PoolClient;
  cobrancaId: number;
  novoVencimento: string;
  motivo: string;
  userId: string;
}) {
  const { client, cobrancaId, novoVencimento, motivo, userId } = params;
  const anterior = await loadCobrancaOperacional(client, cobrancaId);

  if (!anterior) {
    throw new CobrancaOperacionalError(404, "cobranca_nao_encontrada", "Cobranca nao encontrada.");
  }
  if (anterior.esta_liquidada) {
    throw new CobrancaOperacionalError(409, "cobranca_liquidada", "Nao e possivel alterar o vencimento de uma cobranca liquidada.");
  }
  if (anterior.esta_cancelada) {
    throw new CobrancaOperacionalError(409, "cobranca_cancelada", "Nao e possivel alterar o vencimento de uma cobranca cancelada.");
  }
  if (anterior.vencimento === novoVencimento) {
    throw new CobrancaOperacionalError(409, "vencimento_inalterado", "O novo vencimento informado ja e o vencimento atual da cobranca.");
  }

  await client.query(
    `
    update public.cobrancas
    set
      vencimento_original = coalesce(vencimento_original, vencimento::date),
      vencimento = $2::date,
      vencimento_ajustado_em = now(),
      vencimento_ajustado_por = $3,
      vencimento_ajuste_motivo = $4,
      updated_at = now()
    where id = $1
    `,
    [cobrancaId, novoVencimento, userId, motivo],
  );

  const atual = await loadCobrancaOperacional(client, cobrancaId);
  if (!atual) {
    throw new CobrancaOperacionalError(500, "falha_recarregar_cobranca", "Falha ao recarregar a cobranca apos alterar o vencimento.");
  }

  await insertCobrancaHistoricoEvento({
    client,
    cobrancaId,
    tipoEvento: "ALTERACAO_VENCIMENTO",
    payloadAnterior: buildHistorySnapshot(anterior),
    payloadNovo: buildHistorySnapshot(atual),
    observacao: motivo,
    createdBy: userId,
  });

  const historico = await loadCobrancaHistorico(client, cobrancaId);
  return { cobranca: atual, historico };
}

export async function cancelarCobranca(params: {
  client: PoolClient;
  cobrancaId: number;
  motivo: string;
  tipoCancelamento: TipoCancelamentoCobranca;
  userId: string;
}) {
  const { client, cobrancaId, motivo, tipoCancelamento, userId } = params;
  const anterior = await loadCobrancaOperacional(client, cobrancaId);

  if (!anterior) {
    throw new CobrancaOperacionalError(404, "cobranca_nao_encontrada", "Cobranca nao encontrada.");
  }
  if (anterior.esta_liquidada) {
    throw new CobrancaOperacionalError(409, "cobranca_liquidada", "Nao e possivel cancelar uma cobranca liquidada.");
  }
  if (anterior.esta_cancelada) {
    throw new CobrancaOperacionalError(409, "cobranca_cancelada", "A cobranca ja esta cancelada.");
  }
  if (anterior.neofin_charge_id) {
    throw new CobrancaOperacionalError(
      409,
      "cancelamento_neofin_nao_suportado",
      "A cobranca possui charge NeoFin vinculada. Cancele no provedor antes do cancelamento local.",
    );
  }

  await client.query(
    `
    update public.cobrancas
    set
      status = 'CANCELADA',
      cancelada_em = now(),
      cancelada_por = $2,
      cancelada_por_user_id = $2,
      cancelamento_motivo = $3,
      cancelada_motivo = $3,
      cancelamento_tipo = $4,
      updated_at = now()
    where id = $1
    `,
    [cobrancaId, userId, motivo, tipoCancelamento],
  );

  const atual = await loadCobrancaOperacional(client, cobrancaId);
  if (!atual) {
    throw new CobrancaOperacionalError(500, "falha_recarregar_cobranca", "Falha ao recarregar a cobranca apos o cancelamento.");
  }

  await insertCobrancaHistoricoEvento({
    client,
    cobrancaId,
    tipoEvento: "CANCELAMENTO_COBRANCA",
    payloadAnterior: buildHistorySnapshot(anterior),
    payloadNovo: buildHistorySnapshot(atual),
    observacao: motivo,
    createdBy: userId,
  });

  const historico = await loadCobrancaHistorico(client, cobrancaId);
  return { cobranca: atual, historico };
}
