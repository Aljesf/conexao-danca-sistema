import type { SupabaseClient } from "@supabase/supabase-js";

type DocumentoTipoRow = {
  tipo_documento_id: number;
  codigo: string | null;
  nome: string | null;
};

export type DocumentoOperacaoResolvida = {
  id: number;
  codigo: string;
  nome: string;
  descricao: string | null;
  tipo_documento_id: number | null;
  tipo_documento_codigo: string | null;
  tipo_documento_nome: string | null;
  ativo: boolean;
  exige_origem: boolean;
  permite_reemissao: boolean;
};

export type DocumentoModeloResolvido = {
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
  operacao_id: number | null;
  cabecalho_id: number | null;
  rodape_id: number | null;
  tipo_documento_id: number | null;
};

type DocumentoComponenteRow = {
  id: number;
  codigo: string;
  nome: string;
  descricao: string | null;
  html_template: string;
  css_template: string | null;
  config_json: Record<string, unknown> | null;
  layout_template_id: number | null;
  ativo: boolean;
};

type DocumentoLayoutTemplateRow = {
  layout_template_id: number;
  html: string;
  height_px: number | null;
};

type DocumentoLayoutRow = {
  layout_id: number;
  cabecalho_html: string | null;
  rodape_html: string | null;
};

export type DocumentoParteResolvida = {
  id: number | null;
  codigo: string | null;
  nome: string | null;
  html: string | null;
  css: string | null;
  configJson: Record<string, unknown> | null;
  layoutTemplateId: number | null;
  legacyTemplateId: number | null;
  heightPx: number | null;
  source:
    | "SEMANTICO"
    | "SEMANTICO_LAYOUT_TEMPLATE"
    | "LEGADO_TEMPLATE"
    | "LEGADO_LAYOUT"
    | "MODELO_INLINE"
    | "AUSENTE";
};

export type ModeloPorOperacaoResolvido = {
  operacao: DocumentoOperacaoResolvida;
  modelo: DocumentoModeloResolvido;
  cabecalho: DocumentoParteResolvida | null;
  rodape: DocumentoParteResolvida | null;
  metadadosFallback: {
    tipoDocumentoCodigoSolicitado: string | null;
    usouCabecalhoSemantico: boolean;
    usouRodapeSemantico: boolean;
    usouHeaderTemplateLegado: boolean;
    usouFooterTemplateLegado: boolean;
    usouLayoutLegado: boolean;
    usouCabecalhoInlineModelo: boolean;
    usouRodapeInlineModelo: boolean;
  };
};

function normalizarTipoDocumentoCodigo(value: string | null | undefined): string | null {
  const normalized = String(value ?? "").trim().toUpperCase();
  return normalized || null;
}

function normalizarNumber(value: unknown): number | null {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
}

async function carregarTipoDocumento(
  supabase: SupabaseClient,
  tipoDocumentoId: number | null,
): Promise<DocumentoTipoRow | null> {
  if (!tipoDocumentoId) return null;
  const { data } = await supabase
    .from("documentos_tipos")
    .select("tipo_documento_id,codigo,nome")
    .eq("tipo_documento_id", tipoDocumentoId)
    .maybeSingle<DocumentoTipoRow>();
  return data ?? null;
}

async function carregarTipoDocumentoPorCodigo(
  supabase: SupabaseClient,
  tipoDocumentoCodigo: string,
): Promise<DocumentoTipoRow | null> {
  const { data } = await supabase
    .from("documentos_tipos")
    .select("tipo_documento_id,codigo,nome")
    .eq("codigo", tipoDocumentoCodigo)
    .maybeSingle<DocumentoTipoRow>();
  return data ?? null;
}

async function carregarTemplateLayout(
  supabase: SupabaseClient,
  templateId: number | null,
): Promise<DocumentoLayoutTemplateRow | null> {
  if (!templateId) return null;
  const { data } = await supabase
    .from("documentos_layout_templates")
    .select("layout_template_id,html,height_px")
    .eq("layout_template_id", templateId)
    .maybeSingle<DocumentoLayoutTemplateRow>();
  return data ?? null;
}

