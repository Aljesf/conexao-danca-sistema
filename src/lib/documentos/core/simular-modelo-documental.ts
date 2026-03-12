import type { SupabaseClient } from "@supabase/supabase-js";
import { buildContextFromMatricula } from "@/lib/documentos/buildContext";
import { resolveCollections, type CollectionsResolved } from "@/lib/documentos/collectionsResolver";
import { montarLayoutDocumental } from "@/lib/documentos/core/montar-layout-documental";
import {
  carregarModeloDocumentoPorId,
  resolverPartesModelo,
  type DocumentoOperacaoResolvida,
} from "@/lib/documentos/core/resolver-modelo-por-operacao";
import {
  carregarVariaveisDocumentaisAtivas,
  resolverVariaveisDocumento,
} from "@/lib/documentos/core/resolver-variaveis-documentais";
import { normalizeOperacaoTipo, OPERACAO_TIPOS } from "@/lib/documentos/operacaoTipos";
import { extractCollectionCodes, renderTemplateHtml } from "@/lib/documentos/templateRenderer";

export type OrigemSimulacaoTipo = "MATRICULA";

export type ResultadoSimulacaoDocumento = {
  htmlSimulado: string;
  variaveisResolvidas: Record<string, string>;
  colecoesResolvidas: CollectionsResolved;
  origem: {
    tipo: OrigemSimulacaoTipo;
    id: number;
    label: string;
  };
  operacao: DocumentoOperacaoResolvida | null;
  metadadosRenderizacao: ReturnType<typeof montarLayoutDocumental>["metadadosRenderizacao"];
};

function markdownToHtmlSimples(markdown: string): string {
  const trimmed = markdown.trim();
  if (!trimmed) return "<p></p>";
  const escaped = trimmed
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
  const blocos = escaped
    .split(/\n{2,}/)
    .map((part) => part.trim())
    .filter(Boolean)
    .map((part) => `<p>${part.replace(/\n/g, "<br/>")}</p>`);
  return blocos.join("") || "<p></p>";
}

function resolverTemplateCorpo(modelo: {
  formato: string | null;
  conteudo_html: string | null;
  texto_modelo_md: string | null;
}): string {
  if (modelo.formato === "RICH_HTML") {
    return modelo.conteudo_html?.trim() || markdownToHtmlSimples(modelo.texto_modelo_md ?? "");
  }
  return markdownToHtmlSimples(modelo.texto_modelo_md ?? modelo.conteudo_html ?? "");
}

function montarLabelOrigem(params: {
  matriculaId: number;
  aluno: Record<string, unknown> | null;
  turma: Record<string, unknown> | null;
}): string {
  const alunoNome = typeof params.aluno?.nome === "string" ? params.aluno.nome.trim() : "";
  const turmaNome = typeof params.turma?.nome === "string" ? params.turma.nome.trim() : "";
  if (alunoNome && turmaNome) {
    return `${alunoNome} - ${turmaNome} (#${params.matriculaId})`;
  }
  if (alunoNome) {
    return `${alunoNome} (#${params.matriculaId})`;
  }
  return `Matricula #${params.matriculaId}`;
}

async function carregarOperacaoModelo(
  supabase: SupabaseClient,
  operacaoId: number | null,
): Promise<DocumentoOperacaoResolvida | null> {
  if (!operacaoId) return null;

  const { data } = await supabase
    .from("documentos_operacoes")
    .select(
      "id,codigo,nome,descricao,tipo_documento_id,ativo,exige_origem,permite_reemissao",
    )
    .eq("id", operacaoId)
    .maybeSingle<DocumentoOperacaoResolvida>();

  return data ?? null;
}

export async function simularModeloDocumental(params: {
  supabase: SupabaseClient;
  modeloId: number;
  origemTipo: OrigemSimulacaoTipo;
  origemId: number;
}): Promise<ResultadoSimulacaoDocumento> {
  const { supabase, modeloId, origemTipo, origemId } = params;

  if (origemTipo !== "MATRICULA") {
    throw new Error("origem_tipo_nao_suportada");
  }

  const modelo = await carregarModeloDocumentoPorId({ supabase, modeloId });
  const { cabecalho, rodape } = await resolverPartesModelo({ supabase, modelo });
  const operacao = await carregarOperacaoModelo(supabase, modelo.operacao_id);
  const contextoMatricula = await buildContextFromMatricula({
    supabase,
    matriculaId: origemId,
  });

  const templateCorpo = resolverTemplateCorpo(modelo);
  const variaveisByCodigo = await carregarVariaveisDocumentaisAtivas(supabase);
  const variaveisResolvidas = await resolverVariaveisDocumento({
    template: templateCorpo,
    contexto: contextoMatricula.contexto,
    variaveisByCodigo,
    supabase,
    rootId: origemId,
  });

  const collectionCodes = extractCollectionCodes(templateCorpo);
  let operacaoTipo = normalizeOperacaoTipo(origemTipo);
  if (Number.isFinite(origemId)) {
    operacaoTipo = OPERACAO_TIPOS.MATRICULA;
  }

  const colecoesResolvidas =
    collectionCodes.length > 0
      ? await resolveCollections({
          operacaoTipo: operacaoTipo as string,
          operacaoId: origemId,
          colecoes: collectionCodes,
        })
      : {};

  const htmlCorpoResolvido = renderTemplateHtml(templateCorpo, {
    ...variaveisResolvidas.values,
    ...colecoesResolvidas,
  });

  const layoutMontado = montarLayoutDocumental({
    tituloDocumento: modelo.titulo?.trim() || `Modelo ${modelo.id}`,
    modelo,
    cabecalho,
    rodape,
    html_corpo: htmlCorpoResolvido,
    variaveis_resolvidas: variaveisResolvidas.values,
  });

  return {
    htmlSimulado: layoutMontado.htmlFinal,
    variaveisResolvidas: variaveisResolvidas.values,
    colecoesResolvidas,
    origem: {
      tipo: origemTipo,
      id: origemId,
      label: montarLabelOrigem({
        matriculaId: origemId,
        aluno: contextoMatricula.aluno,
        turma: contextoMatricula.turma,
      }),
    },
    operacao,
    metadadosRenderizacao: layoutMontado.metadadosRenderizacao,
  };
}
