import { NextResponse } from "next/server";
import { getSupabaseServerSSR } from "@/lib/supabaseServerSSR";
import type { DocumentoModeloCreatePayload, DocumentoModeloFormato } from "@/lib/documentos/modelos.types";

function normalizeFormato(input: unknown): DocumentoModeloFormato {
  return input === "RICH_HTML" ? "RICH_HTML" : "MARKDOWN";
}

function asText(input: unknown): string {
  return typeof input === "string" ? input : "";
}

export async function GET() {
  const supabase = await getSupabaseServerSSR();

  const { data, error } = await supabase
    .from("documentos_modelo")
    .select(
      "id,titulo,versao,ativo,tipo_documento_id,formato,texto_modelo_md,conteudo_html,cabecalho_html,rodape_html,placeholders_schema_json,observacoes,created_at,updated_at",
    )
    .order("titulo", { ascending: true });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ data }, { status: 200 });
}

export async function POST(req: Request) {
  const supabase = await getSupabaseServerSSR();
  const body = (await req.json()) as DocumentoModeloCreatePayload;

  const formato = normalizeFormato(body.formato);
  const tipoDocumentoId = Number(body.tipo_documento_id);
  const conjuntoGrupoIdRaw = body.conjunto_grupo_id;
  const conjuntoGrupoId =
    conjuntoGrupoIdRaw === null || conjuntoGrupoIdRaw === undefined || conjuntoGrupoIdRaw === ""
      ? null
      : Number(conjuntoGrupoIdRaw);
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
    formato,
    texto_modelo_md: formato === "RICH_HTML" ? conteudoHtml : textoMarkdown,
    conteudo_html: formato === "RICH_HTML" ? conteudoHtml : null,
    cabecalho_html: cabecalhoHtml.trim() ? cabecalhoHtml : null,
    rodape_html: rodapeHtml.trim() ? rodapeHtml : null,
    placeholders_schema_json: body.placeholders_schema_json ?? [],
    observacoes: body.observacoes ?? null,
  };

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
