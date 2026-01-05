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
    .select("data_lancamento,descricao,valor_centavos,status,origem_sistema,origem_id")
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
      .select("data_lancamento,descricao,valor_centavos,status")
      .eq("conta_conexao_id", contaId)
      .in("status", STATUS_PENDENTES)
      .order("data_lancamento", { ascending: true })
      .limit(500);

    if (!fallbackErr && fallback) {
      rows = fallback as LancamentoRow[];
    }
  }

  return rows.map((row) => ({
    vencimento: row.data_lancamento ?? null,
    valorCentavos: Number(row.valor_centavos ?? 0),
    status: String(row.status ?? ""),
    descricao: row.descricao ?? null,
  }));
}
