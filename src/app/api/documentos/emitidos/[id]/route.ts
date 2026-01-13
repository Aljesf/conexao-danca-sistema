import { NextResponse } from "next/server";
import type { SupabaseClient } from "@supabase/supabase-js";
import { getSupabaseServerSSR } from "@/lib/supabaseServerSSR";
import { stripBackgroundStyles } from "@/lib/documentos/sanitizeHtml";
import {
  extractPlaceholderCodes,
  formatValue,
  getByPath,
  type DocumentoVariavel,
} from "@/lib/documentos/resolvePlaceholders";
import { extractCollectionCodes, renderTemplateHtml } from "@/lib/documentos/templateRenderer";
import { resolveCollections } from "@/lib/documentos/collectionsResolver";
import { type JoinEdge } from "@/lib/documentos/resolveByJoinPath";
import { normalizeOperacaoTipo, OPERACAO_TIPOS } from "@/lib/documentos/operacaoTipos";
import { decodeHtmlEntities } from "@/lib/documentos/renderHtml";

type ApiResp<T> = { ok: boolean; data?: T; message?: string };

type DocumentoVariavelDb = DocumentoVariavel & {
  root_table: string | null;
  root_pk_column: string | null;
  join_path: JoinEdge[] | null;
  target_table: string | null;
  target_column: string | null;
  ai_gerada: boolean;
  mapeamento_pendente: boolean;
};

const isInDirection = (direction?: string | null) =>
  direction === "IN" || direction === "IN_GUESS";

const shouldDecodeHtml = (raw: string) => {
  const trimmed = raw.trimStart();
  return trimmed.startsWith("&lt;") || raw.includes("&lt;h");
};

