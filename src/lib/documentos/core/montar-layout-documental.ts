import { stripBackgroundStyles } from "@/lib/documentos/sanitizeHtml";
import { renderTemplateHtml } from "@/lib/documentos/templateRenderer";
import type {
  DocumentoModeloResolvido,
  DocumentoParteResolvida,
} from "@/lib/documentos/core/resolver-modelo-por-operacao";

export type VariaveisResolvidasDocumento = Record<string, string>;

export type LayoutDocumentalMontado = {
  htmlFinal: string;
  htmlCabecalho: string | null;
  htmlCorpo: string;
  htmlRodape: string | null;
  htmlCorpoTemplate: string;
  metadadosRenderizacao: {
    tituloDocumento: string;
    headerSource: DocumentoParteResolvida["source"] | "AUSENTE";
    footerSource: DocumentoParteResolvida["source"] | "AUSENTE";
    pageMarginMm: number;
    headerHeightPx: number;
    footerHeightPx: number;
    usaFallbackLegado: boolean;
  };
};

function renderizarTrecho(template: string | null, variaveis: VariaveisResolvidasDocumento): string | null {
  if (!template?.trim()) return null;
  return stripBackgroundStyles(renderTemplateHtml(template, variaveis));
}

function montarPaginaHtml(params: {
  tituloDocumento: string;
  htmlCabecalho: string | null;
  htmlCorpo: string;
  htmlRodape: string | null;
}): string {
  const { tituloDocumento, htmlCabecalho, htmlCorpo, htmlRodape } = params;

  return `<!DOCTYPE html>
<html lang="pt-BR">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>${tituloDocumento}</title>
    <style>
      body { margin: 0; font-family: Arial, sans-serif; background: #f8fafc; color: #0f172a; }
      .page { max-width: 980px; margin: 0 auto; padding: 24px; }
      .slot { background: #fff; border: 1px solid #e2e8f0; border-radius: 16px; padding: 24px; box-shadow: 0 10px 30px rgba(15, 23, 42, 0.08); }
      .slot + .slot { margin-top: 16px; }
    </style>
  </head>
  <body>
    <main class="page">
      ${htmlCabecalho ? `<section class="slot">${htmlCabecalho}</section>` : ""}
      <section class="slot">${htmlCorpo}</section>
      ${htmlRodape ? `<section class="slot">${htmlRodape}</section>` : ""}
    </main>
  </body>
</html>`;
}

export function montarLayoutDocumental(params: {
  tituloDocumento: string;
  modelo: DocumentoModeloResolvido;
  cabecalho: DocumentoParteResolvida | null;
  rodape: DocumentoParteResolvida | null;
  html_corpo: string;
  variaveis_resolvidas: VariaveisResolvidasDocumento;
}): LayoutDocumentalMontado {
  const { tituloDocumento, modelo, cabecalho, rodape, html_corpo, variaveis_resolvidas } = params;

  const htmlCabecalho = renderizarTrecho(cabecalho?.html ?? null, variaveis_resolvidas);
  const htmlCorpo = renderizarTrecho(html_corpo, variaveis_resolvidas) ?? "";
  const htmlRodape = renderizarTrecho(rodape?.html ?? null, variaveis_resolvidas);

  const headerHeightPx =
    Number.isFinite(modelo.header_height_px) && Number(modelo.header_height_px) > 0
      ? Number(modelo.header_height_px)
      : cabecalho?.heightPx && cabecalho.heightPx > 0
        ? cabecalho.heightPx
        : 120;

  const footerHeightPx =
    Number.isFinite(modelo.footer_height_px) && Number(modelo.footer_height_px) > 0
      ? Number(modelo.footer_height_px)
      : rodape?.heightPx && rodape.heightPx > 0
        ? rodape.heightPx
        : 80;

  const pageMarginMm =
    Number.isFinite(modelo.page_margin_mm) && Number(modelo.page_margin_mm) > 0
      ? Number(modelo.page_margin_mm)
      : 15;

  return {
    htmlFinal: montarPaginaHtml({
      tituloDocumento,
      htmlCabecalho,
      htmlCorpo,
      htmlRodape,
    }),
    htmlCabecalho,
    htmlCorpo,
    htmlRodape,
    htmlCorpoTemplate: html_corpo,
    metadadosRenderizacao: {
      tituloDocumento,
      headerSource: cabecalho?.source ?? "AUSENTE",
      footerSource: rodape?.source ?? "AUSENTE",
      pageMarginMm,
      headerHeightPx,
      footerHeightPx,
      usaFallbackLegado:
        cabecalho?.source === "LEGADO_TEMPLATE" ||
        cabecalho?.source === "LEGADO_LAYOUT" ||
        cabecalho?.source === "MODELO_INLINE" ||
        rodape?.source === "LEGADO_TEMPLATE" ||
        rodape?.source === "LEGADO_LAYOUT" ||
        rodape?.source === "MODELO_INLINE",
    },
  };
}
