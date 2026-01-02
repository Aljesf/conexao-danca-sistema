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
    .select("*")
    .order("tipo_contrato", { ascending: true })
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
  const textoMarkdown = asText(body.texto_modelo_md);
  const conteudoHtmlRaw = asText(body.conteudo_html);
  const conteudoHtml = formato === "RICH_HTML" ? (conteudoHtmlRaw.trim() ? conteudoHtmlRaw : textoMarkdown) : "";

  if (!body?.tipo_contrato || !body?.titulo) {
    return NextResponse.json(
      { error: "Campos obrigatorios: tipo_contrato, titulo." },
      { status: 400 },
    );
  }

  if (!Number.isFinite(tipoDocumentoId) || tipoDocumentoId <= 0) {
    return NextResponse.json(
      { error: "Tipo de documento e obrigatorio." },
      { status: 400 },
    );
  }

  if (conjuntoGrupoId !== null && (!Number.isFinite(conjuntoGrupoId) || conjuntoGrupoId <= 0)) {
    return NextResponse.json(
      { error: "Grupo do conjunto invalido." },
      { status: 400 },
    );
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
    tipo_contrato: body.tipo_contrato,
    titulo: body.titulo,
    versao: body.versao ?? "v1.0",
    ativo: body.ativo ?? true,
    tipo_documento_id: tipoDocumentoId,
    conjunto_grupo_id: conjuntoGrupoId,
    formato,
    texto_modelo_md: formato === "RICH_HTML" ? conteudoHtml : textoMarkdown,
    conteudo_html: formato === "RICH_HTML" ? conteudoHtml : null,
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

  return NextResponse.json({ data }, { status: 201 });
}
