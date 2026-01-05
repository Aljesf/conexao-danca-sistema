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

type FinanceiroLinhaRow = {
  data_evento: string | null;
  vencimento: string | null;
  descricao: string | null;
  valor_centavos: number | null;
  status: string | null;
  tipo: string | null;
};

type ParcelaDocumento = {
  data: string;
  descricao: string;
  valor: string;
  status: string;
};

function formatDateBR(dateISO: string | null): string {
  if (!dateISO) return "";
  const [y, m, d] = dateISO.split("-");
  if (!y || !m || !d) return dateISO;
  return `${d}/${m}/${y}`;
}

function formatBRLFromCentavos(centavos: number): string {
  const valor = Number.isFinite(centavos) ? centavos / 100 : 0;
  return valor.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

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

  return NextResponse.json({ ok: true, data } satisfies ApiResp<unknown>, { status: 200 });
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

export async function POST(_req: Request, ctx: { params: Promise<{ id: string }> }) {
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

  const { data: linhasRaw, error: linhasErr } = await supabase
    .from("matriculas_financeiro_linhas")
    .select("data_evento,vencimento,descricao,valor_centavos,status,tipo")
    .eq("matricula_id", matriculaId)
    .in("tipo", ["PARCELA", "LANCAMENTO_CREDITO"])
    .order("data_evento", { ascending: true, nullsFirst: false })
    .order("vencimento", { ascending: true, nullsFirst: false })
    .limit(500);

  if (linhasErr) {
    return NextResponse.json({ ok: false, message: linhasErr.message } satisfies ApiResp<never>, { status: 500 });
  }

  const linhas = (linhasRaw ?? []) as FinanceiroLinhaRow[];
  const parcelas: ParcelaDocumento[] = linhas.map((row, index) => {
    const data = formatDateBR(row.data_evento ?? row.vencimento ?? null);
    const descricao = row.descricao?.trim() || `Parcela ${index + 1}`;
    const valor = formatBRLFromCentavos(Number(row.valor_centavos ?? 0));
    const status = row.status?.trim() || "";
    return {
      data,
      descricao,
      valor,
      status,
    };
  });

  console.log("[emitido-context] matricula_id:", matriculaId, "parcelas:", parcelas.length);

  const contextoFinal: Record<string, unknown> = {
    ...contextoBase,
    parcelas,
  };

  const template = resolveTemplateBase(docRec);
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
    contexto: contextoFinal,
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
    parcelas,
  };
  const hasParcelasTag = /{{#\s*parcelas\s*}}/i.test(template);
  const colecoesDetectadasSet = new Set<string>(collectionCodes);
  if (hasParcelasTag) {
    colecoesDetectadasSet.add("parcelas");
  }
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

  const conteudoResolvido = renderTemplateHtml(template, { ...simpleContext, ...collectionsResolvedFinal });
  const conteudoResolvidoLimpo = stripBackgroundStyles(conteudoResolvido);

  const { data: atualizado, error: updErr } = await supabase
    .from("documentos_emitidos")
    .update({
      conteudo_resolvido_html: conteudoResolvidoLimpo,
      contexto_json: contextoFinal,
      variaveis_utilizadas_json: variaveisUtilizadasFinal,
      updated_at: new Date().toISOString(),
    })
    .eq("id", docId)
    .select("id, updated_at")
    .single();

  if (updErr) {
    return NextResponse.json({ ok: false, message: updErr.message } satisfies ApiResp<never>, { status: 500 });
  }

  return NextResponse.json({ ok: true, data: atualizado } satisfies ApiResp<unknown>, { status: 200 });
}
