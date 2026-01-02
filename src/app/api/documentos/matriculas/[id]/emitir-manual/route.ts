import { NextResponse } from "next/server";
import crypto from "crypto";
import { getSupabaseServerSSR } from "@/lib/supabaseServerSSR";

type Item = { grupo_id: number; documento_modelo_id: number; incluir: boolean };
type Body = {
  documento_conjunto_id: number;
  itens: Item[];
  variaveis_manuais?: Record<string, unknown>;
  snapshot_financeiro?: Record<string, unknown>;
};

const PAPEIS_VALIDOS = ["PRINCIPAL", "OBRIGATORIO", "OPCIONAL", "ADICIONAL"] as const;
type Papel = (typeof PAPEIS_VALIDOS)[number];

function normalizePapel(value: unknown): Papel | null {
  if (typeof value !== "string") return null;
  const upper = value.trim().toUpperCase();
  return PAPEIS_VALIDOS.includes(upper as Papel) ? (upper as Papel) : null;
}

function renderTemplate(template: string, vars: Record<string, unknown>): string {
  return template.replace(/\{\{([A-Z0-9_]+)\}\}/g, (_match, key: string) => {
    const k = String(key).trim().toUpperCase();
    const v = vars[k];
    if (v === null || typeof v === "undefined") return "";
    if (typeof v === "string") return v;
    if (typeof v === "number" || typeof v === "boolean") return String(v);
    return JSON.stringify(v);
  });
}

