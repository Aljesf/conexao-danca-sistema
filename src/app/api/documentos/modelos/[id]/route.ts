import { NextResponse } from "next/server";
import { getSupabaseServerSSR } from "@/lib/supabaseServerSSR";
import type { DocumentoModeloFormato } from "@/lib/documentos/modelos.types";

type DocumentoModeloUpdatePayload = {
  titulo?: string;
  versao?: string;
  ativo?: boolean;
  tipo_documento_id?: number | null;
  texto_modelo_md?: string;
  conteudo_html?: string;
  formato?: DocumentoModeloFormato;
  placeholders_schema_json?: unknown;
  observacoes?: string | null;
};

function normalizeFormato(input: unknown): DocumentoModeloFormato {
  return input === "RICH_HTML" ? "RICH_HTML" : "MARKDOWN";
}

function asText(input: unknown): string | null {
  return typeof input === "string" ? input : null;
}

export async function GET(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;

  const supabase = await getSupabaseServerSSR();
  const modeloId = Number(id);

  if (!Number.isFinite(modeloId)) {
    return NextResponse.json({ error: "ID invalido." }, { status: 400 });
  }

  const { data, error } = await supabase
    .from("documentos_modelo")
    .select(
      "id,titulo,versao,ativo,tipo_documento_id,formato,texto_modelo_md,conteudo_html,placeholders_schema_json,observacoes,created_at,updated_at",
    )
    .eq("id", modeloId)
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 404 });
  }

  return NextResponse.json({ data }, { status: 200 });
}

export async function PUT(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;

  const supabase = await getSupabaseServerSSR();
  const modeloId = Number(id);

  if (!Number.isFinite(modeloId)) {
    return NextResponse.json({ error: "ID invalido." }, { status: 400 });
  }

  const body = (await req.json()) as DocumentoModeloUpdatePayload;
  const textoMarkdown = asText(body.texto_modelo_md);
  const conteudoHtmlRaw = asText(body.conteudo_html);
  const tipoDocumentoId = Number(body.tipo_documento_id);
  const formatoBody =
    typeof body.formato !== "undefined" ? normalizeFormato(body.formato) : undefined;
  const wantsHtml = formatoBody === "RICH_HTML" || (formatoBody === undefined && conteudoHtmlRaw !== null);
  const wantsMarkdown = formatoBody === "MARKDOWN";

  if (!Number.isFinite(tipoDocumentoId) || tipoDocumentoId <= 0) {
    return NextResponse.json(
      { error: "Tipo de documento e obrigatorio." },
      { status: 400 },
    );
  }

  const updatePayload: Record<string, unknown> = {};
  if (typeof body.titulo === "string") updatePayload.titulo = body.titulo;
  if (typeof body.versao === "string") updatePayload.versao = body.versao;
  if (typeof body.ativo === "boolean") updatePayload.ativo = body.ativo;
  updatePayload.tipo_documento_id = tipoDocumentoId;
  if (typeof body.observacoes === "string" || body.observacoes === null) updatePayload.observacoes = body.observacoes;
  if (typeof body.placeholders_schema_json !== "undefined") {
    updatePayload.placeholders_schema_json = body.placeholders_schema_json;
  }
  if (typeof formatoBody !== "undefined") updatePayload.formato = formatoBody;

  if (wantsMarkdown) {
    if (!textoMarkdown || !textoMarkdown.trim()) {
      return NextResponse.json(
        { error: "Texto (Markdown) obrigatorio para formato MARKDOWN." },
        { status: 400 },
      );
    }
    updatePayload.texto_modelo_md = textoMarkdown;
    updatePayload.conteudo_html = null;
  } else if (wantsHtml) {
    const html = conteudoHtmlRaw && conteudoHtmlRaw.trim() ? conteudoHtmlRaw : textoMarkdown ?? "";
    if (!html.trim()) {
      return NextResponse.json(
        { error: "Conteudo (HTML) obrigatorio para formato RICH_HTML." },
        { status: 400 },
      );
    }
    updatePayload.formato = "RICH_HTML";
    updatePayload.conteudo_html = html;
    updatePayload.texto_modelo_md = textoMarkdown ?? html;
  } else {
    if (textoMarkdown !== null) updatePayload.texto_modelo_md = textoMarkdown;
    if (conteudoHtmlRaw !== null) updatePayload.conteudo_html = conteudoHtmlRaw;
  }

  const { data, error } = await supabase
    .from("documentos_modelo")
    .update(updatePayload)
    .eq("id", modeloId)
    .select("*")
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ data }, { status: 200 });
}
