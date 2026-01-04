import { NextResponse } from "next/server";
import { getSupabaseServerSSR } from "@/lib/supabaseServerSSR";

type ResolveRequestBody = {
  operacaoTipo: string;
  operacaoId: number;
  colecoes: string[];
};

function formatBRLFromCentavos(centavos: number): string {
  const valor = centavos / 100;
  return valor.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function formatDateBR(dateISO: string | null): string {
  if (!dateISO) return "";
  const base = dateISO.split("T")[0];
  const [y, m, d] = base.split("-");
  if (!y || !m || !d) return dateISO;
  return `${d}/${m}/${y}`;
}

export async function POST(req: Request) {
  const supabase = await getSupabaseServerSSR();

  let body: ResolveRequestBody;
  try {
    body = (await req.json()) as ResolveRequestBody;
  } catch {
    return NextResponse.json({ error: "JSON invalido" }, { status: 400 });
  }

  const operacaoTipo = String(body.operacaoTipo || "").trim().toUpperCase();
  const operacaoId = Number(body.operacaoId);
  const colecaoCodigos = Array.isArray(body.colecoes)
    ? body.colecoes
        .map((c) => String(c || "").trim().toUpperCase())
        .filter((c) => c.length > 0)
    : [];

  if (!operacaoTipo || !Number.isFinite(operacaoId) || colecaoCodigos.length === 0) {
    return NextResponse.json({ error: "Parametros obrigatorios ausentes" }, { status: 400 });
  }

  const resp: Record<string, { rows: Array<Record<string, string>> }> = {};
  for (const codigo of colecaoCodigos) {
    resp[codigo] = { rows: [] };
  }

  const { data: cat, error: catError } = await supabase
    .from("documentos_colecoes")
    .select("id,codigo,root_tipo")
    .in("codigo", colecaoCodigos)
    .eq("ativo", true);

  if (catError) {
    return NextResponse.json({ error: catError.message }, { status: 500 });
  }

  const catalogo = cat ?? [];

  for (const c of catalogo) {
    const codigo = String(c.codigo || "").trim().toUpperCase();
    if (!codigo) continue;

    if (String(c.root_tipo || "").trim().toUpperCase() !== operacaoTipo) {
      resp[codigo] = { rows: [] };
      continue;
    }

    if (codigo === "MATRICULA_LANCAMENTOS_CREDITO") {
      const { data, error } = await supabase
        .from("credito_conexao_lancamentos")
        .select("data_lancamento,descricao,valor_centavos,status,origem_sistema,origem_id")
        .eq("origem_sistema", "MATRICULA")
        .eq("origem_id", operacaoId)
        .order("data_lancamento", { ascending: true })
        .limit(500);

      if (error) return NextResponse.json({ error: error.message }, { status: 500 });

      resp[codigo] = {
        rows: (data ?? []).map((r) => ({
          DATA: formatDateBR(r.data_lancamento ?? null),
          DESCRICAO: r.descricao ?? "",
          VALOR: formatBRLFromCentavos(Number(r.valor_centavos) || 0),
          STATUS: r.status ?? "",
        })),
      };
      continue;
    }

    if (codigo === "FATURA_LANCAMENTOS_CREDITO") {
      const { data: links, error: linksError } = await supabase
        .from("credito_conexao_fatura_lancamentos")
        .select("lancamento_id")
        .eq("fatura_id", operacaoId);

      if (linksError) return NextResponse.json({ error: linksError.message }, { status: 500 });

      const lancamentoIds = (links ?? [])
        .map((l) => Number(l.lancamento_id))
        .filter((id) => Number.isFinite(id));

      if (lancamentoIds.length === 0) {
        resp[codigo] = { rows: [] };
        continue;
      }

      const { data, error } = await supabase
        .from("credito_conexao_lancamentos")
        .select("data_lancamento,descricao,valor_centavos,status")
        .in("id", lancamentoIds)
        .order("data_lancamento", { ascending: true })
        .limit(500);

      if (error) return NextResponse.json({ error: error.message }, { status: 500 });

      resp[codigo] = {
        rows: (data ?? []).map((r) => ({
          DATA: formatDateBR(r.data_lancamento ?? null),
          DESCRICAO: r.descricao ?? "",
          VALOR: formatBRLFromCentavos(Number(r.valor_centavos) || 0),
          STATUS: r.status ?? "",
        })),
      };
      continue;
    }

    resp[codigo] = { rows: [] };
  }

  return NextResponse.json({ data: resp }, { status: 200 });
}
