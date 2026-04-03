import { EventoEdicaoDetalheClient } from "@/components/escola/eventos/EventoEdicaoDetalheClient";
import {
  EVENTO_EDICAO_ABAS,
  type CoreografiaMestreResumo,
  type EventoContratacaoResumo,
  type EventoCoreografiaParticipanteResumo,
  type EventoCoreografiaResumo,
  type EventoDiaItem,
  type EventoEdicaoAba,
  type EventoEdicaoDetalheDataExpandido,
  type EventoEdicaoListItem,
  type EventoFinanceiroReferenciaResumo,
  type EventoInscricaoResumo,
  type EventoSessaoItem,
} from "@/components/escola/eventos/types";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

type EventoEdicaoPageProps = {
  params: Promise<{
    edicaoId: string;
  }>;
  searchParams?: Promise<{
    aba?: string | string[];
  }>;
};

type EventoEdicaoResumoRow = {
  id: string;
  evento_id: string;
  titulo_exibicao: string;
  tema: string | null;
  descricao: string | null;
  ano_referencia: number;
  status: string;
  data_inicio: string | null;
  data_fim: string | null;
  local_principal_nome: string | null;
  regulamento_resumo: string | null;
  observacoes: string | null;
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

type EventoInscricaoResumoRow = {
  id: string;
  edicao_id: string;
  pessoa_id: number;
  aluno_pessoa_id: number | null;
  status_inscricao: string;
  status_financeiro: string;
  conta_interna_id: number | null;
  itens:
    | {
        id: string;
        descricao: string | null;
        quantidade: number;
        valor_total_centavos: number;
        status: string;
      }[]
    | null;
};

type CoreografiaMestreResumoRow = CoreografiaMestreResumo;

type EventoCoreografiaParticipanteResumoRow = EventoCoreografiaParticipanteResumo;

type EventoCoreografiaResumoRow = {
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
  coreografia: CoreografiaMestreResumoRow | CoreografiaMestreResumoRow[] | null;
  participantes:
    | EventoCoreografiaParticipanteResumoRow[]
    | null;
};

type EventoContratacaoResumoRow = {
  id: string;
  edicao_id: string;
  prestador_pessoa_id: number | null;
  tipo_servico: string;
  descricao: string | null;
  valor_previsto_centavos: number;
  valor_contratado_centavos: number | null;
  conta_pagar_id: number | null;
  status: string;
};

type EventoFinanceiroReferenciaResumoRow = {
  id: string;
  edicao_id: string;
  natureza: string;
  valor_previsto_centavos: number | null;
  valor_real_centavos: number | null;
};

type EventoSessaoResumoRow = Pick<
  EventoSessaoItem,
  | "id"
  | "edicao_id"
  | "dia_id"
  | "titulo"
  | "subtitulo"
  | "tipo_sessao"
  | "hora_inicio"
  | "hora_fim"
  | "ordem"
  | "status"
  | "exige_ingresso"
  | "observacoes"
>;

function normalizarAba(value: string | string[] | undefined): EventoEdicaoAba {
  const aba = Array.isArray(value) ? value[0] : value;

  if (aba && EVENTO_EDICAO_ABAS.includes(aba as EventoEdicaoAba)) {
    return aba as EventoEdicaoAba;
  }

  return "agenda";
}

function mapEventoEdicao(row: EventoEdicaoResumoRow | null): EventoEdicaoListItem | null {
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
    data_inicio: row.data_inicio,
    data_fim: row.data_fim,
    local_principal_nome: row.local_principal_nome,
    local_principal_endereco: null,
    local_principal_cidade: null,
    regulamento_resumo: row.regulamento_resumo,
    observacoes: row.observacoes,
    created_at: "",
    updated_at: "",
    evento: evento
      ? {
          id: "",
          titulo: evento.titulo,
          descricao: evento.descricao,
          tipo_evento: "",
          natureza_evento: "",
          abrangencia_evento: "",
          ativo: true,
          created_at: "",
          updated_at: "",
        }
      : null,
  };
}

function mapInscricoes(rows: EventoInscricaoResumoRow[] | null | undefined): EventoInscricaoResumo[] {
  return (rows ?? []).map((row) => ({
    id: row.id,
    edicao_id: row.edicao_id,
    pessoa_id: row.pessoa_id,
    aluno_pessoa_id: row.aluno_pessoa_id,
    responsavel_financeiro_id: null,
    conta_interna_id: row.conta_interna_id,
    status_inscricao: row.status_inscricao,
    status_financeiro: row.status_financeiro,
    data_inscricao: "",
    observacoes: null,
    itens: (row.itens ?? []).map((item) => ({
      id: item.id,
      inscricao_id: row.id,
      modalidade_id: null,
      subevento_id: null,
      descricao: item.descricao,
      quantidade: item.quantidade,
      valor_unitario_centavos: 0,
      valor_total_centavos: item.valor_total_centavos,
      obrigatorio: false,
      status: item.status,
      observacoes: null,
    })),
  }));
}