const maybeDecodeHtml = (raw: string | null | undefined) => {
  if (typeof raw !== "string") return raw ?? null;
  return shouldDecodeHtml(raw) ? decodeHtmlEntities(raw) : raw;
};

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
      ai_gerada: Boolean(row.ai_gerada),
      mapeamento_pendente: Boolean(row.mapeamento_pendente),
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
}): Promise<{ values: Record<string, string>; utilizadas: Record<string, unknown> }> {
  const { template, contexto, variaveisByCodigo, supabase, rootId } = params;
  const codes = extractPlaceholderCodes(template);
  const valoresFormatados: Record<string, string> = {};
  const utilizadas: Record<string, unknown> = {};

  await Promise.all(
    codes.map(async (code) => {
      const variavel = variaveisByCodigo.get(code);

      if (variavel?.mapeamento_pendente) {
        valoresFormatados[code] = "";
        utilizadas[code] = null;
        return;
      }

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

  return { values: valoresFormatados, utilizadas };
}

function resolveTemplateBase(doc: Record<string, unknown>): string {
  const html = doc.conteudo_template_html;
  if (typeof html === "string" && html.trim()) return html;
  const md = doc.conteudo_renderizado_md;
  if (typeof md === "string" && md.trim()) return md;
  const resolved = doc.conteudo_resolvido_html;
  return typeof resolved === "string" ? resolved : "";
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

export async function GET(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const docId = Number(id);
  if (!Number.isFinite(docId) || docId <= 0) {
    return NextResponse.json(
      { ok: false, message: "ID invalido." } satisfies ApiResp<never>,
      { status: 400 },
    );
  }

  const supabase = await getSupabaseServerSSR();
  const { data, error } = await supabase
    .from("documentos_emitidos")
    .select("*")
    .eq("id", docId)
    .single();

  if (error) {
    return NextResponse.json({ ok: false, message: error.message } satisfies ApiResp<never>, { status: 404 });
  }

  const decoded = {
    ...data,
    conteudo_resolvido_html: maybeDecodeHtml(data.conteudo_resolvido_html),
    conteudo_template_html: maybeDecodeHtml(data.conteudo_template_html),
    conteudo_renderizado_md: maybeDecodeHtml(data.conteudo_renderizado_md),
    header_html: maybeDecodeHtml(data.header_html),
    footer_html: maybeDecodeHtml(data.footer_html),
    cabecalho_html: maybeDecodeHtml(data.cabecalho_html),
    rodape_html: maybeDecodeHtml(data.rodape_html),
  };

  return NextResponse.json({ ok: true, data: decoded } satisfies ApiResp<unknown>, { status: 200 });
}

export async function PATCH(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const docId = Number(id);
  if (!Number.isFinite(docId) || docId <= 0) {
    return NextResponse.json(
      { ok: false, message: "ID invalido." } satisfies ApiResp<never>,
      { status: 400 },
    );
  }

  const body = (await req.json()) as Record<string, unknown>;
  const conteudoResolvido =
    typeof body.conteudo_resolvido_html === "string" ? body.conteudo_resolvido_html : "";
  const conteudoResolvidoLimpo = stripBackgroundStyles(conteudoResolvido);

  if (!conteudoResolvidoLimpo.trim()) {
    return NextResponse.json(
      { ok: false, message: "Conteudo resolvido e obrigatorio." } satisfies ApiResp<never>,
      { status: 400 },
    );
  }

  const supabase = await getSupabaseServerSSR();

  const { data, error } = await supabase
    .from("documentos_emitidos")
    .update({
      conteudo_resolvido_html: conteudoResolvidoLimpo,
      editado_manual: true,
      updated_at: new Date().toISOString(),
    })
    .eq("id", docId)
    .select("id,editado_manual,updated_at")
    .single();

  if (error) {
    return NextResponse.json({ ok: false, message: error.message } satisfies ApiResp<never>, { status: 500 });
  }

  return NextResponse.json({ ok: true, data } satisfies ApiResp<unknown>);
}

export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await ctx.params;
    const docId = Number(id);
    if (!Number.isFinite(docId) || docId <= 0) {
      return NextResponse.json(
        { ok: false, message: "ID invalido." } satisfies ApiResp<never>,
        { status: 400 },
      );
    }

    const supabase = await getSupabaseServerSSR();
    const { data: doc, error: docErr } = await supabase
      .from("documentos_emitidos")
      .select("*")
      .eq("id", docId)
      .single();

    if (docErr || !doc) {
      return NextResponse.json({ ok: false, message: "Documento emitido nao encontrado." } satisfies ApiResp<never>, {
        status: 404,
      });
    }

    const docRec = doc as Record<string, unknown>;
    const matriculaId = Number(docRec.matricula_id);
    if (!Number.isFinite(matriculaId) || matriculaId <= 0) {
      return NextResponse.json({ ok: false, message: "Matricula invalida no emitido." } satisfies ApiResp<never>, {
        status: 400,
      });
    }

    const contextoBase =
      docRec.contexto_json && typeof docRec.contexto_json === "object"
        ? (docRec.contexto_json as Record<string, unknown>)
        : {};

    const contratoModeloIdRaw = docRec.contrato_modelo_id ?? docRec.documento_modelo_id;
    const contratoModeloId =
      typeof contratoModeloIdRaw === "number" ? contratoModeloIdRaw : Number(contratoModeloIdRaw);

    let template = resolveTemplateBase(docRec);
    if (Number.isFinite(contratoModeloId) && contratoModeloId > 0) {
      const { data: modelo, error: modeloErr } = await supabase
        .from("documentos_modelo")
        .select("id,formato,conteudo_html,texto_modelo_md")
        .eq("id", contratoModeloId)
        .single();

      if (modeloErr || !modelo) {
        return NextResponse.json({ ok: false, message: "Modelo nao encontrado." } satisfies ApiResp<never>, {
          status: 404,
        });
      }

      template = resolveModeloTemplate(modelo as Record<string, unknown>);

      if (process.env.DOCS_EMIT_DEBUG === "1") {
        console.log("[emitido-reload] emitido_id:", docId, "matricula_id:", matriculaId, "modelo_id:", contratoModeloId);
        console.log("[emitido-reload] modelo_carregado_id:", modelo.id, "tamanho_texto:", template.length);
      }
    }

    const contextoPersistido: Record<string, unknown> = {
      ...contextoBase,
    };

    const { data: variaveisRaw, error: variaveisErr } = await supabase
      .from("documentos_variaveis")
      .select(
        "codigo, path_origem, formato, tipo, root_table, root_pk_column, join_path, target_table, target_column, ai_gerada, mapeamento_pendente",
      )
      .eq("ativo", true);

    if (variaveisErr) {
      return NextResponse.json({ ok: false, message: variaveisErr.message } satisfies ApiResp<never>, { status: 500 });
    }

    const variaveisByCodigo = buildVariaveisByCodigo(
      (variaveisRaw ?? []) as unknown as Array<Record<string, unknown>>,
    );

    const { values: simpleContext, utilizadas: variaveisUtilizadas } = await resolveTemplateValues({
      template,
      variaveisByCodigo,
      contexto: contextoPersistido,
      supabase,
      rootId: matriculaId,
    });

    const collectionCodes = extractCollectionCodes(template);
    const operacaoTipo = normalizeOperacaoTipo(OPERACAO_TIPOS.MATRICULA);
    const collectionsResolved =
      collectionCodes.length > 0
        ? await resolveCollections({
            operacaoTipo,
            operacaoId: matriculaId,
            colecoes: collectionCodes,
          })
        : {};

    const collectionsResolvedFinal: Record<string, Array<Record<string, string>>> = {
      ...collectionsResolved,
    };

    const colecoesDetectadasSet = new Set<string>(collectionCodes);
    const colecoesDetectadas = Array.from(colecoesDetectadasSet);
    const colecoesVazias = colecoesDetectadas.filter((code) => {
      const rows = collectionsResolvedFinal[code];
      return Array.isArray(rows) && rows.length === 0;
    });

    const variaveisUtilizadasFinal = {
      ...variaveisUtilizadas,
      __colecoes_detectadas: colecoesDetectadas,
      __colecoes_vazias: colecoesVazias,
    };

    const contextoFinal: Record<string, unknown> = {
      ...simpleContext,
      ...collectionsResolvedFinal,
    };

    const url = new URL(req.url);
    const debugEnabled = process.env.DOCS_EMIT_DEBUG === "1" || url.searchParams.get("debug") === "1";
    const parcelasRaw = (contextoFinal as Record<string, unknown>)["MATRICULA_PARCELAS"];
    const parcelasArr = Array.isArray(parcelasRaw) ? (parcelasRaw as Array<Record<string, unknown>>) : [];
    const primeiraParcela = parcelasArr.length > 0 ? parcelasArr[0] : null;
    const previewLinhaDebug =
      debugEnabled && primeiraParcela && typeof primeiraParcela === "object"
        ? [
            "<tr>",
            `<td>${String(primeiraParcela.DATA ?? "")}</td>`,
            `<td>${String(primeiraParcela.DESCRICAO ?? "")}</td>`,
            `<td>${String(primeiraParcela.VALOR ?? "")}</td>`,
            `<td>${String(primeiraParcela.STATUS ?? "")}</td>`,
            "</tr>",
          ].join("")
        : null;

    let sanityDbLen: number | null = null;
    if (debugEnabled) {
      const { data: sanityRows, error: sanityErr } = await supabase
        .from("credito_conexao_lancamentos")
        .select("id")
        .in("origem_sistema", ["MATRICULA", "MATRICULAS"])
        .eq("origem_id", matriculaId);

      if (!sanityErr && Array.isArray(sanityRows)) {
        sanityDbLen = sanityRows.length;
      } else {
        sanityDbLen = -1;
      }
    }

    if (debugEnabled) {
      console.log("[doc-colecao] matricula_id:", matriculaId);
      console.log("[doc-colecao] colecoes_detectadas:", colecoesDetectadas);
      console.log("[doc-colecao] keys_contexto:", Object.keys(contextoFinal));
      const rows = collectionsResolvedFinal.MATRICULA_PARCELAS;
      console.log("[doc-colecao] MATRICULA_PARCELAS_len:", Array.isArray(rows) ? rows.length : 0);
      console.log(
        "[doc-colecao] colecoes_linhas:",
        Object.fromEntries(
          Object.entries(collectionsResolvedFinal).map(([k, v]) => [k, Array.isArray(v) ? v.length : 0]),
        ),
      );
      console.log(
        "[emitido-render]",
        "keys:",
        Object.keys(contextoFinal),
        "parcelas_len:",
        Array.isArray((contextoFinal as Record<string, unknown>).MATRICULA_PARCELAS)
          ? (contextoFinal as Record<string, unknown>).MATRICULA_PARCELAS.length
          : "N/A",
      );
    }

    const conteudoResolvido = renderTemplateHtml(template, contextoFinal);
    const conteudoResolvidoLimpo = stripBackgroundStyles(conteudoResolvido);
    const conteudoResolvidoPreview = maybeDecodeHtml(conteudoResolvidoLimpo) ?? "";
    const htmlLen = conteudoResolvidoLimpo.length;

    const debugPayload = debugEnabled
      ? {
          emitidoId: docId,
          matriculaId,
          contratoModeloId,
          templateSize: template.length,
          colecoesDetectadas: Array.isArray(colecoesDetectadas) ? colecoesDetectadas : [],
          parcelasLen: parcelasArr.length,
          primeiraParcela,
          previewLinhaDebug,
          sanityDbLen,
          htmlLen,
          keysContexto: Object.keys(contextoFinal),
        }
      : null;

    const { data: atualizado, error: updErr } = await supabase
      .from("documentos_emitidos")
      .update({
        conteudo_template_html: template,
        conteudo_resolvido_html: conteudoResolvidoLimpo,
        contexto_json: contextoPersistido,
        variaveis_utilizadas_json: variaveisUtilizadasFinal,
        updated_at: new Date().toISOString(),
      })
      .eq("id", docId)
      .select("id, updated_at")
      .single();

    if (updErr) {
      return NextResponse.json({ ok: false, message: updErr.message } satisfies ApiResp<never>, { status: 500 });
    }

    return NextResponse.json(
      {
        ok: true,
        data: atualizado,
        html: conteudoResolvidoPreview,
        ...(debugEnabled ? { debug: debugPayload } : {}),
      } satisfies ApiResp<unknown>,
      { status: 200 },
    );
  } catch (err) {
    console.error("[emitido-reload] erro", err);
    return NextResponse.json(
      { ok: false, message: err instanceof Error ? err.message : "Erro desconhecido" },
      { status: 500 },
    );
  }
}
