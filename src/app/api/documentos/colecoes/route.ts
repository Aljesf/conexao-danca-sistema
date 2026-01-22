import { NextResponse, type NextRequest } from "next/server";
import { requireUser } from "@/lib/supabase/api-auth";
import { listarColecoes } from "@/lib/documentos/documentos-variaveis";

type ColecaoColunaPayload = {
  codigo?: string;
  label?: string;
  tipo?: string;
  formato?: string | null;
  ordem?: number;
  ativo?: boolean;
};

type ColecaoPayload = {
  codigo?: string;
  nome?: string;
  descricao?: string | null;
  root_tipo?: string;
  ordem?: number;
  ativo?: boolean;
  colunas?: ColecaoColunaPayload[];
};

type ApiResp<T> = { data?: T; error?: string };

function normalizeCodigo(raw: string): string {
  return raw.trim().toUpperCase().replace(/\s+/g, "_");
}

function parseColunas(raw: unknown): { value: ColecaoColunaPayload[] } {
  if (!Array.isArray(raw)) return { value: [] };
  const output: ColecaoColunaPayload[] = [];
  for (const item of raw) {
    if (!item || typeof item !== "object") continue;
    const rec = item as Record<string, unknown>;
    const codigo = typeof rec.codigo === "string" ? rec.codigo.trim() : "";
    const label = typeof rec.label === "string" ? rec.label.trim() : "";
    const tipo = typeof rec.tipo === "string" ? rec.tipo.trim() : "";
    if (!codigo || !label || !tipo) continue;
    output.push({
      codigo,
      label,
      tipo,
      formato: typeof rec.formato === "string" ? rec.formato.trim() || null : null,
      ordem: Number(rec.ordem ?? 0),
      ativo: typeof rec.ativo === "boolean" ? rec.ativo : true,
    });
  }
  return { value: output };
}

export async function GET(req: NextRequest) {
  try {
    const url = new URL(req.url);
    const ativoParam = url.searchParams.get("ativo");
    const somenteAtivas =
      ativoParam === null ? undefined : ativoParam !== "0" && ativoParam.toLowerCase() !== "false";

    const colecoes = await listarColecoes({
      somenteAtivas,
      somenteColunasAtivas: false,
    });

    return NextResponse.json({ data: colecoes } satisfies ApiResp<unknown>, { status: 200 });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Erro ao carregar colecoes.";
    return NextResponse.json({ error: message } satisfies ApiResp<never>, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const auth = await requireUser(req);
  if (auth instanceof NextResponse) return auth;

  const { supabase } = auth;
  const body = (await req.json()) as ColecaoPayload;

  const codigoRaw = typeof body.codigo === "string" ? body.codigo.trim() : "";
  const nome = typeof body.nome === "string" ? body.nome.trim() : "";
  const rootTipo = typeof body.root_tipo === "string" ? body.root_tipo.trim() : "";

  if (!codigoRaw || !nome || !rootTipo) {
    return NextResponse.json(
      { error: "Campos obrigatorios: codigo, nome, root_tipo." } satisfies ApiResp<never>,
      { status: 400 },
    );
  }

  const codigo = normalizeCodigo(codigoRaw);
  if (!/^[A-Z0-9_]+$/.test(codigo)) {
    return NextResponse.json(
      { error: "Codigo invalido. Use A-Z, 0-9 e _." } satisfies ApiResp<never>,
      { status: 400 },
    );
  }

  const ordem = Number(body.ordem ?? 0);
  const ativo = typeof body.ativo === "boolean" ? body.ativo : true;
  const descricao = typeof body.descricao === "string" ? body.descricao.trim() || null : null;

  const { data: created, error } = await supabase
    .from("documentos_colecoes")
    .insert({
      codigo,
      nome,
      descricao,
      root_tipo: rootTipo.toUpperCase(),
      ordem: Number.isFinite(ordem) ? ordem : 0,
      ativo,
    })
    .select("id")
    .single();

  if (error) {
    return NextResponse.json({ error: error.message } satisfies ApiResp<never>, { status: 500 });
  }

  const colunasParsed = parseColunas(body.colunas).value;
  if (colunasParsed.length > 0) {
    const payloadColunas = colunasParsed.map((col) => ({
      colecao_id: created.id,
      codigo: normalizeCodigo(col.codigo ?? ""),
      label: col.label ?? "",
      tipo: col.tipo ?? "",
      formato: col.formato ?? null,
      ordem: Number.isFinite(Number(col.ordem)) ? Number(col.ordem) : 0,
      ativo: typeof col.ativo === "boolean" ? col.ativo : true,
    }));

    const { error: colErr } = await supabase
      .from("documentos_colecoes_colunas")
      .insert(payloadColunas);

    if (colErr) {
      return NextResponse.json({ error: colErr.message } satisfies ApiResp<never>, { status: 500 });
    }
  }

  return NextResponse.json({ data: { id: created.id } } satisfies ApiResp<unknown>, { status: 201 });
}

