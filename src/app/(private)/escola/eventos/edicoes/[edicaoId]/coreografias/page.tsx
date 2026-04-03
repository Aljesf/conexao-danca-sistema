import { EventoEdicaoCoreografiasClient } from "@/components/escola/eventos/EventoEdicaoCoreografiasClient";
import type {
  CoreografiaEstiloResumo,
  CoreografiaFormacaoResumo,
  CoreografiaMestreResumo,
  EventoCoreografiaParticipanteResumo,
  EventoCoreografiaResumo,
  EventoEdicaoCoreografiasData,
  EventoEdicaoListItem,
} from "@/components/escola/eventos/types";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

type EventoEdicaoCoreografiasPageProps = {
  params: Promise<{
    edicaoId: string;
  }>;
};

type EdicaoRow = {
  id: string;
  evento_id: string;
  titulo_exibicao: string;
  tema: string | null;
  descricao: string | null;
  ano_referencia: number;
  status: string;
  evento:
    | {
        titulo: string;
        descricao: string | null;
        tipo_evento: string;
      }[]
    | {
        titulo: string;
        descricao: string | null;
        tipo_evento: string;
      }
    | null;
};

type CoreografiaRow = {
  id: string;
  edicao_id: string;
  coreografia_id: string;
  subevento_id: string | null;
  ordem_prevista_apresentacao: number | null;
  valor_participacao_coreografia_centavos: number | null;
  duracao_prevista_no_evento_segundos: number | null;
  observacoes_do_evento: string | null;
  ativa: boolean;
  created_at: string;
  updated_at: string;
  coreografia: CoreografiaMestreResumo | CoreografiaMestreResumo[] | null;
  participantes: EventoCoreografiaParticipanteResumo[] | null;
};

function mapEdicao(row: EdicaoRow | null): EventoEdicaoListItem | null {
  if (!row) return null;

  const evento = Array.isArray(row.evento) ? row.evento[0] ?? null : row.evento;

  return {
    id: row.id,
    evento_id: row.evento_id,
    titulo_exibicao: row.titulo_exibicao,
    tema: row.tema,
    descricao: row.descricao,
    ano_referencia: row.ano_referencia,
    status: row.status,
    data_inicio: null,
    data_fim: null,
    local_principal_nome: null,
    local_principal_endereco: null,
    local_principal_cidade: null,
    regulamento_resumo: null,
    observacoes: null,
    created_at: "",
    updated_at: "",
    evento: evento
      ? {
          id: "",
          titulo: evento.titulo,
          descricao: evento.descricao,
          tipo_evento: evento.tipo_evento,
          natureza_evento: "",
          abrangencia_evento: "",
          ativo: true,
          created_at: "",
          updated_at: "",
        }
      : null,
  };
}

function mapCoreografias(rows: CoreografiaRow[] | null | undefined): EventoCoreografiaResumo[] {
  return (rows ?? []).flatMap((row) => {
    const coreografia = Array.isArray(row.coreografia)
      ? row.coreografia[0] ?? null
      : row.coreografia;

    if (!coreografia) return [];

    return [
      {
        id: row.id,
        edicao_id: row.edicao_id,
        coreografia_id: row.coreografia_id,
        subevento_id: row.subevento_id,
        ordem_prevista_apresentacao: row.ordem_prevista_apresentacao,
        valor_participacao_coreografia_centavos:
          row.valor_participacao_coreografia_centavos,
        duracao_prevista_no_evento_segundos:
          row.duracao_prevista_no_evento_segundos,
        observacoes_do_evento: row.observacoes_do_evento,
        ativa: row.ativa,
        created_at: row.created_at,
        updated_at: row.updated_at,
        coreografia,
        participantes: row.participantes ?? [],
      },
    ];
  });
}

