import { getSupabaseServerSSR } from "@/lib/supabaseServerSSR";

export type ResolveCollectionsInput = {
  operacaoTipo: string;
  operacaoId: number;
  colecoes: string[];
};

export type CollectionRow = Record<string, string>;
export type CollectionsResolved = Record<string, CollectionRow[]>;

function formatBRLFromCentavos(centavos: number): string {
  const valor = centavos / 100;
  return valor.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function formatDateBR(dateISO: string | null): string {
  if (!dateISO) return "";
  const parts = dateISO.split("-");
  if (parts.length !== 3) return dateISO;
  const [y, m, d] = parts;
  return `${d}/${m}/${y}`;
}

function getString(row: Record<string, unknown>, key: string): string | null {
  const value = row[key];
  if (typeof value === "string") return value;
  if (typeof value === "number") return String(value);
  return null;
}

function getNumber(row: Record<string, unknown>, key: string): number | null {
  const value = row[key];
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim()) {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) return parsed;
  }
  return null;
}

function mapLancamentos(rows: Array<Record<string, unknown>>): CollectionRow[] {
  return rows.map((row) => {
    const data = getString(row, "data_lancamento");
    const descricao = getString(row, "descricao") ?? "";
    const status = getString(row, "status") ?? "";
    const valorCentavos = getNumber(row, "valor_centavos") ?? 0;
    return {
      DATA: formatDateBR(data),
      DESCRICAO: descricao,
      VALOR: formatBRLFromCentavos(valorCentavos),
      STATUS: status,
    };
  });
}

function mapLedgerRows(rows: Array<Record<string, unknown>>, opts: { dateKey: string }): CollectionRow[] {
  return rows.map((row) => {
    const data = getString(row, opts.dateKey);
    const descricao = getString(row, "descricao") ?? "";
    const status = getString(row, "status") ?? "";
    const valorCentavos = getNumber(row, "valor_centavos") ?? 0;
    return {
      DATA: formatDateBR(data),
      DESCRICAO: descricao,
      VALOR: formatBRLFromCentavos(valorCentavos),
      STATUS: status,
    };
  });
}

function mapLedgerParcelas(rows: Array<Record<string, unknown>>): CollectionRow[] {
  return rows.map((row) => {
    const vencimento = getString(row, "vencimento");
    const descricao = getString(row, "descricao") ?? "";
    const status = getString(row, "status") ?? "";
    const valorCentavos = getNumber(row, "valor_centavos") ?? 0;
    return {
      VENCIMENTO: formatDateBR(vencimento),
      DESCRICAO: descricao,
      VALOR: formatBRLFromCentavos(valorCentavos),
      STATUS: status,
    };
  });
}

export async function resolveCollections(input: ResolveCollectionsInput): Promise<CollectionsResolved> {
  const supabase = await getSupabaseServerSSR();
  const operacaoTipo = input.operacaoTipo.trim().toUpperCase();
  const colecoes = Array.from(new Set(input.colecoes.map((c) => c.trim().toUpperCase()).filter(Boolean)));

  const resp: CollectionsResolved = {};

  if (!colecoes.length) return resp;

  const { data: cat, error: catError } = await supabase
    .from("documentos_colecoes")
    .select("codigo,root_tipo")
    .in("codigo", colecoes)
    .eq("ativo", true);

  if (catError) throw new Error(catError.message);

  const catalogo = (cat ?? []) as Array<{ codigo?: string | null; root_tipo?: string | null }>;

  for (const c of catalogo) {
    const codigo = String(c.codigo ?? "").trim().toUpperCase();
    if (!codigo) continue;
    resp[codigo] = [];

    const rootTipo = String(c.root_tipo ?? "").trim().toUpperCase();
    if (rootTipo !== operacaoTipo) {
      continue;
    }

    if (codigo === "MATRICULA_ENTRADAS" || codigo === "MATRICULA_ENTRADA") {
      const { data, error } = await supabase
        .from("matriculas_financeiro_linhas")
        .select("data_evento,descricao,valor_centavos,status")
        .eq("matricula_id", input.operacaoId)
        .eq("tipo", "ENTRADA")
        .order("data_evento", { ascending: true })
        .limit(500);

      if (error) throw new Error(error.message);
      resp[codigo] = mapLedgerRows((data ?? []) as Array<Record<string, unknown>>, { dateKey: "data_evento" });
      continue;
    }

    if (codigo === "MATRICULA_PARCELAS") {
      const { data, error } = await supabase
        .from("matriculas_financeiro_linhas")
        .select("vencimento,descricao,valor_centavos,status")
        .eq("matricula_id", input.operacaoId)
        .eq("tipo", "PARCELA")
        .order("vencimento", { ascending: true })
        .limit(500);

      if (error) throw new Error(error.message);
      resp[codigo] = mapLedgerParcelas((data ?? []) as Array<Record<string, unknown>>);
      continue;
    }

    if (codigo === "MATRICULA_LANCAMENTOS_CREDITO") {
      const { data: ledgerRows, error: ledgerError } = await supabase
        .from("matriculas_financeiro_linhas")
        .select("data_evento,descricao,valor_centavos,status")
        .eq("matricula_id", input.operacaoId)
        .eq("tipo", "LANCAMENTO_CREDITO")
        .order("data_evento", { ascending: true })
        .limit(500);

      if (ledgerError) throw new Error(ledgerError.message);
      if (ledgerRows && ledgerRows.length > 0) {
        resp[codigo] = mapLedgerRows(ledgerRows as Array<Record<string, unknown>>, { dateKey: "data_evento" });
        continue;
      }

      const { data, error } = await supabase
        .from("credito_conexao_lancamentos")
        .select("data_lancamento,descricao,valor_centavos,status,origem_sistema,origem_id")
        .eq("origem_sistema", "MATRICULA")
        .eq("origem_id", input.operacaoId)
        .order("data_lancamento", { ascending: true })
        .limit(500);

      if (error) throw new Error(error.message);
      let rows = mapLancamentos((data ?? []) as Array<Record<string, unknown>>);

      if (rows.length === 0) {
        const { data: fallback, error: fallbackError } = await supabase
          .from("credito_conexao_lancamentos")
          .select("data_lancamento,descricao,valor_centavos,status,matricula_id")
          .eq("matricula_id", input.operacaoId)
          .order("data_lancamento", { ascending: true })
          .limit(500);

        if (!fallbackError) {
          rows = mapLancamentos((fallback ?? []) as Array<Record<string, unknown>>);
        }
      }

      resp[codigo] = rows;
      continue;
    }

    if (codigo === "FATURA_LANCAMENTOS_CREDITO") {
      const { data: links, error: linksError } = await supabase
        .from("credito_conexao_fatura_lancamentos")
        .select("lancamento_id")
        .eq("fatura_id", input.operacaoId);

      if (linksError) throw new Error(linksError.message);

      const lancamentoIds = (links ?? [])
        .map((row) => {
          const rec = row as Record<string, unknown>;
          return getNumber(rec, "lancamento_id");
        })
        .filter((id): id is number => Number.isFinite(id));

      const { data, error } = await supabase
        .from("credito_conexao_lancamentos")
        .select("data_lancamento,descricao,valor_centavos,status")
        .in("id", lancamentoIds.length ? lancamentoIds : [-1])
        .order("data_lancamento", { ascending: true })
        .limit(500);

      if (error) throw new Error(error.message);
      resp[codigo] = mapLancamentos((data ?? []) as Array<Record<string, unknown>>);
      continue;
    }
  }

  for (const code of colecoes) {
    if (!resp[code]) resp[code] = [];
  }

  return resp;
}
