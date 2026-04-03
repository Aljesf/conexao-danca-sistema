import crypto from "crypto";
import type { SupabaseClient } from "@supabase/supabase-js";
import { buildDocumentoEmitidoPdfUrl } from "@/lib/documentos/core/documento-emitido-utils";
import { montarLayoutDocumental } from "@/lib/documentos/core/montar-layout-documental";
import {
  resolverModeloPorOperacao,
  resolverModeloPorId,
  type DocumentoOperacaoResolvida,
  type ModeloPorOperacaoResolvido,
} from "@/lib/documentos/core/resolver-modelo-por-operacao";
import {
  montarReciboPorRecebimento,
  type MontagemReciboPorRecebimento,
} from "@/lib/documentos/recibos/montar-recibo-por-recebimento";

type PreviewModeloResumo = {
  id: number;
  titulo: string | null;
  cabecalho_id: number | null;
  rodape_id: number | null;
  operacao_id: number | null;
};

export type PreviewReciboDocumento = {
  snapshot: MontagemReciboPorRecebimento["snapshot"];
  variaveis: MontagemReciboPorRecebimento["variaveis"];
  variaveisAgrupadas: MontagemReciboPorRecebimento["variaveisAgrupadas"];
  conteudoTemplate: string;
  conteudoResolvido: string;
  cabecalhoHtml: string | null;
  rodapeHtml: string | null;
  htmlPreview: string;
  modelo: PreviewModeloResumo;
  operacao: DocumentoOperacaoResolvida;
  metadadosRenderizacao: ReturnType<typeof montarLayoutDocumental>["metadadosRenderizacao"] & {
    fallbackModelo: ModeloPorOperacaoResolvido["metadadosFallback"];
  };
};

type PipelineReciboPorRecebimento = {
  montagem: MontagemReciboPorRecebimento;
  resolucaoModelo: ModeloPorOperacaoResolvido;
  conteudoTemplate: string;
  layout: ReturnType<typeof montarLayoutDocumental>;
};

