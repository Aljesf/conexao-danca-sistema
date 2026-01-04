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
import { stripBackgroundStyles } from "@/lib/documentos/sanitizeHtml";
import { resolveCollections } from "@/lib/documentos/collectionsResolver";
import { extractCollectionCodes, renderTemplateHtml } from "@/lib/documentos/templateRenderer";
import { normalizeOperacaoTipo, OPERACAO_TIPOS } from "@/lib/documentos/operacaoTipos";

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
  ai_gerada: boolean;
  mapeamento_pendente: boolean;
};

type ParcelaCartaoConexao = {
  periodo: string;
  vencimento: string;
  valor: string;
  status: string;
};

type FaturaCartaoRow = {
  id: number;
  periodo_referencia: string | null;
  data_vencimento: string | null;
  valor_total_centavos: number | null;
  status: string | null;
};

type FaturaLinkRow = {
  fatura_id: number;
  lancamento_id: number;
};

type LancamentoCartaoRow = {
  id: number;
  valor_centavos: number | null;
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
    .select(
      "id,formato,conteudo_html,texto_modelo_md,cabecalho_html,rodape_html,layout_id,header_template_id,footer_template_id,header_height_px,footer_height_px,page_margin_mm",
    )
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
      "codigo, path_origem, formato, tipo, root_table, root_pk_column, join_path, target_table, target_column, ai_gerada, mapeamento_pendente",
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

  const parcelasCartao: ParcelaCartaoConexao[] = [];
  if (Number.isFinite(respFinId) && respFinId > 0) {
    const { data: contas, error: contaErr } = await supabase
      .from("credito_conexao_contas")
      .select("id")
      .eq("pessoa_titular_id", respFinId)
      .eq("ativo", true)
      .order("id", { ascending: false })
      .limit(1);

    if (contaErr) {
      return NextResponse.json({ error: contaErr.message }, { status: 500 });
    }

    const contaId = contas && contas.length > 0 ? Number(contas[0]?.id) : null;
    if (contaId && Number.isFinite(contaId)) {
      const statusFaturas = ["ABERTA", "PENDENTE", "EM_ABERTO"];
      const { data: faturasRaw, error: faturasErr } = await supabase
        .from("credito_conexao_faturas")
        .select("id,periodo_referencia,data_vencimento,valor_total_centavos,status,data_fechamento")
        .eq("conta_conexao_id", contaId)
        .in("status", statusFaturas)
        .order("data_vencimento", { ascending: true, nullsFirst: false })
        .order("data_fechamento", { ascending: true, nullsFirst: false })
        .limit(120);

      if (faturasErr) {
        return NextResponse.json({ error: faturasErr.message }, { status: 500 });
      }

      const faturas: FaturaCartaoRow[] = (faturasRaw ?? []).map((row) => {
        const record = row as Record<string, unknown>;
        const valorRaw = Number(record.valor_total_centavos);
        return {
          id: Number(record.id),
          periodo_referencia: typeof record.periodo_referencia === "string" ? record.periodo_referencia : null,
          data_vencimento: typeof record.data_vencimento === "string" ? record.data_vencimento : null,
          valor_total_centavos: Number.isFinite(valorRaw) ? valorRaw : null,
          status: typeof record.status === "string" ? record.status : null,
        };
      });

      const faturaIds = faturas.map((f) => f.id).filter((id) => Number.isFinite(id) && id > 0);
      const somaPorFatura = new Map<number, number>();

      if (faturaIds.length > 0) {
        const { data: linksRaw, error: linksErr } = await supabase
          .from("credito_conexao_fatura_lancamentos")
          .select("fatura_id,lancamento_id")
          .in("fatura_id", faturaIds);

        if (linksErr) {
          return NextResponse.json({ error: linksErr.message }, { status: 500 });
        }

        const links: FaturaLinkRow[] = (linksRaw ?? []).map((row) => {
          const record = row as Record<string, unknown>;
          return {
            fatura_id: Number(record.fatura_id),
            lancamento_id: Number(record.lancamento_id),
          };
        });

        const lancamentoIds = Array.from(
          new Set(links.map((l) => l.lancamento_id).filter((id) => Number.isFinite(id) && id > 0)),
        );

        if (lancamentoIds.length > 0) {
          const { data: lancRaw, error: lancErr } = await supabase
            .from("credito_conexao_lancamentos")
            .select("id,valor_centavos")
            .in("id", lancamentoIds);

          if (lancErr) {
            return NextResponse.json({ error: lancErr.message }, { status: 500 });
          }

          const lancamentos: LancamentoCartaoRow[] = (lancRaw ?? []).map((row) => {
            const record = row as Record<string, unknown>;
            const valorRaw = Number(record.valor_centavos);
            return {
              id: Number(record.id),
              valor_centavos: Number.isFinite(valorRaw) ? valorRaw : null,
            };
          });

          const valorPorLancamento = new Map<number, number>();
          for (const l of lancamentos) {
            if (Number.isFinite(l.id)) {
              valorPorLancamento.set(l.id, Number(l.valor_centavos ?? 0));
            }
          }

          for (const link of links) {
            const valor = valorPorLancamento.get(link.lancamento_id) ?? 0;
            if (!Number.isFinite(valor)) continue;
            somaPorFatura.set(link.fatura_id, (somaPorFatura.get(link.fatura_id) ?? 0) + valor);
          }
        }
      }

      for (const fatura of faturas) {
        const soma = somaPorFatura.get(fatura.id) ?? 0;
        const valorCentavos =
          Number.isFinite(soma) && soma > 0 ? soma : Number(fatura.valor_total_centavos ?? 0);

        parcelasCartao.push({
          periodo: fatura.periodo_referencia ?? "",
          vencimento: formatDateBR(fatura.data_vencimento ?? null),
          valor: formatBRLFromCentavos(valorCentavos),
          status: fatura.status ?? "",
        });
      }
    }
  }

  contexto.PARCELAS_CARTAO_CONEXAO = parcelasCartao;

  const template = resolveModeloTemplate(modelo as Record<string, unknown>);
  const headerTemplateIdRaw = (modelo as Record<string, unknown>).header_template_id;
  const headerTemplateId = typeof headerTemplateIdRaw === "number" ? headerTemplateIdRaw : Number(headerTemplateIdRaw);
  const footerTemplateIdRaw = (modelo as Record<string, unknown>).footer_template_id;
  const footerTemplateId = typeof footerTemplateIdRaw === "number" ? footerTemplateIdRaw : Number(footerTemplateIdRaw);
  const layoutIdRaw = (modelo as Record<string, unknown>).layout_id;
  const layoutId = typeof layoutIdRaw === "number" ? layoutIdRaw : Number(layoutIdRaw);
  let cabecalhoFinal = (modelo as Record<string, unknown>).cabecalho_html ?? null;
  let rodapeFinal = (modelo as Record<string, unknown>).rodape_html ?? null;

  let headerHtmlFinal: string | null = null;
  let footerHtmlFinal: string | null = null;

  const templateIds = [headerTemplateId, footerTemplateId].filter(
    (id) => Number.isFinite(id) && Number(id) > 0,
  );

  if (templateIds.length > 0) {
    const { data: templates } = await supabase
      .from("documentos_layout_templates")
      .select("layout_template_id,html")
      .in("layout_template_id", templateIds);

    if (templates && Array.isArray(templates)) {
      const byId = new Map<number, string>();
      for (const t of templates as Array<Record<string, unknown>>) {
        const tid = Number(t.layout_template_id);
        if (Number.isFinite(tid) && tid > 0) {
          byId.set(tid, typeof t.html === "string" ? t.html : "");
        }
      }
      if (Number.isFinite(headerTemplateId) && headerTemplateId > 0) {
        headerHtmlFinal = byId.get(headerTemplateId) ?? null;
      }
      if (Number.isFinite(footerTemplateId) && footerTemplateId > 0) {
        footerHtmlFinal = byId.get(footerTemplateId) ?? null;
      }
    }
  }

  if (Number.isFinite(layoutId) && layoutId > 0) {
    const { data: layout } = await supabase
      .from("documentos_layouts")
      .select("cabecalho_html,rodape_html")
      .eq("layout_id", layoutId)
      .maybeSingle();
    if (layout) {
      cabecalhoFinal = (layout as Record<string, unknown>).cabecalho_html ?? cabecalhoFinal;
      rodapeFinal = (layout as Record<string, unknown>).rodape_html ?? rodapeFinal;
    }
  }

  if (!headerHtmlFinal) headerHtmlFinal = cabecalhoFinal;
  if (!footerHtmlFinal) footerHtmlFinal = rodapeFinal;

  const headerHeightValue = Number((modelo as Record<string, unknown>).header_height_px);
  const footerHeightValue = Number((modelo as Record<string, unknown>).footer_height_px);
  const pageMarginValue = Number((modelo as Record<string, unknown>).page_margin_mm);
  const headerHeightPx = Number.isFinite(headerHeightValue) && headerHeightValue > 0 ? headerHeightValue : 120;
  const footerHeightPx = Number.isFinite(footerHeightValue) && footerHeightValue > 0 ? footerHeightValue : 80;
  const pageMarginMm = Number.isFinite(pageMarginValue) && pageMarginValue > 0 ? pageMarginValue : 15;

  const { values: simpleContext, utilizadas: variaveisUtilizadas } = await resolveTemplateValues({
    template,
    variaveisByCodigo,
    contexto,
    supabase,
    rootId: body.matricula_id,
  });
  const collectionCodes = extractCollectionCodes(template);
  const operacaoId = body.matricula_id;
  const operacaoTipoRaw = OPERACAO_TIPOS.MATRICULA;
  let operacaoTipo = normalizeOperacaoTipo(operacaoTipoRaw);
  if (Number.isFinite(body.matricula_id)) {
    operacaoTipo = OPERACAO_TIPOS.MATRICULA;
  }
  const collectionsResolved: Record<string, Array<Record<string, string>>> =
    collectionCodes.length > 0
      ? await resolveCollections({
          operacaoTipo,
          operacaoId,
          colecoes: collectionCodes,
        })
      : {};
  const collectionsResolvedFinal: Record<string, Array<Record<string, string>>> = {
    ...collectionsResolved,
    PARCELAS_CARTAO_CONEXAO: parcelasCartao,
  };
  const colecoesDetectadasSet = new Set<string>(collectionCodes);
  if (parcelasCartao.length > 0) {
    colecoesDetectadasSet.add("PARCELAS_CARTAO_CONEXAO");
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
  const conteudoTemplateLimpo = stripBackgroundStyles(template);
  const conteudoResolvidoLimpo = stripBackgroundStyles(conteudoResolvido);
  const hash = crypto.createHash("sha256").update(conteudoResolvidoLimpo, "utf8").digest("hex");

  const insertPayload = {
    matricula_id: body.matricula_id,
    contrato_modelo_id: documentoModeloId,
    status_assinatura: "PENDENTE",
    conteudo_renderizado_md: conteudoResolvidoLimpo,
    conteudo_template_html: conteudoTemplateLimpo,
    conteudo_resolvido_html: conteudoResolvidoLimpo,
    cabecalho_html: headerHtmlFinal,
    rodape_html: footerHtmlFinal,
    header_html: headerHtmlFinal,
    footer_html: footerHtmlFinal,
    header_height_px: headerHeightPx,
    footer_height_px: footerHeightPx,
    page_margin_mm: pageMarginMm,
    contexto_json: contexto,
    variaveis_utilizadas_json: variaveisUtilizadasFinal,
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

  if (process.env.DOCS_EMIT_DEBUG === "1") {
    console.log("[DOC-EMITIDO][CTX]", {
      documentoEmitidoId: data?.id ?? null,
      operacaoTipo,
      operacaoId,
      colecoesDetectadas,
    });
    console.log(
      "[DOC-EMITIDO][COLECOES]",
      Object.fromEntries(
        Object.entries(collectionsResolvedFinal).map(([k, v]) => [k, Array.isArray(v) ? v.length : 0]),
      ),
    );
    if (colecoesVazias.length > 0) {
      console.log("[DOC-EMITIDO][AVISO] colecoes vazias:", colecoesVazias);
    }
  }

  return NextResponse.json({ data }, { status: 201 });
}
