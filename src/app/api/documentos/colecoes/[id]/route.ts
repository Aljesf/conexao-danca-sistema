import { NextResponse } from "next/server";
import { getSupabaseServerSSR } from "@/lib/supabaseServerSSR";

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

export async function GET(_req: Request, ctx: { params: { id: string } }) {
  const supabase = await getSupabaseServerSSR();
  const id = Number(ctx.params.id);

  if (!Number.isFinite(id) || id <= 0) {
    return NextResponse.json({ error: "ID invalido." } satisfies ApiResp<never>, { status: 400 });
  }

  const { data: colecao, error } = await supabase
    .from("documentos_colecoes")
    .select("id,codigo,nome,descricao,root_tipo,ordem,ativo")
    .eq("id", id)
    .single();

  if (error) {
    return NextResponse.json({ error: error.message } satisfies ApiResp<never>, { status: 500 });
  }

  const { data: colunas, error: colErr } = await supabase
    .from("documentos_colecoes_colunas")
    .select("id,colecao_id,codigo,label,tipo,formato,ordem,ativo")
    .eq("colecao_id", id)
    .order("ordem", { ascending: true })
    .order("codigo", { ascending: true });

  if (colErr) {
    return NextResponse.json({ error: colErr.message } satisfies ApiResp<never>, { status: 500 });
  }

  return NextResponse.json(
    {
      data: {
        ...colecao,
        colunas: (colunas ?? []).map((col) => ({
          id: Number(col.id),
          colecao_id: Number(col.colecao_id),
          codigo: String(col.codigo ?? ""),
          label: String(col.label ?? ""),
          tipo: String(col.tipo ?? ""),
          formato: col.formato ? String(col.formato) : null,
          ordem: Number(col.ordem ?? 0),
          ativo: Boolean(col.ativo),
        })),
      },
    } satisfies ApiResp<unknown>,
    { status: 200 },
  );
}

export async function PUT(req: Request, ctx: { params: { id: string } }) {
  const supabase = await getSupabaseServerSSR();
  const id = Number(ctx.params.id);

  if (!Number.isFinite(id) || id <= 0) {
    return NextResponse.json({ error: "ID invalido." } satisfies ApiResp<never>, { status: 400 });
  }

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

  const { error } = await supabase
    .from("documentos_colecoes")
    .update({
      codigo,
      nome,
      descricao,
      root_tipo: rootTipo.toUpperCase(),
      ordem: Number.isFinite(ordem) ? ordem : 0,
      ativo,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id);

  if (error) {
    return NextResponse.json({ error: error.message } satisfies ApiResp<never>, { status: 500 });
  }

  const colunasParsed = parseColunas(body.colunas).value;
  if (colunasParsed.length > 0) {
    const payloadColunas = colunasParsed.map((col) => ({
      colecao_id: id,
      codigo: normalizeCodigo(col.codigo ?? ""),
      label: col.label ?? "",
      tipo: col.tipo ?? "",
      formato: col.formato ?? null,
      ordem: Number.isFinite(Number(col.ordem)) ? Number(col.ordem) : 0,
      ativo: typeof col.ativo === "boolean" ? col.ativo : true,
      updated_at: new Date().toISOString(),
    }));

    const { error: colErr } = await supabase
      .from("documentos_colecoes_colunas")
      .upsert(payloadColunas, { onConflict: "colecao_id,codigo" });

    if (colErr) {
      return NextResponse.json({ error: colErr.message } satisfies ApiResp<never>, { status: 500 });
    }
  }

  return NextResponse.json({ data: { id } } satisfies ApiResp<unknown>, { status: 200 });
}
