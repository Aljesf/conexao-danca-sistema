import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/supabase.generated";
import { type ExpurgoTipo, formatExpurgoMotivo } from "@/lib/financeiro/expurgo-types";

type CobrancaExpurgoRow = {
  id: number | null;
  status: string | null;
  expurgada: boolean | null;
};

type ExpurgarCobrancasInput = {
  supabase: SupabaseClient<Database>;
  cobrancaIds: number[];
  motivo: string;
  tipo: ExpurgoTipo;
  userId: string;
};

type ExpurgarCobrancasResult = {
  cobrancaIds: number[];
  expurgadaEm: string;
  expurgoMotivo: string;
};

export class ExpurgoCobrancasError extends Error {
  status: number;
  code: string;
  details?: Record<string, unknown>;

  constructor(code: string, status: number, message: string, details?: Record<string, unknown>) {
    super(message);
    this.name = "ExpurgoCobrancasError";
    this.code = code;
    this.status = status;
    this.details = details;
  }
}

function normalizeCobrancaIds(ids: number[]): number[] {
  return Array.from(
    new Set(
      ids
        .filter((id) => Number.isFinite(id))
        .map((id) => Math.trunc(id))
        .filter((id) => id > 0),
    ),
  );
}

async function invalidarSnapshotsFinanceiros(supabase: SupabaseClient<Database>): Promise<void> {
  const hoje = new Date().toISOString().slice(0, 10);
  const { data: snapshotsHoje, error: snapshotError } = await supabase
    .from("financeiro_snapshots")
    .select("id")
    .eq("data_base", hoje)
    .is("centro_custo_id", null);

  if (snapshotError) {
    console.error("[expurgo-cobrancas] falha ao localizar snapshots do dia para invalidacao:", snapshotError);
    return;
  }

  const snapshotIds = (snapshotsHoje ?? [])
    .map((row) => (typeof row.id === "number" && row.id > 0 ? row.id : null))
    .filter((id): id is number => typeof id === "number");

  if (snapshotIds.length === 0) {
    return;
  }

  await supabase.from("financeiro_analises_gpt").delete().in("snapshot_id", snapshotIds);
  await supabase.from("financeiro_snapshots").delete().in("id", snapshotIds);
}

export async function expurgarCobrancas({
  supabase,
  cobrancaIds,
  motivo,
  tipo,
  userId,
}: ExpurgarCobrancasInput): Promise<ExpurgarCobrancasResult> {
  const ids = normalizeCobrancaIds(cobrancaIds);
  const motivoLimpo = motivo.trim();

  if (ids.length === 0) {
    throw new ExpurgoCobrancasError("cobranca_ids_invalidos", 400, "Nenhuma cobranca valida foi informada.");
  }

  if (!motivoLimpo) {
    throw new ExpurgoCobrancasError("motivo_obrigatorio", 400, "Motivo do expurgo obrigatorio.");
  }

  const { data, error } = await supabase.from("cobrancas").select("id,status,expurgada").in("id", ids);
  if (error) {
    throw new ExpurgoCobrancasError("erro_buscar_cobrancas", 500, error.message);
  }

  const cobrancas = (data ?? []) as CobrancaExpurgoRow[];
  const encontradas = new Set(
    cobrancas
      .map((row) => (typeof row.id === "number" && row.id > 0 ? row.id : null))
      .filter((id): id is number => typeof id === "number"),
  );

  const inexistentes = ids.filter((id) => !encontradas.has(id));
  if (inexistentes.length > 0) {
    throw new ExpurgoCobrancasError("cobrancas_nao_encontradas", 404, "Ha cobrancas inexistentes no lote.", {
      cobranca_ids: inexistentes,
    });
  }

  const naoCanceladas = cobrancas
    .filter((row) => (row.status ?? "").toUpperCase() !== "CANCELADA")
    .map((row) => row.id)
    .filter((id): id is number => typeof id === "number");

  if (naoCanceladas.length > 0) {
    throw new ExpurgoCobrancasError(
      "cobrancas_nao_canceladas",
      400,
      "O lote contem cobrancas que ainda nao estao CANCELADA.",
      { cobranca_ids: naoCanceladas },
    );
  }

  const jaExpurgadas = cobrancas
    .filter((row) => row.expurgada === true)
    .map((row) => row.id)
    .filter((id): id is number => typeof id === "number");

  if (jaExpurgadas.length > 0) {
    throw new ExpurgoCobrancasError("cobrancas_ja_expurgadas", 409, "O lote contem cobrancas ja expurgadas.", {
      cobranca_ids: jaExpurgadas,
    });
  }

  const expurgadaEm = new Date().toISOString();
  const expurgoMotivo = formatExpurgoMotivo(tipo, motivoLimpo);

  const { error: updateError } = await supabase
    .from("cobrancas")
    .update({
      expurgada: true,
      expurgada_em: expurgadaEm,
      expurgada_por: userId,
      expurgo_motivo: expurgoMotivo,
    } as never)
    .in("id", ids);

  if (updateError) {
    throw new ExpurgoCobrancasError("erro_expurgar_cobrancas", 500, updateError.message);
  }

  await invalidarSnapshotsFinanceiros(supabase);

  return {
    cobrancaIds: ids,
    expurgadaEm,
    expurgoMotivo,
  };
}

