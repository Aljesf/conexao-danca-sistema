import { NextResponse } from "next/server";
import crypto from "crypto";
import { getSupabaseServerSSR } from "@/lib/supabaseServerSSR";
import {
  resolvePlaceholdersHtml,
  type DocumentoVariavel,
} from "@/lib/documentos/resolvePlaceholders";

type EmitirDocumentoPayload = {
  matricula_id: number;
  documento_modelo_id?: number;
  contrato_modelo_id?: number;
  variaveis_manuais?: Record<string, unknown>;
  snapshot_financeiro?: Record<string, unknown>;
};

function resolveModeloTemplate(modelo: Record<string, unknown>): string {
  const formato = String(modelo.formato ?? "MARKDOWN");
  if (formato === "RICH_HTML") {
    const html = modelo.conteudo_html;
    if (typeof html === "string" && html.trim()) return html;
  }
  const texto = modelo.texto_modelo_md;
  return typeof texto === "string" ? texto : "";
}

function getByPath(obj: unknown, path: string): unknown {
  if (!obj || typeof obj !== "object") return undefined;
  const parts = path.split(".").map((p) => p.trim()).filter(Boolean);
  let cur: unknown = obj;
  for (const part of parts) {
    if (!cur || typeof cur !== "object") return undefined;
    const rec = cur as Record<string, unknown>;
    cur = rec[part];
  }
  return cur;
}

function buildVariaveisByCodigo(rows: Array<Record<string, unknown>>): Map<string, DocumentoVariavel> {
  const map = new Map<string, DocumentoVariavel>();
  for (const row of rows) {
    const codigo = String(row.codigo ?? "").trim().toUpperCase();
    if (!codigo) continue;
    map.set(codigo, {
      codigo,
      path_origem: typeof row.path_origem === "string" ? row.path_origem : row.path_origem ?? null,
      formato: typeof row.formato === "string" ? row.formato : row.formato ?? null,
      tipo: typeof row.tipo === "string" ? row.tipo : row.tipo ?? null,
    });
  }
  return map;
}

function buildVariaveisUtilizadas(args: {
  htmlTemplate: string;
  variaveisByCodigo: Map<string, DocumentoVariavel>;
  contexto: Record<string, unknown>;
}): Record<string, unknown> {
  const { htmlTemplate, variaveisByCodigo, contexto } = args;
  const vars: Record<string, unknown> = {};

  htmlTemplate.replace(/\{\{([A-Z0-9_]+)\}\}/g, (_match, codeRaw: string) => {
    const code = String(codeRaw || "").trim();
    if (!code || Object.prototype.hasOwnProperty.call(vars, code)) return "";
    const v = variaveisByCodigo.get(code);
    const val = v?.path_origem
      ? getByPath(contexto, v.path_origem)
      : getByPath(contexto, `variaveis_manuais.${code}`);
    vars[code] = typeof val === "undefined" ? null : val;
    return "";
  });

  return vars;
}

function normalizeManualVars(raw: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(raw)) {
    const code = k.trim().toUpperCase();
    if (!code) continue;
    out[code] = v;
  }
  return out;
}

export async function POST(req: Request) {
  const supabase = await getSupabaseServerSSR();
  const body = (await req.json()) as EmitirDocumentoPayload;
  const documentoModeloId = Number(body.documento_modelo_id ?? body.contrato_modelo_id);

  if (!body?.matricula_id || !Number.isFinite(documentoModeloId)) {
    return NextResponse.json(
      { error: "Campos obrigatorios: matricula_id, documento_modelo_id." },
      { status: 400 },
    );
  }

  const { data: modelo, error: modeloErr } = await supabase
    .from("documentos_modelo")
    .select("*")
    .eq("id", documentoModeloId)
    .single();

  if (modeloErr || !modelo) {
    return NextResponse.json({ error: "Modelo de documento nao encontrado." }, { status: 404 });
  }

  const { data: matricula, error: matErr } = await supabase
    .from("matriculas")
    .select("*")
    .eq("id", body.matricula_id)
    .single();

  if (matErr || !matricula) {
    return NextResponse.json({ error: "Matricula nao encontrada." }, { status: 404 });
  }

  const pessoaId = Number((matricula as Record<string, unknown>).pessoa_id);
  const respFinId = Number((matricula as Record<string, unknown>).responsavel_financeiro_id);

  const { data: aluno } = await supabase
    .from("pessoas")
    .select("*")
    .eq("id", pessoaId)
    .single();

  const { data: responsavel } = await supabase
    .from("pessoas")
    .select("*")
    .eq("id", respFinId)
    .single();

  const vinculoIdRaw = (matricula as Record<string, unknown>).vinculo_id;
  const vinculoId = typeof vinculoIdRaw === "number" ? vinculoIdRaw : Number(vinculoIdRaw);
  let turma: Record<string, unknown> | null = null;

  if (Number.isFinite(vinculoId)) {
    const { data: turmaData, error: turmaErr } = await supabase
      .from("turmas")
      .select("*")
      .eq("turma_id", vinculoId)
      .maybeSingle();

    if (!turmaErr && turmaData) {
      turma = turmaData as Record<string, unknown>;
    }
  }

  const snapshot = (body.snapshot_financeiro ?? {}) as Record<string, unknown>;
  const manualRaw = (body.variaveis_manuais ?? {}) as Record<string, unknown>;
  const manual = normalizeManualVars(manualRaw);

  const { data: variaveisRaw, error: variaveisErr } = await supabase
    .from("documentos_variaveis")
    .select("codigo, path_origem, formato, tipo")
    .eq("ativo", true);

  if (variaveisErr) {
    return NextResponse.json({ error: variaveisErr.message }, { status: 500 });
  }

  const variaveisByCodigo = buildVariaveisByCodigo(
    (variaveisRaw ?? []) as unknown as Array<Record<string, unknown>>,
  );

  const contexto: Record<string, unknown> = {
    aluno: aluno ?? null,
    turma,
    matricula,
    responsavel: responsavel ?? null,
    escola: null,
    snapshot_financeiro: snapshot,
    variaveis_manuais: manual,
  };

  const template = resolveModeloTemplate(modelo as Record<string, unknown>);
  const conteudoResolvido = resolvePlaceholdersHtml({
    htmlTemplate: template,
    variaveisByCodigo,
    contexto,
  });
  const hash = crypto.createHash("sha256").update(conteudoResolvido, "utf8").digest("hex");
  const variaveisUtilizadas = buildVariaveisUtilizadas({
    htmlTemplate: template,
    variaveisByCodigo,
    contexto,
  });

  const insertPayload = {
    matricula_id: body.matricula_id,
    contrato_modelo_id: documentoModeloId,
    status_assinatura: "PENDENTE",
    conteudo_renderizado_md: conteudoResolvido,
    conteudo_html: conteudoResolvido,
    conteudo_template_html: template,
    conteudo_resolvido_html: conteudoResolvido,
    contexto_json: contexto,
    variaveis_utilizadas_json: variaveisUtilizadas,
    snapshot_financeiro_json: snapshot,
    hash_conteudo: hash,
  };

  const { data, error } = await supabase
    .from("documentos_emitidos")
    .insert(insertPayload)
    .select("*")
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ data }, { status: 201 });
}