async function carregarCoreografiasEdicao(
  edicaoId: string,
): Promise<EventoEdicaoCoreografiasData> {
  const supabase = await createClient();

  const [
    { data: edicaoData },
    { data: coreografiasData },
    { data: mestresData },
    { data: estilosData },
    { data: formacoesData },
  ] =
    await Promise.all([
      supabase
        .from("eventos_escola_edicoes")
        .select(
          `
            id,
            evento_id,
            titulo_exibicao,
            tema,
            descricao,
            ano_referencia,
            status,
            evento:eventos_escola (
              titulo,
              descricao,
              tipo_evento
            )
          `,
        )
        .eq("id", edicaoId)
        .maybeSingle(),
      supabase
        .from("eventos_escola_edicao_coreografias")
        .select(
          `
            id,
            edicao_id,
            coreografia_id,
            subevento_id,
            ordem_prevista_apresentacao,
            valor_participacao_coreografia_centavos,
            duracao_prevista_no_evento_segundos,
            observacoes_do_evento,
            ativa,
            created_at,
            updated_at,
            coreografia:coreografias (
              id,
              nome,
              descricao,
              modalidade,
              formacao_id,
              tipo_formacao,
              quantidade_minima_participantes,
              quantidade_maxima_participantes,
              duracao_estimada_segundos,
              sugestao_musica,
              link_musica,
              estilo_id,
              formacao:coreografia_formacoes (
                id,
                codigo,
                nome,
                quantidade_minima_padrao,
                quantidade_maxima_padrao,
                quantidade_fixa,
                ativo,
                created_at,
                updated_at
              ),
              estilo:coreografia_estilos (
                id,
                nome,
                slug,
                descricao,
                ativo,
                ordem_exibicao,
                created_at,
                updated_at
              ),
              professor_responsavel_id,
              turma_base_id,
              observacoes,
              ativa,
              created_at,
              updated_at
            ),
            participantes:eventos_escola_edicao_coreografia_elenco (
              id,
              edicao_coreografia_id,
              pessoa_id,
              aluno_id,
              inscricao_id,
              tipo_participante,
              ordem_interna,
              ativo,
              papel,
              observacao
            )
          `,
        )
        .eq("edicao_id", edicaoId)
        .order("ativa", { ascending: false })
        .order("ordem_prevista_apresentacao", { ascending: true }),
      supabase
        .from("coreografias")
        .select(
          `
            id,
            nome,
            descricao,
            modalidade,
            formacao_id,
            tipo_formacao,
            quantidade_minima_participantes,
            quantidade_maxima_participantes,
            duracao_estimada_segundos,
            sugestao_musica,
            link_musica,
            estilo_id,
            formacao:coreografia_formacoes (
              id,
              codigo,
              nome,
              quantidade_minima_padrao,
              quantidade_maxima_padrao,
              quantidade_fixa,
              ativa,
              created_at,
              updated_at
            ),
            professor_responsavel_id,
            turma_base_id,
            observacoes,
            ativa,
            created_at,
            updated_at,
            estilo:coreografia_estilos (
              id,
              nome,
              slug,
              descricao,
              ativo,
              ordem_exibicao,
              created_at,
              updated_at
            )
          `,
        )
        .eq("ativa", true)
        .order("nome", { ascending: true }),
      supabase
        .from("coreografia_estilos")
        .select("*")
        .order("ativo", { ascending: false })
        .order("ordem_exibicao", { ascending: true })
        .order("nome", { ascending: true }),
    supabase
      .from("coreografia_formacoes")
      .select(
        "id, codigo, nome, quantidade_minima_padrao, quantidade_maxima_padrao, quantidade_fixa, ativa, created_at, updated_at",
      )
      .eq("ativa", true)
      .order("quantidade_fixa", { ascending: false })
      .order("quantidade_minima_padrao", { ascending: true })
      .order("nome", { ascending: true }),
    ]);

  const coreografias = mapCoreografias(coreografiasData as CoreografiaRow[] | null);
  const vinculadas = new Set(coreografias.map((item) => item.coreografia_id));
  const coreografiasDisponiveis = ((mestresData ?? []) as CoreografiaMestreResumo[]).filter(
    (item) => !vinculadas.has(item.id),
  );

  return {
    edicao: mapEdicao((edicaoData as EdicaoRow | null) ?? null),
    coreografias,
    coreografiasDisponiveis,
    estilos: (estilosData ?? []) as CoreografiaEstiloResumo[],
    formacoes: (formacoesData ?? []) as CoreografiaFormacaoResumo[],
  };
}

export default async function EventoEdicaoCoreografiasPage({
  params,
}: EventoEdicaoCoreografiasPageProps) {
  const { edicaoId } = await params;
  const data = await carregarCoreografiasEdicao(edicaoId);

  return <EventoEdicaoCoreografiasClient data={data} />;
}
