import { NextResponse, type NextRequest } from "next/server";
import { requireUser } from "@/lib/supabase/api-auth";
import type { DocumentoModeloCreatePayload, DocumentoModeloFormato } from "@/lib/documentos/modelos.types";

function normalizeFormato(input: unknown): DocumentoModeloFormato {
  return input === "RICH_HTML" ? "RICH_HTML" : "MARKDOWN";
}

function asText(input: unknown): string {
  return typeof input === "string" ? input : "";
}

export async function GET(req: NextRequest) {
  const auth = await requireUser(req);
  if (auth instanceof NextResponse) return auth;

  const { supabase } = auth;

  const { data, error } = await supabase
    .from("documentos_modelo")
    .select(
      "id,titulo,versao,ativo,tipo_documento_id,layout_id,header_template_id,footer_template_id,header_height_px,footer_height_px,page_margin_mm,formato,texto_modelo_md,conteudo_html,cabecalho_html,rodape_html,placeholders_schema_json,observacoes,created_at,updated_at",
    )
    .order("titulo", { ascending: true });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ data }, { status: 200 });
}

export async function POST(req: NextRequest) {
  const auth = await requireUser(req);
  if (auth instanceof NextResponse) return auth;

  const { supabase } = auth;
  const body = (await req.json()) as DocumentoModeloCreatePayload;

  const formato = normalizeFormato(body.formato);
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
  const headerTemplateIdRaw = body.header_template_id;
  const headerTemplateId =
    headerTemplateIdRaw === null || headerTemplateIdRaw === undefined || headerTemplateIdRaw === ""
      ? null
      : Number(headerTemplateIdRaw);
  const footerTemplateIdRaw = body.footer_template_id;
  const footerTemplateId =
    footerTemplateIdRaw === null || footerTemplateIdRaw === undefined || footerTemplateIdRaw === ""
      ? null
      : Number(footerTemplateIdRaw);
  const headerHeightRaw = body.header_height_px;
  const headerHeight =
    headerHeightRaw === null || headerHeightRaw === undefined || headerHeightRaw === ""
      ? null
      : Number(headerHeightRaw);
  const footerHeightRaw = body.footer_height_px;
  const footerHeight =
    footerHeightRaw === null || footerHeightRaw === undefined || footerHeightRaw === ""
      ? null
      : Number(footerHeightRaw);
  const pageMarginRaw = body.page_margin_mm;
  const pageMargin =
    pageMarginRaw === null || pageMarginRaw === undefined || pageMarginRaw === ""
      ? null
      : Number(pageMarginRaw);
  const ordemRaw = body.ordem;
  const ordem =
    ordemRaw === null || ordemRaw === undefined || ordemRaw === "" ? 1 : Number(ordemRaw);
  const textoMarkdown = asText(body.texto_modelo_md);
  const conteudoHtmlRaw = asText(body.conteudo_html);
  const cabecalhoHtml = asText(body.cabecalho_html);
  const rodapeHtml = asText(body.rodape_html);
  const conteudoHtml = formato === "RICH_HTML" ? (conteudoHtmlRaw.trim() ? conteudoHtmlRaw : textoMarkdown) : "";

  if (!body?.titulo) {
    return NextResponse.json(
      { error: "Campo obrigatorio: titulo." },
      { status: 400 },
    );
  }

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

  if (headerTemplateId !== null) {
    if (!Number.isFinite(headerTemplateId) || headerTemplateId <= 0) {
      return NextResponse.json({ error: "Header template invalido." }, { status: 400 });
    }
  }

  if (footerTemplateId !== null) {
    if (!Number.isFinite(footerTemplateId) || footerTemplateId <= 0) {
      return NextResponse.json({ error: "Footer template invalido." }, { status: 400 });
    }
  }

  if (headerHeight !== null) {
    if (!Number.isFinite(headerHeight) || headerHeight <= 0) {
      return NextResponse.json({ error: "Altura do header invalida." }, { status: 400 });
    }
  }

  if (footerHeight !== null) {
    if (!Number.isFinite(footerHeight) || footerHeight <= 0) {
      return NextResponse.json({ error: "Altura do footer invalida." }, { status: 400 });
    }
  }

  if (pageMargin !== null) {
    if (!Number.isFinite(pageMargin) || pageMargin <= 0) {
      return NextResponse.json({ error: "Margem de pagina invalida." }, { status: 400 });
    }
  }

  if (formato === "MARKDOWN" && !textoMarkdown.trim()) {
    return NextResponse.json(
      { error: "Texto (Markdown) obrigatorio para formato MARKDOWN." },
      { status: 400 },
    );
  }

  if (formato === "RICH_HTML" && !conteudoHtml.trim()) {
    return NextResponse.json(
      { error: "Conteudo (HTML) obrigatorio para formato RICH_HTML." },
      { status: 400 },
    );
  }

  const insertPayload = {
    titulo: body.titulo,
    versao: body.versao ?? "v1.0",
    ativo: body.ativo ?? true,
    tipo_documento_id: tipoDocumentoId,
    layout_id: layoutId,
    header_template_id: headerTemplateId,
    footer_template_id: footerTemplateId,
    formato,
    texto_modelo_md: formato === "RICH_HTML" ? conteudoHtml : textoMarkdown,
    conteudo_html: formato === "RICH_HTML" ? conteudoHtml : null,
    cabecalho_html: cabecalhoHtml.trim() ? cabecalhoHtml : null,
    rodape_html: rodapeHtml.trim() ? rodapeHtml : null,
    placeholders_schema_json: body.placeholders_schema_json ?? [],
    observacoes: body.observacoes ?? null,
  };

  if (headerHeight !== null) insertPayload.header_height_px = headerHeight;
  if (footerHeight !== null) insertPayload.footer_height_px = footerHeight;
  if (pageMargin !== null) insertPayload.page_margin_mm = pageMargin;

  const { data, error } = await supabase
    .from("documentos_modelo")
    .insert(insertPayload)
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
          modelo_id: data.id,
          ordem,
          ativo: true,
        },
        { onConflict: "conjunto_grupo_id,modelo_id" },
      );

    if (linkErr) {
      return NextResponse.json({ error: linkErr.message }, { status: 500 });
    }
  }

  return NextResponse.json({ data }, { status: 201 });
}

