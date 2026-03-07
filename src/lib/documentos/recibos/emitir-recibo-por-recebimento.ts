import crypto from "crypto";
import type { SupabaseClient } from "@supabase/supabase-js";
import { stripBackgroundStyles } from "@/lib/documentos/sanitizeHtml";
import { renderTemplateHtml } from "@/lib/documentos/templateRenderer";
import { montarReciboPorRecebimento } from "@/lib/documentos/recibos/montar-recibo-por-recebimento";

type ModeloReciboRow = {
  id: number;
  titulo: string | null;
  formato: string | null;
  conteudo_html: string | null;
  texto_modelo_md: string | null;
  cabecalho_html: string | null;
  rodape_html: string | null;
  layout_id: number | null;
  header_template_id: number | null;
  footer_template_id: number | null;
  header_height_px: number | null;
  footer_height_px: number | null;
  page_margin_mm: number | null;
};

export type PreviewReciboDocumento = {
  snapshot: Awaited<ReturnType<typeof montarReciboPorRecebimento>>["snapshot"];
  variaveis: Awaited<ReturnType<typeof montarReciboPorRecebimento>>["variaveis"];
  conteudoTemplate: string;
  conteudoResolvido: string;
  cabecalhoHtml: string | null;
  rodapeHtml: string | null;
  modelo: {
    id: number;
    titulo: string | null;
  };
};

function resolveModeloTemplate(modelo: ModeloReciboRow): string {
  if (modelo.formato === "RICH_HTML" && modelo.conteudo_html?.trim()) {
    return modelo.conteudo_html;
  }
  return modelo.texto_modelo_md ?? "";
}

function isColumnMissingError(error: unknown, columnName: string): boolean {
  const message =
    error && typeof error === "object" && "message" in error ? String((error as { message?: unknown }).message ?? "") : "";
  return message.toLowerCase().includes(columnName.toLowerCase()) && message.toLowerCase().includes("column");
}

async function carregarModeloReciboAtivo(supabase: SupabaseClient): Promise<ModeloReciboRow> {
  const campos =
    "id,titulo,formato,conteudo_html,texto_modelo_md,cabecalho_html,rodape_html,layout_id,header_template_id,footer_template_id,header_height_px,footer_height_px,page_margin_mm";

  const { data: modeloByCodigo, error: modeloByCodigoError } = await supabase
    .from("documentos_modelo")
    .select(campos)
    .ilike("observacoes", "%RECIBO_MENSALIDADE%")
    .eq("ativo", true)
    .order("id", { ascending: false })
    .limit(1)
    .maybeSingle<ModeloReciboRow>();

  if (!modeloByCodigoError && modeloByCodigo) {
    return modeloByCodigo;
  }

  const { data: modeloByTitulo, error: modeloByTituloError } = await supabase
    .from("documentos_modelo")
    .select(campos)
    .ilike("titulo", "%Recibo%")
    .eq("ativo", true)
    .order("id", { ascending: false })
    .limit(1)
    .maybeSingle<ModeloReciboRow>();

  if (modeloByTituloError || !modeloByTitulo) {
    throw new Error("modelo_recibo_nao_encontrado");
  }

  return modeloByTitulo;
}

async function resolverCabecalhoRodape(
  supabase: SupabaseClient,
  modelo: ModeloReciboRow,
): Promise<{
  cabecalhoHtml: string | null;
  rodapeHtml: string | null;
  headerHeightPx: number;
  footerHeightPx: number;
  pageMarginMm: number;
}> {
  let cabecalhoFinal = modelo.cabecalho_html;
  let rodapeFinal = modelo.rodape_html;
  let headerHtmlFinal: string | null = null;
  let footerHtmlFinal: string | null = null;

  const templateIds = [modelo.header_template_id, modelo.footer_template_id].filter(
    (id): id is number => Number.isFinite(id) && Number(id) > 0,
  );

  if (templateIds.length > 0) {
    const { data: templates } = await supabase
      .from("documentos_layout_templates")
      .select("layout_template_id,html")
      .in("layout_template_id", templateIds);

    if (Array.isArray(templates)) {
      const byId = new Map<number, string>();
      for (const template of templates as Array<Record<string, unknown>>) {
        const id = Number(template.layout_template_id);
        if (Number.isFinite(id) && id > 0) {
          byId.set(id, typeof template.html === "string" ? template.html : "");
        }
      }

      if (modelo.header_template_id) {
        headerHtmlFinal = byId.get(modelo.header_template_id) ?? null;
      }
      if (modelo.footer_template_id) {
        footerHtmlFinal = byId.get(modelo.footer_template_id) ?? null;
      }
    }
  }

  if (modelo.layout_id) {
    const { data: layout } = await supabase
      .from("documentos_layouts")
      .select("cabecalho_html,rodape_html")
      .eq("layout_id", modelo.layout_id)
      .maybeSingle();

    if (layout && typeof layout === "object") {
      cabecalhoFinal = (layout as Record<string, unknown>).cabecalho_html as string | null;
      rodapeFinal = (layout as Record<string, unknown>).rodape_html as string | null;
    }
  }

  return {
    cabecalhoHtml: headerHtmlFinal ?? cabecalhoFinal ?? null,
    rodapeHtml: footerHtmlFinal ?? rodapeFinal ?? null,
    headerHeightPx:
      Number.isFinite(modelo.header_height_px) && Number(modelo.header_height_px) > 0
        ? Number(modelo.header_height_px)
        : 120,
    footerHeightPx:
      Number.isFinite(modelo.footer_height_px) && Number(modelo.footer_height_px) > 0
        ? Number(modelo.footer_height_px)
        : 80,
    pageMarginMm:
      Number.isFinite(modelo.page_margin_mm) && Number(modelo.page_margin_mm) > 0
        ? Number(modelo.page_margin_mm)
        : 15,
  };
}