async function carregarLayoutLegado(
  supabase: SupabaseClient,
  layoutId: number | null,
): Promise<DocumentoLayoutRow | null> {
  if (!layoutId) return null;
  const { data } = await supabase
    .from("documentos_layouts")
    .select("layout_id,cabecalho_html,rodape_html")
    .eq("layout_id", layoutId)
    .maybeSingle<DocumentoLayoutRow>();
  return data ?? null;
}

async function carregarCabecalhoSemantico(
  supabase: SupabaseClient,
  cabecalhoId: number | null,
): Promise<DocumentoParteResolvida | null> {
  if (!cabecalhoId) return null;

  const { data } = await supabase
    .from("documentos_cabecalhos")
    .select("id,codigo,nome,descricao,html_template,css_template,config_json,layout_template_id,ativo")
    .eq("id", cabecalhoId)
    .eq("ativo", true)
    .maybeSingle<DocumentoComponenteRow>();

  if (!data) return null;

  const template = await carregarTemplateLayout(supabase, normalizarNumber(data.layout_template_id));
  const htmlTemplate = typeof data.html_template === "string" ? data.html_template.trim() : "";

  return {
    id: data.id,
    codigo: data.codigo,
    nome: data.nome,
    html: htmlTemplate || template?.html || null,
    css: data.css_template,
    configJson: data.config_json ?? null,
    layoutTemplateId: normalizarNumber(data.layout_template_id),
    legacyTemplateId: normalizarNumber(data.layout_template_id),
    heightPx: normalizarNumber(template?.height_px),
    source: htmlTemplate ? "SEMANTICO" : template ? "SEMANTICO_LAYOUT_TEMPLATE" : "AUSENTE",
  };
}

async function carregarRodapeSemantico(
  supabase: SupabaseClient,
  rodapeId: number | null,
): Promise<DocumentoParteResolvida | null> {
  if (!rodapeId) return null;

  const { data } = await supabase
    .from("documentos_rodapes")
    .select("id,codigo,nome,descricao,html_template,css_template,config_json,layout_template_id,ativo")
    .eq("id", rodapeId)
    .eq("ativo", true)
    .maybeSingle<DocumentoComponenteRow>();

  if (!data) return null;

  const template = await carregarTemplateLayout(supabase, normalizarNumber(data.layout_template_id));
  const htmlTemplate = typeof data.html_template === "string" ? data.html_template.trim() : "";

  return {
    id: data.id,
    codigo: data.codigo,
    nome: data.nome,
    html: htmlTemplate || template?.html || null,
    css: data.css_template,
    configJson: data.config_json ?? null,
    layoutTemplateId: normalizarNumber(data.layout_template_id),
    legacyTemplateId: normalizarNumber(data.layout_template_id),
    heightPx: normalizarNumber(template?.height_px),
    source: htmlTemplate ? "SEMANTICO" : template ? "SEMANTICO_LAYOUT_TEMPLATE" : "AUSENTE",
  };
}

function criarParteAusente(): DocumentoParteResolvida {
  return {
    id: null,
    codigo: null,
    nome: null,
    html: null,
    css: null,
    configJson: null,
    layoutTemplateId: null,
    legacyTemplateId: null,
    heightPx: null,
    source: "AUSENTE",
  };
}

