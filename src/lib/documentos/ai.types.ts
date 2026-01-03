export type AiVarSuggestion = {
  codigo: string;
  descricao: string;
  tipo: "TEXTO" | "MONETARIO" | "DATA" | "BOOLEAN" | "OUTRO";
  formato: string | null;
  obrigatoria: boolean;
};

export type AiAnalyzeResp = {
  titulo_sugerido: string;
  tipo_documento_codigo: string | null;
  template_html: string;
  variaveis: AiVarSuggestion[];
};
