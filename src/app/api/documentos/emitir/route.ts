import { NextResponse } from "next/server";
import crypto from "crypto";
import { getSupabaseServerSSR } from "@/lib/supabaseServerSSR";
import {
  formatCentavosBRL,
  getByPath,
  safeParseSchema,
  type PlaceholderSchemaItem,
} from "@/lib/documentos/placeholders";

type EmitirDocumentoPayload = {
  matricula_id: number;
  documento_modelo_id?: number;
  contrato_modelo_id?: number;
  variaveis_manuais?: Record<string, unknown>;
  snapshot_financeiro?: Record<string, unknown>;
};

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

function readSnapshotValue(snapshot: Record<string, unknown>, fromKey: string): unknown {
  if (!fromKey) return undefined;
  if (fromKey.includes(".")) {
    return getByPath({ snapshot_financeiro: snapshot }, fromKey);
  }
  return snapshot[fromKey];
}

function buildCalcValue(item: PlaceholderSchemaItem, snapshot: Record<string, unknown>): string | undefined {
  if (!item.calc) return undefined;

  if (item.calc.type === "STATIC") {
    return item.calc.staticValue ?? item.defaultValue ?? "";
  }

  if (item.calc.type === "SNAPSHOT") {
    const fromKey = (item.calc.fromKey ?? "").trim();
    const raw = fromKey ? readSnapshotValue(snapshot, fromKey) : undefined;
    if (typeof raw === "string") return raw;
    if (typeof raw === "number") return String(raw);
    return item.defaultValue;
  }

  if (item.calc.type === "FORMAT_MOEDA") {
    const fromKey = (item.calc.fromKey ?? "").trim();
    const raw = fromKey ? readSnapshotValue(snapshot, fromKey) : undefined;
    if (typeof raw === "number") return formatCentavosBRL(raw);
    return item.defaultValue;
  }

  return item.defaultValue;
}

function buildVariablesFromSchema(args: {
  schema: PlaceholderSchemaItem[];
  ctxDb: Record<string, unknown>;
  snapshot: Record<string, unknown>;
  manual: Record<string, unknown>;
}): { vars: Record<string, unknown>; missingRequired: string[] } {
  const { schema, ctxDb, snapshot, manual } = args;
  const vars: Record<string, unknown> = {};
  const missingRequired: string[] = [];

  for (const item of schema) {
    const key = item.key.trim().toUpperCase();
    let value: unknown;

    if (item.source === "DB" && item.db?.path) {
      value = getByPath(ctxDb, item.db.path);
      if (typeof value === "undefined" || value === null || value === "") {
        value = item.defaultValue;
      }
    }

    if (item.source === "CALC") {
      value = buildCalcValue(item, snapshot);
    }

    if (item.source === "MANUAL") {
      value = manual[key];
      if (typeof value === "undefined" || value === null || value === "") {
        value = item.defaultValue;
      }
    }

    if ((typeof value === "undefined" || value === null || value === "") && item.required) {
      missingRequired.push(key);
    }

    if (typeof value !== "undefined") {
      vars[key] = value;
    }
  }

  for (const [kRaw, v] of Object.entries(manual)) {
    const k = kRaw.trim().toUpperCase();
    vars[k] = v;
  }

  return { vars, missingRequired };
}

function resolveModeloTemplate(modelo: Record<string, unknown>): string {
  const formato = String(modelo.formato ?? "MARKDOWN");
  if (formato === "RICH_HTML") {
    const html = modelo.conteudo_html;
    if (typeof html === "string" && html.trim()) return html;
  }
  const texto = modelo.texto_modelo_md;
  return typeof texto === "string" ? texto : "";
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

  const ctxDb: Record<string, unknown> = {
    matricula,
    aluno,
    responsavel,
    turma,
  };

  const snapshot = (body.snapshot_financeiro ?? {}) as Record<string, unknown>;
  const manual = (body.variaveis_manuais ?? {}) as Record<string, unknown>;

  const schema = safeParseSchema((modelo as Record<string, unknown>).placeholders_schema_json);
  const fallbackSchema: PlaceholderSchemaItem[] = schema.length
    ? schema
    : [
        { key: "ALUNO_NOME", source: "DB", required: true, db: { path: "aluno.nome" } },
        { key: "RESP_FIN_NOME", source: "DB", required: true, db: { path: "responsavel.nome" } },
        { key: "ANO_REFERENCIA", source: "DB", required: false, db: { path: "matricula.ano_referencia" } },
      ];

  const { vars, missingRequired } = buildVariablesFromSchema({
    schema: fallbackSchema,
    ctxDb,
    snapshot,
    manual,
  });

  if (missingRequired.length > 0) {
    return NextResponse.json(
      { error: "Placeholders obrigatorios ausentes.", missing: missingRequired },
      { status: 400 },
    );
  }

  const template = resolveModeloTemplate(modelo as Record<string, unknown>);
  const conteudo = renderTemplate(template, vars);
  const hash = crypto.createHash("sha256").update(conteudo, "utf8").digest("hex");

  const insertPayload = {
    matricula_id: body.matricula_id,
    contrato_modelo_id: documentoModeloId,
    status_assinatura: "PENDENTE",
    conteudo_renderizado_md: conteudo,
    conteudo_html: conteudo,
    variaveis_utilizadas_json: vars,
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