async function resolverCabecalho(
  supabase: SupabaseClient,
  modelo: DocumentoModeloResolvido,
): Promise<DocumentoParteResolvida | null> {
  const semantico = await carregarCabecalhoSemantico(supabase, modelo.cabecalho_id);
  if (semantico?.html) return semantico;

  const legacyTemplate = await carregarTemplateLayout(supabase, modelo.header_template_id);
  if (legacyTemplate?.html) {
    return {
      id: null,
      codigo: null,
      nome: null,
      html: legacyTemplate.html,
      css: null,
      configJson: null,
      layoutTemplateId: legacyTemplate.layout_template_id,
      legacyTemplateId: legacyTemplate.layout_template_id,
      heightPx: normalizarNumber(legacyTemplate.height_px),
      source: "LEGADO_TEMPLATE",
    };
  }

  const layout = await carregarLayoutLegado(supabase, modelo.layout_id);
  if (layout?.cabecalho_html?.trim()) {
    return {
      ...criarParteAusente(),
      html: layout.cabecalho_html,
      source: "LEGADO_LAYOUT",
    };
  }

  if (modelo.cabecalho_html?.trim()) {
    return {
      ...criarParteAusente(),
      html: modelo.cabecalho_html,
      source: "MODELO_INLINE",
    };
  }

  return semantico ?? null;
}

async function resolverRodape(
  supabase: SupabaseClient,
  modelo: DocumentoModeloResolvido,
): Promise<DocumentoParteResolvida | null> {
  const semantico = await carregarRodapeSemantico(supabase, modelo.rodape_id);
  if (semantico?.html) return semantico;

  const legacyTemplate = await carregarTemplateLayout(supabase, modelo.footer_template_id);
  if (legacyTemplate?.html) {
    return {
      id: null,
      codigo: null,
      nome: null,
      html: legacyTemplate.html,
      css: null,
      configJson: null,
      layoutTemplateId: legacyTemplate.layout_template_id,
      legacyTemplateId: legacyTemplate.layout_template_id,
      heightPx: normalizarNumber(legacyTemplate.height_px),
      source: "LEGADO_TEMPLATE",
    };
  }

  const layout = await carregarLayoutLegado(supabase, modelo.layout_id);
  if (layout?.rodape_html?.trim()) {
    return {
      ...criarParteAusente(),
      html: layout.rodape_html,
      source: "LEGADO_LAYOUT",
    };
  }

  if (modelo.rodape_html?.trim()) {
    return {
      ...criarParteAusente(),
      html: modelo.rodape_html,
      source: "MODELO_INLINE",
    };
  }

  return semantico ?? null;
}

export async function carregarModeloDocumentoPorId(params: {
  supabase: SupabaseClient;
  modeloId: number;
}): Promise<DocumentoModeloResolvido> {
  const { supabase, modeloId } = params;

  const { data: modelo } = await supabase
    .from("documentos_modelo")
    .select(
      [
        "id",
        "titulo",
        "formato",
        "conteudo_html",
        "texto_modelo_md",
        "cabecalho_html",
        "rodape_html",
        "layout_id",
        "header_template_id",
        "footer_template_id",
        "header_height_px",
        "footer_height_px",
        "page_margin_mm",
        "operacao_id",
        "cabecalho_id",
        "rodape_id",
        "tipo_documento_id",
      ].join(","),
    )
    .eq("id", modeloId)
    .maybeSingle<DocumentoModeloResolvido>();

  if (!modelo) {
    throw new Error("modelo_documental_nao_encontrado");
  }

  return modelo;
}

export async function resolverPartesModelo(params: {
  supabase: SupabaseClient;
  modelo: DocumentoModeloResolvido;
}): Promise<{
  cabecalho: DocumentoParteResolvida | null;
  rodape: DocumentoParteResolvida | null;
  metadadosFallback: ModeloPorOperacaoResolvido["metadadosFallback"];
}> {
  const { supabase, modelo } = params;
  const cabecalho = await resolverCabecalho(supabase, modelo);
  const rodape = await resolverRodape(supabase, modelo);

  return {
    cabecalho,
    rodape,
    metadadosFallback: {
      tipoDocumentoCodigoSolicitado: null,
      usouCabecalhoSemantico:
        cabecalho?.source === "SEMANTICO" || cabecalho?.source === "SEMANTICO_LAYOUT_TEMPLATE",
      usouRodapeSemantico:
        rodape?.source === "SEMANTICO" || rodape?.source === "SEMANTICO_LAYOUT_TEMPLATE",
      usouHeaderTemplateLegado: cabecalho?.source === "LEGADO_TEMPLATE",
      usouFooterTemplateLegado: rodape?.source === "LEGADO_TEMPLATE",
      usouLayoutLegado: cabecalho?.source === "LEGADO_LAYOUT" || rodape?.source === "LEGADO_LAYOUT",
      usouCabecalhoInlineModelo: cabecalho?.source === "MODELO_INLINE",
      usouRodapeInlineModelo: rodape?.source === "MODELO_INLINE",
    },
  };
}

