import { NextResponse } from "next/server";
import type { PostgrestError } from "@supabase/supabase-js";
import { getSupabaseServerSSR } from "@/lib/supabaseServerSSR";

type BodyPayload = {
  matricula_id?: number;
  modelo_ids?: number[];
};

type ModeloRow = {
  id: number;
  titulo: string;
  formato: string | null;
  conteudo_html: string | null;
  texto_modelo_md: string | null;
  ativo: boolean;
};

function isSchemaMissing(err: unknown): boolean {
  const e = err as PostgrestError | null;
  return !!e && typeof e.code === "string" && (e.code === "42P01" || e.code === "42703");
}

function normalizeIds(raw: unknown): number[] {
  if (!Array.isArray(raw)) return [];
  const set = new Set<number>();
  for (const item of raw) {
    const id = Number(item);
    if (Number.isFinite(id) && id > 0) {
      set.add(id);
    }
  }
  return Array.from(set.values());
}

function resolveConteudo(modelo: ModeloRow): string {
  const html = (modelo.conteudo_html ?? "").trim();
  const md = (modelo.texto_modelo_md ?? "").trim();
  if ((modelo.formato ?? "").toUpperCase() === "RICH_HTML") {
    return html || md || modelo.titulo || "";
  }
  return md || html || modelo.titulo || "";
}

async function resolveModeloColumn(supabase: Awaited<ReturnType<typeof getSupabaseServerSSR>>) {
  const tryDocumento = await supabase.from("documentos_emitidos").select("documento_modelo_id").limit(1);
  if (!tryDocumento.error) return "documento_modelo_id" as const;
  if (!isSchemaMissing(tryDocumento.error)) {
    throw tryDocumento.error;
  }

  const tryContrato = await supabase.from("documentos_emitidos").select("contrato_modelo_id").limit(1);
  if (!tryContrato.error) return "contrato_modelo_id" as const;
  throw tryContrato.error;
}

export async function POST(req: Request) {
  const supabase = await getSupabaseServerSSR();
  const body = (await req.json()) as BodyPayload;

  if (!body || typeof body !== "object") {
    return NextResponse.json({ ok: false, error: "payload_invalido" }, { status: 400 });
  }

  const matriculaId = Number(body.matricula_id);
  const modeloIds = normalizeIds(body.modelo_ids);

  if (!Number.isFinite(matriculaId) || matriculaId <= 0 || modeloIds.length === 0) {
    return NextResponse.json({ ok: false, error: "campos_obrigatorios" }, { status: 400 });
  }

  const { data: matricula, error: matErr } = await supabase
    .from("matriculas")
    .select("id")
    .eq("id", matriculaId)
    .maybeSingle();

  if (matErr || !matricula) {
    return NextResponse.json({ ok: false, error: "matricula_nao_encontrada" }, { status: 404 });
  }

  let modeloColumn: "documento_modelo_id" | "contrato_modelo_id";
  try {
    modeloColumn = await resolveModeloColumn(supabase);
  } catch (err) {
    const detail = err instanceof Error ? err.message : "erro_schema_emitidos";
    return NextResponse.json({ ok: false, error: "falha_schema_emitidos", detail }, { status: 500 });
  }

  const { data: existentes, error: existErr } = await supabase
    .from("documentos_emitidos")
    .select(modeloColumn)
    .eq("matricula_id", matriculaId)
    .in(modeloColumn, modeloIds);

  if (existErr) {
    return NextResponse.json(
      { ok: false, error: "falha_verificar_emitidos", detail: existErr.message },
      { status: 500 },
    );
  }

  const jaSet = new Set(
    (existentes ?? []).map((row) => Number((row as Record<string, unknown>)[modeloColumn])),
  );
  const novosIds = modeloIds.filter((id) => !jaSet.has(id));

  if (novosIds.length === 0) {
    return NextResponse.json({ ok: true, data: { created: 0, skipped: modeloIds.length } });
  }

  const { data: modelos, error: modelosErr } = await supabase
    .from("documentos_modelo")
    .select("id,titulo,formato,conteudo_html,texto_modelo_md,ativo")
    .in("id", novosIds)
    .eq("ativo", true);

  if (modelosErr) {
    return NextResponse.json({ ok: false, error: "falha_carregar_modelos", detail: modelosErr.message }, { status: 500 });
  }

  const modelosMap = new Map<number, ModeloRow>();
  (modelos ?? []).forEach((m) => modelosMap.set(Number(m.id), m as ModeloRow));

  const missing = novosIds.filter((id) => !modelosMap.has(id));
  if (missing.length > 0) {
    return NextResponse.json(
      { ok: false, error: "modelo_nao_encontrado", detail: { missing } },
      { status: 404 },
    );
  }

  const payload = novosIds.map((id) => {
    const modelo = modelosMap.get(id) as ModeloRow;
    return {
      matricula_id: matriculaId,
      [modeloColumn]: id,
      status_assinatura: "PENDENTE",
      conteudo_renderizado_md: resolveConteudo(modelo),
    };
  });

  const { error: insErr } = await supabase.from("documentos_emitidos").insert(payload);
  if (insErr) {
    return NextResponse.json({ ok: false, error: "falha_emitir", detail: insErr.message }, { status: 500 });
  }

  return NextResponse.json({
    ok: true,
    data: { created: novosIds.length, skipped: modeloIds.length - novosIds.length },
  });
}