function mapCoreografias(
  rows: EventoCoreografiaResumoRow[] | null | undefined,
): EventoCoreografiaResumo[] {
  return (rows ?? []).flatMap((row) => {
    const coreografia = Array.isArray(row.coreografia)
      ? row.coreografia[0] ?? null
      : row.coreografia;

    if (!coreografia) {
      return [];
    }

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

function mapContratacoes(
  rows: EventoContratacaoResumoRow[] | null | undefined,
): EventoContratacaoResumo[] {
  return (rows ?? []).map((row) => ({
    id: row.id,
    edicao_id: row.edicao_id,
    sessao_id: null,
    prestador_pessoa_id: row.prestador_pessoa_id,
    tipo_servico: row.tipo_servico,
    descricao: row.descricao,
    valor_previsto_centavos: row.valor_previsto_centavos,
    valor_contratado_centavos: row.valor_contratado_centavos,
    contrato_acessorio_emitido_id: null,
    conta_pagar_id: row.conta_pagar_id,
    status: row.status,
    observacoes: null,
  }));
}

function mapReferencias(
  rows: EventoFinanceiroReferenciaResumoRow[] | null | undefined,
): EventoFinanceiroReferenciaResumo[] {
  return (rows ?? []).map((row) => ({
    id: row.id,
    edicao_id: row.edicao_id,
    sessao_id: null,
    natureza: row.natureza,
    origem_tipo: "",
    origem_id: null,
    pessoa_id: null,
    descricao: null,
    valor_previsto_centavos: row.valor_previsto_centavos,
    valor_real_centavos: row.valor_real_centavos,
    conta_interna_id: null,
    cobranca_id: null,
    recebimento_id: null,
    conta_pagar_id: null,
    pagamento_conta_pagar_id: null,
    movimento_financeiro_id: null,
    observacoes: null,
  }));
}

function mapSessoes(rows: EventoSessaoResumoRow[] | null | undefined): EventoSessaoItem[] {
  return (rows ?? []).map((row) => ({
    id: row.id,
    edicao_id: row.edicao_id,
    dia_id: row.dia_id,
    local_id: null,
    titulo: row.titulo,
    subtitulo: row.subtitulo,
    tipo_sessao: row.tipo_sessao,
    hora_inicio: row.hora_inicio,
    hora_fim: row.hora_fim,
    ordem: row.ordem,
    status: row.status,
    capacidade_total: null,
    exige_ingresso: row.exige_ingresso,
    usa_mapa_lugares: false,
    permite_publico_externo: true,
    observacoes: row.observacoes,
  }));
}

async function carregarDetalheEdicao(
  edicaoId: string,
): Promise<EventoEdicaoDetalheDataExpandido> {
  const supabase = await createClient();

  const [
    { data: edicaoData },
    { data: diasData },
    { data: sessoesData },
    { data: inscricoesData },
    { data: coreografiasData },
    { data: contratacoesData },
    { data: referenciasFinanceirasData },
  ] = await Promise.all([
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
          data_inicio,
          data_fim,
          local_principal_nome,
          regulamento_resumo,
          observacoes,
          evento:eventos_escola (
            titulo,
            descricao
          )
        `,
      )
      .eq("id", edicaoId)
      .maybeSingle(),

    supabase
      .from("eventos_escola_dias")
      .select("id, edicao_id, data_evento, titulo, ordem, status, observacoes")
      .eq("edicao_id", edicaoId)
      .order("data_evento", { ascending: true })
      .order("ordem", { ascending: true }),

    supabase
      .from("eventos_escola_sessoes")
      .select(
        "id, edicao_id, dia_id, titulo, subtitulo, tipo_sessao, hora_inicio, hora_fim, ordem, status, exige_ingresso, observacoes",
      )
      .eq("edicao_id", edicaoId)
      .order("dia_id", { ascending: true })
      .order("hora_inicio", { ascending: true }),

    supabase
      .from("eventos_escola_inscricoes")
      .select(
        `
          id,
          edicao_id,
          pessoa_id,
          aluno_pessoa_id,
          status_inscricao,
          status_financeiro,
          conta_interna_id,
          itens:eventos_escola_inscricao_itens (
            id,
            descricao,
            quantidade,
            valor_total_centavos,
            status
          )
        `,
      )
      .eq("edicao_id", edicaoId)
      .order("data_inscricao", { ascending: false }),

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
            tipo_formacao,
            quantidade_minima_participantes,
            quantidade_maxima_participantes,
            duracao_estimada_segundos,
            sugestao_musica,
            link_musica,
            estilo_id,
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
      .from("eventos_escola_contratacoes")
      .select(
        "id, edicao_id, prestador_pessoa_id, tipo_servico, descricao, valor_previsto_centavos, valor_contratado_centavos, conta_pagar_id, status",
      )
      .eq("edicao_id", edicaoId)
      .order("created_at", { ascending: false }),

    supabase
      .from("eventos_escola_financeiro_referencias")
      .select("id, edicao_id, natureza, valor_previsto_centavos, valor_real_centavos")
      .eq("edicao_id", edicaoId)
      .order("created_at", { ascending: false }),
  ]);

  return {
    edicao: mapEventoEdicao((edicaoData as EventoEdicaoResumoRow | null) ?? null),
    dias: (diasData ?? []) as EventoDiaItem[],
    sessoes: mapSessoes(sessoesData as EventoSessaoResumoRow[] | null),
    inscricoes: mapInscricoes(inscricoesData as EventoInscricaoResumoRow[] | null),
    coreografias: mapCoreografias(coreografiasData as EventoCoreografiaResumoRow[] | null),
    contratacoes: mapContratacoes(contratacoesData as EventoContratacaoResumoRow[] | null),
    referenciasFinanceiras: mapReferencias(
      referenciasFinanceirasData as EventoFinanceiroReferenciaResumoRow[] | null,
    ),
  };
}

export default async function EventoEdicaoPage({
  params,
  searchParams,
}: EventoEdicaoPageProps) {
  const { edicaoId } = await params;
  const resolvedSearchParams = searchParams ? await searchParams : undefined;
  const data = await carregarDetalheEdicao(edicaoId);

  return (
    <EventoEdicaoDetalheClient
      data={data}
      abaInicial={normalizarAba(resolvedSearchParams?.aba)}
    />
  );
}
