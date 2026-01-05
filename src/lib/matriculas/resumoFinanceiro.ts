import { getSupabaseAdmin } from "@/lib/supabase/server-admin";

export type ParcelaResumo = {
  vencimento: string | null;
  valorCentavos: number;
  status: string;
  descricao: string | null;
};

type MatriculaRow = {
  responsavel_financeiro_id?: number | null;
};

type ContaRow = {
  id: number;
};

type LancamentoRow = {
  id: number;
  data_lancamento: string | null;
  descricao: string | null;
  valor_centavos: number | null;
  status: string | null;
  origem_sistema?: string | null;
  origem_id?: number | null;
};

const STATUS_PENDENTES = ["PENDENTE_FATURA", "FATURADO"];

export async function listarParcelasResumoPorMatriculaId(
  matriculaId: number,
): Promise<ParcelaResumo[]> {
  const admin = getSupabaseAdmin();

  const { data: matricula, error: matErr } = await admin
    .from("matriculas")
    .select("responsavel_financeiro_id")
    .eq("id", matriculaId)
    .maybeSingle();

  if (matErr || !matricula) return [];

  const respId = (matricula as MatriculaRow).responsavel_financeiro_id ?? null;
  if (!respId) return [];

  const { data: contas, error: contaErr } = await admin
    .from("credito_conexao_contas")
    .select("id")
    .eq("pessoa_titular_id", respId)
    .eq("ativo", true)
    .order("id", { ascending: false })
    .limit(1);

  if (contaErr || !contas || contas.length === 0) return [];

  const contaId = Number((contas[0] as ContaRow).id);
  if (!Number.isFinite(contaId) || contaId <= 0) return [];

  let rows: LancamentoRow[] = [];
  const { data: lancamentos, error: lancErr } = await admin
    .from("credito_conexao_lancamentos")
    .select("id,data_lancamento,descricao,valor_centavos,status,origem_sistema,origem_id")
    .eq("origem_id", matriculaId)
    .in("origem_sistema", ["MATRICULA", "MATRICULAS"])
    .in("status", STATUS_PENDENTES)
    .order("data_lancamento", { ascending: true })
    .limit(500);

  if (!lancErr && lancamentos) {
    rows = lancamentos as LancamentoRow[];
  }

  if (rows.length === 0) {
    const { data: fallback, error: fallbackErr } = await admin
      .from("credito_conexao_lancamentos")
      .select("id,data_lancamento,descricao,valor_centavos,status")
      .eq("conta_conexao_id", contaId)
      .in("status", STATUS_PENDENTES)
      .order("data_lancamento", { ascending: true })
      .limit(500);

    if (!fallbackErr && fallback) {
      rows = fallback as LancamentoRow[];
    }
  }

  const lancamentoIds = rows
    .map((row) => Number(row.id))
    .filter((id) => Number.isFinite(id) && id > 0);

  const faturaIdByLancamentoId = new Map<number, number>();
  const vencimentoByFaturaId = new Map<number, string | null>();

  if (lancamentoIds.length > 0) {
    const { data: links, error: linksErr } = await admin
      .from("credito_conexao_fatura_lancamentos")
      .select("lancamento_id,fatura_id")
      .in("lancamento_id", lancamentoIds);

    if (!linksErr && links) {
      const faturaIds = new Set<number>();
      for (const link of links as Array<Record<string, unknown>>) {
        const lancamentoId = Number(link.lancamento_id);
        const faturaId = Number(link.fatura_id);
        if (Number.isFinite(lancamentoId) && Number.isFinite(faturaId)) {
          faturaIdByLancamentoId.set(lancamentoId, faturaId);
          faturaIds.add(faturaId);
        }
      }

      if (faturaIds.size > 0) {
        const { data: faturas, error: faturasErr } = await admin
          .from("credito_conexao_faturas")
          .select("id,data_vencimento")
          .in("id", Array.from(faturaIds));

        if (!faturasErr && faturas) {
          for (const fatura of faturas as Array<Record<string, unknown>>) {
            const faturaId = Number(fatura.id);
            const vencimento =
              typeof fatura.data_vencimento === "string" ? fatura.data_vencimento : null;
            if (Number.isFinite(faturaId)) {
              vencimentoByFaturaId.set(faturaId, vencimento);
            }
          }
        }
      }
    }
  }

  return rows.map((row) => {
    const rowId = Number(row.id);
    const faturaId = Number.isFinite(rowId) ? faturaIdByLancamentoId.get(rowId) ?? null : null;
    const vencimento = faturaId ? vencimentoByFaturaId.get(faturaId) ?? null : null;

    return {
      vencimento: vencimento ?? row.data_lancamento ?? null,
      valorCentavos: Number(row.valor_centavos ?? 0),
      status: String(row.status ?? ""),
      descricao: row.descricao ?? null,
    };
  });
}
