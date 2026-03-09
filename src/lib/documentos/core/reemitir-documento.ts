import type { SupabaseClient } from "@supabase/supabase-js";
import {
  buildDocumentoEmitidoPdfUrl,
  computeConteudoHash,
  resolveConteudoPersistidoEmitido,
  type DocumentoEmitidoRecord,
  type TipoRelacaoDocumental,
} from "@/lib/documentos/core/documento-emitido-utils";

type ReemissaoPermitida = Extract<TipoRelacaoDocumental, "REEMISSAO" | "SUBSTITUICAO">;

export type ReemissaoDocumentoResult = {
  documentoEmitidoIdOriginal: number;
  novoDocumentoEmitidoId: number;
  tipoRelacaoDocumental: ReemissaoPermitida;
  motivoReemissao: string;
  pdfDisponivel: boolean;
  documentoUrl: string;
  pdfUrl: string;
};

function isMissingColumnError(error: unknown, columnName: string): boolean {
  const message =
    error && typeof error === "object" && "message" in error ? String((error as { message?: unknown }).message ?? "") : "";
  return message.toLowerCase().includes(columnName.toLowerCase()) && message.toLowerCase().includes("column");
}

function normalizeMotivo(value: string): string {
  return value.trim();
}

async function loadDocumentoOriginal(
  supabase: SupabaseClient,
  documentoEmitidoId: number,
): Promise<DocumentoEmitidoRecord> {
  const { data, error } = await supabase
    .from("documentos_emitidos")
    .select("*")
    .eq("id", documentoEmitidoId)
    .single();

  if (error || !data) {
    throw new Error("documento_emitido_nao_encontrado");
  }

  return data as DocumentoEmitidoRecord;
}

export async function reemitirDocumento(params: {
  supabase: SupabaseClient;
  documentoEmitidoId: number;
  motivoReemissao: string;
  tipoRelacaoDocumental: ReemissaoPermitida;
  usuarioResponsavelId: string | null;
}): Promise<ReemissaoDocumentoResult> {
  const motivoReemissao = normalizeMotivo(params.motivoReemissao);
  if (!motivoReemissao) {
    throw new Error("motivo_reemissao_obrigatorio");
  }

  const original = await loadDocumentoOriginal(params.supabase, params.documentoEmitidoId);
  const conteudoOficial = resolveConteudoPersistidoEmitido(original);
  const modeloId = Number(original.documento_modelo_id ?? original.contrato_modelo_id ?? 0);

  if (!Number.isFinite(modeloId) || modeloId <= 0) {
    throw new Error("modelo_documental_nao_encontrado");
  }

  if (!original.matricula_id || original.matricula_id <= 0) {
    throw new Error("matricula_documental_nao_encontrada");
  }

  const insertPayload: Record<string, unknown> = {
    matricula_id: original.matricula_id,
    contrato_modelo_id: modeloId,
    operacao_id: original.operacao_id ?? null,
    origem_tipo: original.origem_tipo ?? null,
    origem_id: original.origem_id ?? null,
    documento_origem_id: original.id,
    motivo_reemissao: motivoReemissao,
    tipo_relacao_documental: params.tipoRelacaoDocumental,
    status_assinatura: "RASCUNHO",
    conteudo_renderizado_md: conteudoOficial.html,
    conteudo_template_html: original.conteudo_template_html ?? null,
    conteudo_resolvido_html: conteudoOficial.html,
    cabecalho_html: original.cabecalho_html ?? null,
    rodape_html: original.rodape_html ?? null,
    header_html: original.header_html ?? original.cabecalho_html ?? null,
    footer_html: original.footer_html ?? original.rodape_html ?? null,
    header_height_px: original.header_height_px ?? 120,
    footer_height_px: original.footer_height_px ?? 80,
    page_margin_mm: original.page_margin_mm ?? 10,
    contexto_json: original.contexto_json ?? null,
    variaveis_utilizadas_json: original.variaveis_utilizadas_json ?? {},
    snapshot_financeiro_json: original.snapshot_financeiro_json ?? {},
    documento_conjunto_id: original.documento_conjunto_id ?? null,
    documento_grupo_id: original.documento_grupo_id ?? null,
    editado_manual: original.editado_manual ?? false,
    created_by: params.usuarioResponsavelId,
    hash_conteudo: computeConteudoHash(conteudoOficial.html),
  };

  const insertPayloadCompat: Record<string, unknown> = { ...insertPayload };
  let insert = await params.supabase.from("documentos_emitidos").insert(insertPayloadCompat).select("id").maybeSingle();

  for (const optionalColumn of [
    "operacao_id",
    "origem_tipo",
    "origem_id",
    "documento_origem_id",
    "motivo_reemissao",
    "tipo_relacao_documental",
  ]) {
    if (insert.error && isMissingColumnError(insert.error, optionalColumn)) {
      delete insertPayloadCompat[optionalColumn];
      insert = await params.supabase.from("documentos_emitidos").insert(insertPayloadCompat).select("id").maybeSingle();
    }
  }

  if (
    insert.error &&
    (String(insert.error.code ?? "") === "23514" ||
      String(insert.error.message ?? "").toLowerCase().includes("status_assinatura"))
  ) {
    insert = await params.supabase
      .from("documentos_emitidos")
      .insert({ ...insertPayloadCompat, status_assinatura: "PENDENTE" })
      .select("id")
      .maybeSingle();
  }

  if (insert.error || !insert.data?.id) {
    throw new Error(`falha_reemitir_documento:${insert.error?.message ?? "desconhecida"}`);
  }

  const novoDocumentoEmitidoId = Number(insert.data.id);
  const pdfUrl = buildDocumentoEmitidoPdfUrl(novoDocumentoEmitidoId);

  await params.supabase
    .from("documentos_emitidos")
    .update({
      pdf_url: pdfUrl,
      updated_at: new Date().toISOString(),
    })
    .eq("id", novoDocumentoEmitidoId);

  return {
    documentoEmitidoIdOriginal: original.id,
    novoDocumentoEmitidoId,
    tipoRelacaoDocumental: params.tipoRelacaoDocumental,
    motivoReemissao,
    pdfDisponivel: true,
    documentoUrl: `/admin/config/documentos/emitidos/${novoDocumentoEmitidoId}`,
    pdfUrl,
  };
}