export async function resolverModeloPorOperacao(params: {
  supabase: SupabaseClient;
  operacaoCodigo: string;
  tipoDocumentoCodigo?: string | null;
}): Promise<ModeloPorOperacaoResolvido> {
  const { supabase, operacaoCodigo } = params;
  const tipoDocumentoCodigo = normalizarTipoDocumentoCodigo(params.tipoDocumentoCodigo ?? null);

  const { data: operacao } = await supabase
    .from("documentos_operacoes")
    .select("id,codigo,nome,descricao,tipo_documento_id,ativo,exige_origem,permite_reemissao")
    .eq("codigo", operacaoCodigo)
    .eq("ativo", true)
    .maybeSingle<{
      id: number;
      codigo: string;
      nome: string;
      descricao: string | null;
      tipo_documento_id: number | null;
      ativo: boolean;
      exige_origem: boolean;
      permite_reemissao: boolean;
    }>();

  if (!operacao) {
    throw new Error("operacao_documental_nao_encontrada");
  }

  const tipoOperacao = await carregarTipoDocumento(supabase, normalizarNumber(operacao.tipo_documento_id));
  const tipoSolicitado = tipoDocumentoCodigo
    ? await carregarTipoDocumentoPorCodigo(supabase, tipoDocumentoCodigo)
    : null;

  const modeloQuery = supabase
    .from("documentos_modelo")
    .select(
      [
        "id",
        "titulo",
        "formato",
        "conteudo_html",
        "texto_modelo_md",
        "cabecalho_html",
        "rodape_html",
        "layout_id",
        "header_template_id",
        "footer_template_id",
        "header_height_px",
        "footer_height_px",
        "page_margin_mm",
        "operacao_id",
        "cabecalho_id",
        "rodape_id",
        "tipo_documento_id",
      ].join(","),
    )
    .eq("operacao_id", operacao.id)
    .eq("ativo", true)
    .order("id", { ascending: false });

  const { data: modelos } = await (tipoSolicitado?.tipo_documento_id
    ? modeloQuery.eq("tipo_documento_id", tipoSolicitado.tipo_documento_id)
    : modeloQuery);

  const modelo = ((modelos ?? [])[0] ?? null) as DocumentoModeloResolvido | null;
  if (!modelo) {
    throw new Error("modelo_operacao_nao_encontrado");
  }

  const { cabecalho, rodape, metadadosFallback } = await resolverPartesModelo({
    supabase,
    modelo,
  });

  return {
    operacao: {
      id: operacao.id,
      codigo: operacao.codigo,
      nome: operacao.nome,
      descricao: operacao.descricao,
      tipo_documento_id: normalizarNumber(operacao.tipo_documento_id),
      tipo_documento_codigo: tipoOperacao?.codigo ?? null,
      tipo_documento_nome: tipoOperacao?.nome ?? null,
      ativo: operacao.ativo,
      exige_origem: operacao.exige_origem,
      permite_reemissao: operacao.permite_reemissao,
    },
    modelo,
    cabecalho,
    rodape,
    metadadosFallback: {
      ...metadadosFallback,
      tipoDocumentoCodigoSolicitado: tipoDocumentoCodigo,
    },
  };
}
