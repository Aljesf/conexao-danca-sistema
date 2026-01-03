import { NextResponse } from "next/server";
import crypto from "crypto";
import type { SupabaseClient } from "@supabase/supabase-js";
import { getSupabaseServerSSR } from "@/lib/supabaseServerSSR";
import {
  extractPlaceholderCodes,
  formatValue,
  getByPath,
  type DocumentoVariavel,
} from "@/lib/documentos/resolvePlaceholders";
import { type JoinEdge } from "@/lib/documentos/resolveByJoinPath";

type EmitirDocumentoPayload = {
  matricula_id: number;
  documento_modelo_id?: number;
  contrato_modelo_id?: number;
  variaveis_manuais?: Record<string, unknown>;
  snapshot_financeiro?: Record<string, unknown>;
};

type DocumentoVariavelDb = DocumentoVariavel & {
  root_table: string | null;
  root_pk_column: string | null;
  join_path: JoinEdge[] | null;
  target_table: string | null;
  target_column: string | null;
};

const isInDirection = (direction?: string | null) =>
  direction === "IN" || direction === "IN_GUESS";

function normalizeJoinPathForRpc(joinPath: JoinEdge[] | null): JoinEdge[] | null {
  if (!joinPath || joinPath.length === 0) return null;
  return joinPath.map((edge) => {
    if (isInDirection(edge.direction)) {
      return {
        from_table: edge.to_table,
        from_column: edge.to_column,
        to_table: edge.from_table,
        to_column: edge.from_column,
        constraint_name: edge.constraint_name,
      };
    }
    return {
      from_table: edge.from_table,
      from_column: edge.from_column,
      to_table: edge.to_table,
      to_column: edge.to_column,
      constraint_name: edge.constraint_name,
    };
  });
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

function buildVariaveisByCodigo(rows: Array<Record<string, unknown>>): Map<string, DocumentoVariavelDb> {
  const map = new Map<string, DocumentoVariavelDb>();
  for (const row of rows) {
    const codigo = String(row.codigo ?? "").trim().toUpperCase();
    if (!codigo) continue;
    map.set(codigo, {
      codigo,
      path_origem: typeof row.path_origem === "string" ? row.path_origem : row.path_origem ?? null,
      formato: typeof row.formato === "string" ? row.formato : row.formato ?? null,
      tipo: typeof row.tipo === "string" ? row.tipo : row.tipo ?? null,
      root_table: typeof row.root_table === "string" ? row.root_table : row.root_table ?? null,
      root_pk_column:
        typeof row.root_pk_column === "string" ? row.root_pk_column : row.root_pk_column ?? null,
      join_path: Array.isArray(row.join_path) ? (row.join_path as JoinEdge[]) : null,
      target_table: typeof row.target_table === "string" ? row.target_table : row.target_table ?? null,
      target_column: typeof row.target_column === "string" ? row.target_column : row.target_column ?? null,
    });
  }
  return map;
}

async function resolveTemplateValues(params: {
  template: string;
  contexto: Record<string, unknown>;
  variaveisByCodigo: Map<string, DocumentoVariavelDb>;
  supabase: SupabaseClient;
  rootId: number;
}): Promise<{ resolved: string; utilizadas: Record<string, unknown> }> {
  const { template, contexto, variaveisByCodigo, supabase, rootId } = params;
  const codes = extractPlaceholderCodes(template);
  const valoresFormatados: Record<string, string> = {};
  const utilizadas: Record<string, unknown> = {};

  await Promise.all(
    codes.map(async (code) => {
      const variavel = variaveisByCodigo.get(code);

      if (variavel?.root_table) {
        const rootTable = variavel.root_table;
        const rootPk = variavel.root_pk_column || "id";
        const targetTable = variavel.target_table;
        const targetColumn = variavel.target_column;

        if (rootTable && targetTable && targetColumn) {
          const joinPath = normalizeJoinPathForRpc(variavel.join_path ?? null);
          const { data, error } = await supabase.rpc("documentos_resolver_por_join_path", {
            p_root_table: rootTable,
            p_root_pk: rootPk,
            p_root_id: rootId,
            p_join_path: joinPath,
            p_target_table: targetTable,
            p_target_column: targetColumn,
          });

          const raw = error ? null : data;
          valoresFormatados[code] = formatValue(raw, variavel.formato);
          utilizadas[code] = typeof raw === "undefined" ? null : raw;
          return;
        }
      }

      if (variavel?.path_origem) {
        const raw = getByPath(contexto, variavel.path_origem);
        valoresFormatados[code] = formatValue(raw, variavel.formato);
        utilizadas[code] = typeof raw === "undefined" ? null : raw;
        return;
      }

      const rawManual = getByPath(contexto, `variaveis_manuais.${code}`);
      valoresFormatados[code] = formatValue(rawManual, variavel?.formato ?? null);
      utilizadas[code] = typeof rawManual === "undefined" ? null : rawManual;
    }),
  );

  const resolved = template.replace(/\{\{([A-Z0-9_]+)\}\}/g, (_match, codeRaw: string) => {
    const code = String(codeRaw || "").trim();
    return code ? valoresFormatados[code] ?? "" : "";
  });

  return { resolved, utilizadas };
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
    .select("id,formato,conteudo_html,texto_modelo_md")
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
    .select(
      "codigo, path_origem, formato, tipo, root_table, root_pk_column, join_path, target_table, target_column",
    )
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
  const { resolved: conteudoResolvido, utilizadas: variaveisUtilizadas } =
    await resolveTemplateValues({
      template,
      variaveisByCodigo,
      contexto,
      supabase,
      rootId: body.matricula_id,
    });
  const hash = crypto.createHash("sha256").update(conteudoResolvido, "utf8").digest("hex");

  const insertPayload = {
    matricula_id: body.matricula_id,
    contrato_modelo_id: documentoModeloId,
    status_assinatura: "PENDENTE",
    conteudo_renderizado_md: conteudoResolvido,
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
