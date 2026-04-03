import { EventoEdicaoConfiguracoesClient } from "@/components/escola/eventos/EventoEdicaoConfiguracoesClient";
import type {
  CoreografiaEstiloResumo,
  EventoEdicaoConfiguracaoData,
} from "@/components/escola/eventos/types";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

type EventoEdicaoConfiguracoesPageProps = {
  params: Promise<{
    edicaoId: string;
  }>;
  searchParams?: Promise<{
    origem?: string | string[];
  }>;
};

type EdicaoRow = {
  id: string;
  evento_id: string;
  titulo_exibicao: string;
  ano_referencia: number;
  tema: string | null;
  descricao: string | null;
  status: string;
  evento:
    | {
        titulo: string;
        descricao: string | null;
      }[]
    | {
        titulo: string;
        descricao: string | null;
      }
    | null;
};

async function carregarEdicaoConfiguracao(edicaoId: string) {
  const supabase = await createClient();

  const [
    { data: edicaoData },
    { data: configuracaoData },
    { data: itensData },
    { data: regrasData },
    { data: estilosData },
  ] = await Promise.all([
    supabase
      .from("eventos_escola_edicoes")
      .select(
        `
          id,
          evento_id,
          titulo_exibicao,
          ano_referencia,
          tema,
          descricao,
          status,
          evento:eventos_escola (
            titulo,
            descricao
          )
        `,
      )
      .eq("id", edicaoId)
      .maybeSingle(),
    supabase
      .from("eventos_escola_edicao_configuracoes")
      .select("*")
      .eq("edicao_id", edicaoId)
      .maybeSingle(),
    supabase
      .from("eventos_escola_edicao_itens_financeiros")
      .select(
        "id, codigo, nome, descricao, tipo_item, modo_cobranca, valor_centavos, ativo, ordem, metadata",
      )
      .eq("edicao_id", edicaoId)
      .order("ordem", { ascending: true }),
    supabase
      .from("eventos_escola_edicao_regras_financeiras")
      .select(
        "id, tipo_regra, modo_calculo, descricao_regra, formacao_coreografia, estilo_id, modalidade_nome, ordem_progressao, quantidade_minima, quantidade_maxima, valor_centavos, valor_por_participante_centavos, ativa, ordem_aplicacao, metadata",
      )
      .eq("edicao_id", edicaoId)
      .order("ordem_aplicacao", { ascending: true })
      .order("created_at", { ascending: true }),
    supabase
      .from("coreografia_estilos")
      .select("id, nome, slug, descricao, ativo, ordem_exibicao, created_at, updated_at")
      .eq("ativo", true)
      .order("ordem_exibicao", { ascending: true })
      .order("nome", { ascending: true }),
  ]);

  const edicao = edicaoData as EdicaoRow | null;
  const evento = edicao
    ? Array.isArray(edicao.evento)
      ? edicao.evento[0] ?? null
      : edicao.evento
    : null;

  return {
    edicao: edicao
      ? {
          id: edicao.id,
          eventoId: edicao.evento_id,
          tituloExibicao: edicao.titulo_exibicao,
          anoReferencia: edicao.ano_referencia,
          tema: edicao.tema,
          descricao: edicao.descricao,
          status: edicao.status,
          eventoTitulo: evento?.titulo ?? null,
          eventoDescricao: evento?.descricao ?? null,
        }
      : null,
    configuracao: configuracaoData
      ? ({
          ...(configuracaoData as Omit<
            EventoEdicaoConfiguracaoData,
            "itensFinanceiros" | "regrasFinanceiras"
          >),
          itensFinanceiros: (itensData ?? []) as EventoEdicaoConfiguracaoData["itensFinanceiros"],
          regrasFinanceiras:
            (regrasData ?? []) as EventoEdicaoConfiguracaoData["regrasFinanceiras"],
        } satisfies EventoEdicaoConfiguracaoData)
      : null,
    estilos: (estilosData ?? []) as CoreografiaEstiloResumo[],
  };
}

export default async function EventoEdicaoConfiguracoesPage({
  params,
  searchParams,
}: EventoEdicaoConfiguracoesPageProps) {
  const { edicaoId } = await params;
  const resolvedSearchParams = searchParams ? await searchParams : undefined;
  const origem = Array.isArray(resolvedSearchParams?.origem)
    ? resolvedSearchParams?.origem[0]
    : resolvedSearchParams?.origem;
  const data = await carregarEdicaoConfiguracao(edicaoId);

  return (
    <EventoEdicaoConfiguracoesClient
      edicao={data.edicao}
      configuracaoInicial={data.configuracao}
      estilos={data.estilos}
      destacarCriacao={origem === "nova-edicao"}
    />
  );
}