function resolveModeloTemplate(modelo: ModeloPorOperacaoResolvido["modelo"]): string {
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

function buildPreview(
  pipeline: PipelineReciboPorRecebimento,
): PreviewReciboDocumento {
  const { montagem, resolucaoModelo, conteudoTemplate, layout } = pipeline;

  return {
    snapshot: montagem.snapshot,
    variaveis: montagem.variaveis,
    variaveisAgrupadas: montagem.variaveisAgrupadas,
    conteudoTemplate,
    conteudoResolvido: layout.htmlCorpo,
    cabecalhoHtml: layout.htmlCabecalho,
    rodapeHtml: layout.htmlRodape,
    htmlPreview: layout.htmlFinal,
    modelo: {
      id: resolucaoModelo.modelo.id,
      titulo: resolucaoModelo.modelo.titulo,
      cabecalho_id: resolucaoModelo.modelo.cabecalho_id,
      rodape_id: resolucaoModelo.modelo.rodape_id,
      operacao_id: resolucaoModelo.modelo.operacao_id,
    },
    operacao: resolucaoModelo.operacao,
    metadadosRenderizacao: {
      ...layout.metadadosRenderizacao,
      fallbackModelo: resolucaoModelo.metadadosFallback,
    },
  };
}

async function prepararReciboPorRecebimento(params: {
  supabase: SupabaseClient;
  recebimentoId: number;
  operadorUserId: string | null;
  modeloId?: number;
}): Promise<PipelineReciboPorRecebimento> {
  const { supabase, recebimentoId, operadorUserId, modeloId } = params;

  const montagem = await montarReciboPorRecebimento({
    supabase,
    recebimentoId,
    operadorUserId,
  });

  const resolucaoModelo = modeloId
    ? await resolverModeloPorId({ supabase, modeloId })
    : await resolverModeloPorOperacao({
        supabase,
        operacaoCodigo: "RECIBO_PAGAMENTO_CONFIRMADO",
      });

  const conteudoTemplate = resolveModeloTemplate(resolucaoModelo.modelo);
  const layout = montarLayoutDocumental({
    tituloDocumento:
      resolucaoModelo.modelo.titulo?.trim() || `Recibo ${montagem.snapshot.recibo_numero}`,
    modelo: resolucaoModelo.modelo,
    cabecalho: resolucaoModelo.cabecalho,
    rodape: resolucaoModelo.rodape,
    html_corpo: conteudoTemplate,
    variaveis_resolvidas: montagem.variaveis,
  });

  return {
    montagem,
    resolucaoModelo,
    conteudoTemplate,
    layout,
  };
}

export async function gerarPreviewReciboPorRecebimento(params: {
  supabase: SupabaseClient;
  recebimentoId: number;
  operadorUserId: string | null;
  modeloId?: number;
}): Promise<PreviewReciboDocumento> {
  const pipeline = await prepararReciboPorRecebimento(params);
  return buildPreview(pipeline);
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
  const pipeline = await prepararReciboPorRecebimento({
    supabase,
    recebimentoId,
    operadorUserId,
  });
  const preview = buildPreview(pipeline);

  if (!preview.snapshot.matricula_id) {
    throw new Error("matricula_nao_resolvida");
  }
  if (!preview.snapshot.pessoa_id) {
    throw new Error("pessoa_nao_resolvida");
  }

  try {
    const { data: existente } = await supabase
      .from("documentos_emitidos")
      .select("id")
      .eq("recebimento_id", recebimentoId)
      .eq("origem_tipo", "RECEBIMENTO")
      .eq("origem_id", String(recebimentoId))
      .order("id", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (existente?.id) {
      const pdfUrlExistente = buildDocumentoEmitidoPdfUrl(Number(existente.id));
      await supabase
        .from("documentos_emitidos")
        .update({
          pdf_url: pdfUrlExistente,
          updated_at: new Date().toISOString(),
        })
        .eq("id", Number(existente.id));

      return {
        documentoEmitidoId: Number(existente.id),
        preview,
        idempotent: true,
      };
    }
  } catch {
    // Compatibilidade com ambientes parcialmente migrados.
  }

  const hash = crypto.createHash("sha256").update(preview.htmlPreview, "utf8").digest("hex");
  const contextoBase: Record<string, unknown> = {
    origem: "RECIBO_PAGAMENTO_CONFIRMADO",
    operacao_codigo: preview.operacao.codigo,
    operacao_id: preview.operacao.id,
    origem_tipo: "RECEBIMENTO",
    origem_id: String(recebimentoId),
    tipo_recibo: preview.snapshot.tipo_recibo,
    recebimento_id: preview.snapshot.recebimento_id,
    cobranca_id: preview.snapshot.cobranca_id,
    variaveis_recibo: preview.variaveis,
    variaveis_recibo_agrupadas: preview.variaveisAgrupadas,
    snapshot_financeiro: preview.snapshot,
    renderizacao: {
      html_final: preview.htmlPreview,
      metadados: preview.metadadosRenderizacao,
    },
  };

  const variaveisPersistidas: Record<string, unknown> = {
    ...preview.variaveis,
    __grupos: preview.variaveisAgrupadas,
    __operacao_codigo: preview.operacao.codigo,
  };

  const insertPayload: Record<string, unknown> = {
    matricula_id: preview.snapshot.matricula_id,
    contrato_modelo_id: preview.modelo.id,
    operacao_id: preview.operacao.id,
    origem_tipo: "RECEBIMENTO",
    origem_id: String(recebimentoId),
    tipo_relacao_documental: "ORIGINAL",
    status_assinatura: "RASCUNHO",
    conteudo_renderizado_md: preview.conteudoResolvido,
    conteudo_template_html: preview.conteudoTemplate,
    conteudo_resolvido_html: preview.conteudoResolvido,
    cabecalho_html: preview.cabecalhoHtml,
    rodape_html: preview.rodapeHtml,
    header_html: preview.cabecalhoHtml,
    footer_html: preview.rodapeHtml,
    header_height_px: preview.metadadosRenderizacao.headerHeightPx,
    footer_height_px: preview.metadadosRenderizacao.footerHeightPx,
    page_margin_mm: preview.metadadosRenderizacao.pageMarginMm,
    contexto_json: contextoBase,
    variaveis_utilizadas_json: variaveisPersistidas,
    snapshot_financeiro_json: preview.snapshot,
    hash_conteudo: hash,
    created_by: operadorUserId,
    recebimento_id: preview.snapshot.recebimento_id,
  };

  const insertPayloadCompat: Record<string, unknown> = { ...insertPayload };
  let insert = await supabase.from("documentos_emitidos").insert(insertPayloadCompat).select("id").maybeSingle();

  for (const optionalColumn of [
    "operacao_id",
    "origem_tipo",
    "origem_id",
    "tipo_relacao_documental",
    "recebimento_id",
  ]) {
    if (insert.error && isColumnMissingError(insert.error, optionalColumn)) {
      delete insertPayloadCompat[optionalColumn];
      insert = await supabase.from("documentos_emitidos").insert(insertPayloadCompat).select("id").maybeSingle();
    }
  }

  if (
    insert.error &&
    (String(insert.error.code ?? "") === "23514" ||
      String(insert.error.message ?? "").toLowerCase().includes("status_assinatura"))
  ) {
    insert = await supabase
      .from("documentos_emitidos")
      .insert({ ...insertPayloadCompat, status_assinatura: "PENDENTE" })
      .select("id")
      .maybeSingle();
  }

  if (insert.error || !insert.data?.id) {
    throw new Error(`falha_persistir_recibo:${insert.error?.message ?? "desconhecida"}`);
  }

  const documentoEmitidoId = Number(insert.data.id);
  const pdfUrl = buildDocumentoEmitidoPdfUrl(documentoEmitidoId);
  await supabase
    .from("documentos_emitidos")
    .update({
      pdf_url: pdfUrl,
      updated_at: new Date().toISOString(),
    })
    .eq("id", documentoEmitidoId);

  return {
    documentoEmitidoId,
    preview,
    idempotent: false,
  };
}