export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const matriculaId = Number(id);
  if (!Number.isFinite(matriculaId)) {
    return NextResponse.json({ ok: false, message: "ID invalido." }, { status: 400 });
  }

  const body = (await req.json()) as Body;
  const conjuntoId = Number(body?.documento_conjunto_id);
  const itens = Array.isArray(body?.itens) ? body.itens : [];

  if (!Number.isFinite(conjuntoId) || conjuntoId <= 0) {
    return NextResponse.json({ ok: false, message: "documento_conjunto_id invalido." }, { status: 400 });
  }

  const supabase = await getSupabaseServerSSR();

  const { data: mat, error: matErr } = await supabase
    .from("matriculas")
    .select("id, documento_conjunto_id, pessoa_id, responsavel_financeiro_id")
    .eq("id", matriculaId)
    .single();

  if (matErr || !mat) {
    return NextResponse.json({ ok: false, message: "Matricula nao encontrada." }, { status: 404 });
  }

  const { data: conjunto, error: conjErr } = await supabase
    .from("documentos_conjuntos")
    .select("id")
    .eq("id", conjuntoId)
    .single();

  if (conjErr || !conjunto) {
    return NextResponse.json({ ok: false, message: "Conjunto nao encontrado." }, { status: 404 });
  }

  const { data: grupos, error: gruposErr } = await supabase
    .from("documentos_grupos")
    .select("id, obrigatorio, papel")
    .eq("conjunto_id", conjuntoId);

  if (gruposErr) {
    return NextResponse.json({ ok: false, message: gruposErr.message }, { status: 500 });
  }

  const grupoSet = new Map<number, { obrigatorio: boolean; papel: Papel | null }>();
  for (const g of (grupos ?? []) as unknown as Array<Record<string, unknown>>) {
    const gid = Number(g.id);
    const papel = normalizePapel(g.papel);
    grupoSet.set(gid, { obrigatorio: Boolean(g.obrigatorio), papel });
  }

  const selecionados = itens
    .filter((i) => i && typeof i === "object")
    .map((i) => ({
      grupo_id: Number(i.grupo_id),
      documento_modelo_id: Number(i.documento_modelo_id),
      incluir: Boolean(i.incluir),
    }))
    .filter((i) => Number.isFinite(i.grupo_id) && Number.isFinite(i.documento_modelo_id));

  const obrigatorios = Array.from(grupoSet.entries())
    .filter(([, v]) => v.papel === "OBRIGATORIO" || v.obrigatorio)
    .map(([k]) => k);
  const incluidosSet = new Set<number>(selecionados.filter((s) => s.incluir).map((s) => s.grupo_id));
  const faltandoObrig = obrigatorios.filter((gid) => !incluidosSet.has(gid));

  if (faltandoObrig.length > 0) {
    return NextResponse.json(
      { ok: false, message: `Grupos obrigatorios nao selecionados: ${faltandoObrig.join(", ")}` },
      { status: 400 }
    );
  }

  const principaisIncluidos = Array.from(grupoSet.entries())
    .filter(([gid, v]) => v.papel === "PRINCIPAL" && incluidosSet.has(gid))
    .map(([gid]) => gid);

  if (principaisIncluidos.length === 0) {
    return NextResponse.json({ ok: false, message: "Selecione 1 grupo PRINCIPAL." }, { status: 400 });
  }

  if (principaisIncluidos.length > 1) {
    return NextResponse.json({ ok: false, message: "Selecione apenas 1 grupo PRINCIPAL." }, { status: 400 });
  }

  const emitidos: Array<Record<string, unknown>> = [];
  const snapshot = (body.snapshot_financeiro ?? {}) as Record<string, unknown>;
  const manuais = (body.variaveis_manuais ?? {}) as Record<string, unknown>;

  const grupoIdsIncluidos = Array.from(new Set(selecionados.filter((s) => s.incluir).map((s) => s.grupo_id)));
  if (grupoIdsIncluidos.length === 0) {
    return NextResponse.json({ ok: false, message: "Nenhum grupo selecionado para emissao." }, { status: 400 });
  }

  const { data: vincs, error: vincErr } = await supabase
    .from("documentos_grupos_modelos")
    .select("grupo_id, documento_modelo_id")
    .in("grupo_id", grupoIdsIncluidos);

  if (vincErr) return NextResponse.json({ ok: false, message: vincErr.message }, { status: 500 });

  const allowed = new Set<string>();
  for (const r of (vincs ?? []) as unknown as Array<Record<string, unknown>>) {
    const k = `${Number(r.grupo_id)}:${Number(r.documento_modelo_id)}`;
    allowed.add(k);
  }

  for (const item of selecionados.filter((s) => s.incluir)) {
    if (!grupoSet.has(item.grupo_id)) {
      return NextResponse.json(
        { ok: false, message: `Grupo invalido para este conjunto: ${item.grupo_id}` },
        { status: 400 }
      );
    }

    const key = `${item.grupo_id}:${item.documento_modelo_id}`;
    if (!allowed.has(key)) {
      return NextResponse.json(
        { ok: false, message: `Modelo ${item.documento_modelo_id} nao esta vinculado ao grupo ${item.grupo_id}.` },
        { status: 400 }
      );
    }

    const { data: modelo, error: modErr } = await supabase
      .from("documentos_modelo")
      .select("*")
      .eq("id", item.documento_modelo_id)
      .single();

    if (modErr || !modelo) {
      return NextResponse.json({ ok: false, message: `Modelo nao encontrado: ${item.documento_modelo_id}` }, { status: 404 });
    }

    const vars: Record<string, unknown> = { ...manuais };

    const conteudo = renderTemplate(String((modelo as Record<string, unknown>).texto_modelo_md ?? ""), vars);
    const hash = crypto.createHash("sha256").update(conteudo, "utf8").digest("hex");

    const baseInsert: Record<string, unknown> = {
      matricula_id: matriculaId,
      status_assinatura: "PENDENTE",
      conteudo_renderizado_md: conteudo,
      variaveis_utilizadas_json: vars,
      snapshot_financeiro_json: snapshot,
      hash_conteudo: hash,
      documento_conjunto_id: conjuntoId,
      documento_grupo_id: item.grupo_id,
    };

    let inserted: Record<string, unknown> | null = null;

    {
      const try1 = { ...baseInsert, documento_modelo_id: item.documento_modelo_id };
      const { data, error } = await supabase.from("documentos_emitidos").insert(try1).select("*").single();
      if (!error) inserted = data as unknown as Record<string, unknown>;
    }

    if (!inserted) {
      const try2 = { ...baseInsert, contrato_modelo_id: item.documento_modelo_id };
      const { data, error } = await supabase.from("documentos_emitidos").insert(try2).select("*").single();
      if (error) return NextResponse.json({ ok: false, message: error.message }, { status: 500 });
      inserted = data as unknown as Record<string, unknown>;
    }

    emitidos.push(inserted);
  }

  await supabase
    .from("matriculas")
    .update({ documento_conjunto_id: conjuntoId })
    .eq("id", matriculaId);

  return NextResponse.json(
    { ok: true, data: { matricula_id: matriculaId, documento_conjunto_id: conjuntoId, emitidos } },
    { status: 201 }
  );
}
