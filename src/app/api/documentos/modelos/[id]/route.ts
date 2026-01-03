import { NextResponse } from "next/server";
import { getSupabaseServerSSR } from "@/lib/supabaseServerSSR";
import type { DocumentoModeloFormato } from "@/lib/documentos/modelos.types";

type DocumentoModeloUpdatePayload = {
  titulo?: string;
  versao?: string;
  ativo?: boolean;
  tipo_documento_id?: number | null;
  conjunto_grupo_id?: number | null;
  ordem?: number | null;
  layout_id?: number | null;
  texto_modelo_md?: string;
  conteudo_html?: string;
  cabecalho_html?: string | null;
  rodape_html?: string | null;
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
      "id,titulo,versao,ativo,tipo_documento_id,layout_id,formato,texto_modelo_md,conteudo_html,cabecalho_html,rodape_html,placeholders_schema_json,observacoes,created_at,updated_at",
    )
    .eq("id", modeloId)
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 404 });
  }

  const { data: vinculos, error: vincErr } = await supabase
    .from("documentos_conjuntos_grupos_modelos")
    .select(
      "conjunto_grupo_id,ordem,ativo, documentos_conjuntos_grupos:conjunto_grupo_id ( id,codigo,nome,conjunto_id, documentos_conjuntos:conjunto_id ( id,codigo,nome ) )",
    )
    .eq("modelo_id", modeloId)
    .eq("ativo", true)
    .order("ordem", { ascending: true });

  if (vincErr) {
    return NextResponse.json({ error: vincErr.message }, { status: 500 });
  }

  const vinculosOut = (vinculos ?? []).map((v) => {
    const grupo = v.documentos_conjuntos_grupos as
      | { codigo?: string | null; nome?: string | null; documentos_conjuntos?: { codigo?: string | null; nome?: string | null } | null }
      | null
      | undefined;
    return {
      conjunto_grupo_id: v.conjunto_grupo_id,
      ordem: v.ordem,
      grupo_codigo: grupo?.codigo ?? null,
      grupo_nome: grupo?.nome ?? null,
      conjunto_codigo: grupo?.documentos_conjuntos?.codigo ?? null,
      conjunto_nome: grupo?.documentos_conjuntos?.nome ?? null,
    };
  });

  return NextResponse.json({ data: { ...data, vinculos: vinculosOut } }, { status: 200 });
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
  const conjuntoGrupoIdRaw = body.conjunto_grupo_id;
  const conjuntoGrupoId =
    conjuntoGrupoIdRaw === null || conjuntoGrupoIdRaw === undefined || conjuntoGrupoIdRaw === ""
      ? null
      : Number(conjuntoGrupoIdRaw);
  const layoutIdRaw = body.layout_id;
  const layoutId =
    layoutIdRaw === null || layoutIdRaw === undefined || layoutIdRaw === ""
      ? null
      : Number(layoutIdRaw);
  const ordemRaw = body.ordem;
  const ordem =
    ordemRaw === null || ordemRaw === undefined || ordemRaw === "" ? 1 : Number(ordemRaw);
  const formatoBody =
    typeof body.formato !== "undefined" ? normalizeFormato(body.formato) : undefined;
  const wantsHtml = formatoBody === "RICH_HTML" || (formatoBody === undefined && conteudoHtmlRaw !== null);
  const wantsMarkdown = formatoBody === "MARKDOWN";
  const cabecalhoHtml =
    typeof body.cabecalho_html === "string" || body.cabecalho_html === null ? body.cabecalho_html : undefined;
  const rodapeHtml =
    typeof body.rodape_html === "string" || body.rodape_html === null ? body.rodape_html : undefined;

  if (!Number.isFinite(tipoDocumentoId) || tipoDocumentoId <= 0) {
    return NextResponse.json(
      { error: "Tipo de documento e obrigatorio." },
      { status: 400 },
    );
  }

  if (conjuntoGrupoId !== null) {
    if (!Number.isFinite(conjuntoGrupoId) || conjuntoGrupoId <= 0) {
      return NextResponse.json(
        { error: "Grupo invalido para vinculo do modelo." },
        { status: 400 },
      );
    }
    if (!Number.isFinite(ordem) || ordem <= 0) {
      return NextResponse.json(
        { error: "Ordem invalida para vinculo do modelo." },
        { status: 400 },
      );
    }
  }

  if (layoutId !== null) {
    if (!Number.isFinite(layoutId) || layoutId <= 0) {
      return NextResponse.json({ error: "Layout invalido." }, { status: 400 });
    }
  }

  const updatePayload: Record<string, unknown> = {};
  if (typeof body.titulo === "string") updatePayload.titulo = body.titulo;
  if (typeof body.versao === "string") updatePayload.versao = body.versao;
  if (typeof body.ativo === "boolean") updatePayload.ativo = body.ativo;
  updatePayload.tipo_documento_id = tipoDocumentoId;
  if (typeof body.layout_id !== "undefined") updatePayload.layout_id = layoutId;
  if (typeof body.observacoes === "string" || body.observacoes === null) updatePayload.observacoes = body.observacoes;
  if (typeof body.placeholders_schema_json !== "undefined") {
    updatePayload.placeholders_schema_json = body.placeholders_schema_json;
  }
  if (typeof formatoBody !== "undefined") updatePayload.formato = formatoBody;
  if (typeof cabecalhoHtml !== "undefined") updatePayload.cabecalho_html = cabecalhoHtml;
  if (typeof rodapeHtml !== "undefined") updatePayload.rodape_html = rodapeHtml;

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

  if (conjuntoGrupoId !== null) {
    const { error: linkErr } = await supabase
      .from("documentos_conjuntos_grupos_modelos")
      .upsert(
        {
          conjunto_grupo_id: conjuntoGrupoId,
          modelo_id: modeloId,
          ordem,
          ativo: true,
        },
        { onConflict: "conjunto_grupo_id,modelo_id" },
      );

    if (linkErr) {
      return NextResponse.json({ error: linkErr.message }, { status: 500 });
    }
  }

  return NextResponse.json({ data }, { status: 200 });
}
