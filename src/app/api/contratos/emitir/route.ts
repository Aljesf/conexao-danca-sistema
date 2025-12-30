import { NextResponse } from "next/server";
import crypto from "crypto";
import { getSupabaseServerSSR } from "@/lib/supabaseServerSSR";

type EmitirContratoPayload = {
  matricula_id: number;
  contrato_modelo_id: number;
  variaveis_manuaIs?: Record<string, unknown>;
  variaveis_manuais?: Record<string, unknown>;
  snapshot_financeiro?: Record<string, unknown>;
};

function renderTemplate(template: string, vars: Record<string, unknown>): string {
  return template.replace(/\{\{([A-Z0-9_]+)\}\}/g, (_match, key: string) => {
    const v = vars[key];
    if (v === null || typeof v === "undefined") return "";
    if (typeof v === "string") return v;
    if (typeof v === "number" || typeof v === "boolean") return String(v);
    return JSON.stringify(v);
  });
}

export async function POST(req: Request) {
  const supabase = await getSupabaseServerSSR();
  const body = (await req.json()) as EmitirContratoPayload;

  if (!body?.matricula_id || !body?.contrato_modelo_id) {
    return NextResponse.json(
      { error: "Campos obrigatorios: matricula_id, contrato_modelo_id." },
      { status: 400 },
    );
  }

  const { data: modelo, error: modeloErr } = await supabase
    .from("contratos_modelo")
    .select("*")
    .eq("id", body.contrato_modelo_id)
    .single();

  if (modeloErr || !modelo) {
    return NextResponse.json({ error: "Modelo de contrato nao encontrado." }, { status: 404 });
  }

  const { data: matricula, error: matErr } = await supabase
    .from("matriculas")
    .select("id")
    .eq("id", body.matricula_id)
    .single();

  if (matErr || !matricula) {
    return NextResponse.json({ error: "Matricula nao encontrada." }, { status: 404 });
  }

  const variaveis: Record<string, unknown> = {
    ...(body.variaveis_manuais ?? body.variaveis_manuaIs ?? {}),
  };

  const conteudo = renderTemplate(String(modelo.texto_modelo_md), variaveis);
  const hash = crypto.createHash("sha256").update(conteudo, "utf8").digest("hex");

  const insertPayload = {
    matricula_id: body.matricula_id,
    contrato_modelo_id: body.contrato_modelo_id,
    status_assinatura: "PENDENTE",
    conteudo_renderizado_md: conteudo,
    variaveis_utilizadas_json: variaveis,
    snapshot_financeiro_json: body.snapshot_financeiro ?? {},
    hash_conteudo: hash,
  };

  const { data, error } = await supabase
    .from("contratos_emitidos")
    .insert(insertPayload)
    .select("*")
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ data }, { status: 201 });
}
