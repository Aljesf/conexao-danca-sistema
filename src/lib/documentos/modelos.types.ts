export type DocumentoModeloFormato = "MARKDOWN" | "RICH_HTML";

export type DocumentoModeloDTO = {
  id: number;
  titulo: string;
  versao: string;
  ativo: boolean;
  tipo_documento_id: number | null;
  formato: DocumentoModeloFormato | null;
  texto_modelo_md: string | null;
  conteudo_html: string | null;
  cabecalho_html?: string | null;
  rodape_html?: string | null;
  placeholders_schema_json: unknown;
  observacoes: string | null;
  created_at?: string;
  updated_at?: string;
};

export type DocumentoModeloCreatePayload = {
  titulo: string;
  tipo_documento_id?: number;
  conjunto_grupo_id?: number | null;
  ordem?: number | null;
  versao?: string;
  ativo?: boolean;
  formato?: DocumentoModeloFormato;
  texto_modelo_md?: string;
  conteudo_html?: string;
  cabecalho_html?: string | null;
  rodape_html?: string | null;
  placeholders_schema_json?: unknown;
  observacoes?: string | null;
};

export type DocumentoModeloUpdatePayload = DocumentoModeloCreatePayload & {
  id: number;
};