export async function gerarPreviewReciboPorRecebimento(params: {
  supabase: SupabaseClient;
  recebimentoId: number;
  operadorUserId: string | null;
}): Promise<PreviewReciboDocumento> {
  const { supabase, recebimentoId, operadorUserId } = params;
  const montagem = await montarReciboPorRecebimento({
    supabase,
    recebimentoId,
    operadorUserId,
  });

  const modelo = await carregarModeloReciboAtivo(supabase);
  const template = resolveModeloTemplate(modelo);
  const conteudoTemplate = stripBackgroundStyles(template);
  const conteudoResolvido = stripBackgroundStyles(renderTemplateHtml(template, montagem.variaveis));
  const layout = await resolverCabecalhoRodape(supabase, modelo);

  return {
    snapshot: montagem.snapshot,
    variaveis: montagem.variaveis,
    conteudoTemplate,
    conteudoResolvido,
    cabecalhoHtml: layout.cabecalhoHtml,
    rodapeHtml: layout.rodapeHtml,
    modelo: {
      id: modelo.id,
      titulo: modelo.titulo,
    },
  };
}

export async function emitirReciboPorRecebimento(params: {
  supabase: SupabaseClient;
  recebimentoId: number;
  operadorUserId: string | null;
}): Promise<{
  documentoEmitidoId: number;
  preview: PreviewReciboDocumento;
  idempotent: boolean;
}> {
  const { supabase, recebimentoId, operadorUserId } = params;
  const preview = await gerarPreviewReciboPorRecebimento({
    supabase,
    recebimentoId,
    operadorUserId,
  });

  if (!preview.snapshot.matricula_id) {
    throw new Error("matricula_nao_resolvida");
  }
  if (!preview.snapshot.pessoa_id) {
    throw new Error("pessoa_nao_resolvida");
  }

  const layout = await resolverCabecalhoRodape(
    supabase,
    await carregarModeloReciboAtivo(supabase),
  );

  try {
    const { data: existente, error: existenteError } = await supabase
      .from("documentos_emitidos")
      .select("id")
      .eq("recebimento_id", recebimentoId)
      .order("id", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (!existenteError && existente?.id) {
      return {
        documentoEmitidoId: Number(existente.id),
        preview,
        idempotent: true,
      };
    }
  } catch {
    // Compatibilidade com ambientes onde a migration ainda nao foi aplicada.
  }

  const hash = crypto.createHash("sha256").update(preview.conteudoResolvido, "utf8").digest("hex");
  const contextoBase: Record<string, unknown> = {
    origem: "RECIBO_PAGAMENTO_CONFIRMADO",
    tipo_recibo: preview.snapshot.tipo_recibo,
    recebimento_id: preview.snapshot.recebimento_id,
    cobranca_id: preview.snapshot.cobranca_id,
    variaveis_recibo: preview.variaveis,
    snapshot_financeiro: preview.snapshot,
  };

  const insertPayload: Record<string, unknown> = {
    matricula_id: preview.snapshot.matricula_id,
    contrato_modelo_id: preview.modelo.id,
    status_assinatura: "RASCUNHO",
    conteudo_renderizado_md: preview.conteudoResolvido,
    conteudo_template_html: preview.conteudoTemplate,
    conteudo_resolvido_html: preview.conteudoResolvido,
    cabecalho_html: layout.cabecalhoHtml,
    rodape_html: layout.rodapeHtml,
    header_html: layout.cabecalhoHtml,
    footer_html: layout.rodapeHtml,
    header_height_px: layout.headerHeightPx,
    footer_height_px: layout.footerHeightPx,
    page_margin_mm: layout.pageMarginMm,
    contexto_json: contextoBase,
    variaveis_utilizadas_json: preview.variaveis,
    snapshot_financeiro_json: preview.snapshot,
    hash_conteudo: hash,
    created_by: operadorUserId,
    recebimento_id: preview.snapshot.recebimento_id,
  };

  let insert = await supabase.from("documentos_emitidos").insert(insertPayload).select("id").maybeSingle();

  if (insert.error && isColumnMissingError(insert.error, "recebimento_id")) {
    const fallbackPayload = { ...insertPayload };
    delete fallbackPayload.recebimento_id;
    insert = await supabase.from("documentos_emitidos").insert(fallbackPayload).select("id").maybeSingle();
  }

  if (
    insert.error &&
    (String(insert.error.code ?? "") === "23514" ||
      String(insert.error.message ?? "").toLowerCase().includes("status_assinatura"))
  ) {
    insert = await supabase
      .from("documentos_emitidos")
      .insert({ ...insertPayload, status_assinatura: "PENDENTE" })
      .select("id")
      .maybeSingle();
  }

  if (insert.error || !insert.data?.id) {
    throw new Error(`falha_persistir_recibo:${insert.error?.message ?? "desconhecida"}`);
  }

  return {
    documentoEmitidoId: Number(insert.data.id),
    preview,
    idempotent: false,
  };
}
