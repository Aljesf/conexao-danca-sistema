import type {
  CoreografiaEstiloResumo,
  CoreografiaFormacaoResumo,
  CoreografiaMestreResumo,
  EventoCoreografiaParticipanteResumo,
  EventoCoreografiaResumo,
  EventoEdicaoConfiguracaoData,
  EventoEdicaoInscricoesDashboard,
  EventoEdicaoInscricoesData,
  EventoEdicaoListItem,
} from "@/components/escola/eventos/types";
import { listarInscricoesEdicaoEvento } from "@/lib/eventos/service";
import { createClient } from "@/lib/supabase/server";

type EdicaoRow = {
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
  local_principal_endereco: string | null;
  local_principal_cidade: string | null;
  regulamento_resumo: string | null;
  observacoes: string | null;
  evento:
    | {
        titulo: string;
        descricao: string | null;
        tipo_evento: string;
        natureza_evento: string;
        abrangencia_evento: string;
      }[]
    | {
        titulo: string;
        descricao: string | null;
        tipo_evento: string;
        natureza_evento: string;
        abrangencia_evento: string;
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

type FinanceiroReferenciaRow = {
  recebimento_id: number | null;
  valor_real_centavos: number | null;
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
    data_inicio: row.data_inicio,
    data_fim: row.data_fim,
    local_principal_nome: row.local_principal_nome,
    local_principal_endereco: row.local_principal_endereco,
    local_principal_cidade: row.local_principal_cidade,
    regulamento_resumo: row.regulamento_resumo,
    observacoes: row.observacoes,
    created_at: "",
    updated_at: "",
    evento: evento
      ? {
          id: "",
          titulo: evento.titulo,
          descricao: evento.descricao,
          tipo_evento: evento.tipo_evento,
          natureza_evento: evento.natureza_evento,
          abrangencia_evento: evento.abrangencia_evento,
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

function enriquecerCoreografiasComCapacidade(params: {
  coreografias: EventoCoreografiaResumo[];
  inscricoes: EventoEdicaoInscricoesData["inscricoes"];
}) {
  const ocupacaoPorCoreografia = new Map<string, Set<string>>();

  const ensureSet = (coreografiaId: string) => {
    const atual = ocupacaoPorCoreografia.get(coreografiaId);
    if (atual) return atual;
    const novo = new Set<string>();
    ocupacaoPorCoreografia.set(coreografiaId, novo);
    return novo;
  };

  for (const vinculo of params.coreografias) {
    const ocupantes = ensureSet(vinculo.id);
    for (const participante of vinculo.participantes ?? []) {
      if (participante.ativo === false) continue;
      if (participante.inscricao_id) {
        ocupantes.add(`inscricao:${participante.inscricao_id}`);
      } else if (participante.aluno_id) {
        ocupantes.add(`aluno:${participante.aluno_id}`);
      } else if (participante.pessoa_id) {
        ocupantes.add(`pessoa:${participante.pessoa_id}`);
      } else {
        ocupantes.add(`elenco:${participante.id}`);
      }
    }
  }

  for (const inscricao of params.inscricoes) {
    if (inscricao.status_inscricao === "CANCELADA") continue;
    for (const item of inscricao.itens ?? []) {
      if (
        item.status === "CANCELADO" ||
        item.tipo_item !== "COREOGRAFIA" ||
        !item.coreografia_vinculo_id
      ) {
        continue;
      }

      ensureSet(item.coreografia_vinculo_id).add(`inscricao:${inscricao.id}`);
    }
  }

  return params.coreografias.map((vinculo) => {
    const ocupacaoAtual = ocupacaoPorCoreografia.get(vinculo.id)?.size ?? 0;
    const capacidadeMaxima = vinculo.coreografia.quantidade_maxima_participantes;
    const capacidadeDisponivel =
      typeof capacidadeMaxima === "number"
        ? Math.max(capacidadeMaxima - ocupacaoAtual, 0)
        : null;

    return {
      ...vinculo,
      ocupacao_atual: ocupacaoAtual,
      capacidade_disponivel: capacidadeDisponivel,
      lotada:
        typeof capacidadeMaxima === "number" &&
        capacidadeMaxima > 0 &&
        ocupacaoAtual >= capacidadeMaxima,
    };
  });
}

function buildDashboardInscricoes(params: {
  inscricoes: EventoEdicaoInscricoesData["inscricoes"];
  referenciasFinanceiras: FinanceiroReferenciaRow[] | null;
}): EventoEdicaoInscricoesDashboard {
  let totalInscritosAtivos = 0;
  let totalInscricoesCanceladas = 0;
  let totalItensAtivos = 0;
  let totalItensCancelados = 0;
  let valorPrevistoCentavos = 0;
  let valorCanceladoCentavos = 0;

  for (const inscricao of params.inscricoes) {
    const itens = inscricao.itens ?? [];
    const itensAtivos = itens.filter((item) => item.status !== "CANCELADO");
    const itensCancelados = itens.filter((item) => item.status === "CANCELADO");

    if (inscricao.status_inscricao === "CANCELADA") {
      totalInscricoesCanceladas += 1;
    } else {
      totalInscritosAtivos += 1;
    }

    totalItensAtivos += itensAtivos.length;
    totalItensCancelados += itensCancelados.length;

    if (inscricao.status_inscricao !== "CANCELADA") {
      valorPrevistoCentavos += itensAtivos.reduce(
        (acc, item) => acc + item.valor_total_centavos,
        0,
      );
    }

    const valorItensCancelados = itensCancelados.reduce(
      (acc, item) => acc + item.valor_total_centavos,
      0,
    );

    if (valorItensCancelados > 0) {
      valorCanceladoCentavos += valorItensCancelados;
    } else if (inscricao.status_inscricao === "CANCELADA") {
      valorCanceladoCentavos += inscricao.valor_total_centavos ?? 0;
    }
  }

  const recebimentosUnicos = new Map<number, number>();
  for (const referencia of params.referenciasFinanceiras ?? []) {
    if (
      typeof referencia.recebimento_id !== "number" ||
      typeof referencia.valor_real_centavos !== "number"
    ) {
      continue;
    }

    if (!recebimentosUnicos.has(referencia.recebimento_id)) {
      recebimentosUnicos.set(
        referencia.recebimento_id,
        referencia.valor_real_centavos,
      );
    }
  }

  const valorArrecadadoCentavos = Array.from(recebimentosUnicos.values()).reduce(
    (acc, valor) => acc + valor,
    0,
  );

  return {
    totalInscritosAtivos,
    totalInscricoesCanceladas,
    totalItensAtivos,
    totalItensCancelados,
    valorPrevistoCentavos,
    valorArrecadadoCentavos,
    valorCanceladoCentavos,
  };
}

export async function carregarInscricoesEdicao(
  edicaoId: string,
): Promise<EventoEdicaoInscricoesData> {
  const supabase = await createClient();

  const [
    edicaoResult,
    configuracaoResult,
    itensResult,
    regrasResult,
    coreografiasResult,
    estilosResult,
    formacoesResult,
    referenciasFinanceirasResult,
    inscricoesResult,
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
          local_principal_endereco,
          local_principal_cidade,
          regulamento_resumo,
          observacoes,
          evento:eventos_escola (
            titulo,
            descricao,
            tipo_evento,
            natureza_evento,
            abrangencia_evento
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
      .eq("ativo", true)
      .order("ordem", { ascending: true }),
    supabase
      .from("eventos_escola_edicao_regras_financeiras")
      .select(
        "id, tipo_regra, modo_calculo, descricao_regra, formacao_coreografia, estilo_id, modalidade_nome, ordem_progressao, quantidade_minima, quantidade_maxima, valor_centavos, valor_por_participante_centavos, ativa, ordem_aplicacao, metadata",
      )
      .eq("edicao_id", edicaoId)
      .eq("ativa", true)
      .order("ordem_aplicacao", { ascending: true })
      .order("created_at", { ascending: true }),
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
              ativa,
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
      .eq("ativa", true)
      .order("ordem_prevista_apresentacao", { ascending: true }),
    supabase
      .from("coreografia_estilos")
      .select("id, nome, slug, descricao, ativo, ordem_exibicao, created_at, updated_at")
      .eq("ativo", true)
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
    supabase
      .from("eventos_escola_financeiro_referencias")
      .select("recebimento_id, valor_real_centavos")
      .eq("edicao_id", edicaoId)
      .eq("natureza", "RECEITA")
      .not("recebimento_id", "is", null),
    listarInscricoesEdicaoEvento(supabase, edicaoId),
  ]);

  if (edicaoResult.error) {
    console.error("[eventos/inscricoes] erro ao carregar edicao", {
      edicaoId,
      message: edicaoResult.error.message,
      details: edicaoResult.error.details,
      hint: edicaoResult.error.hint,
      code: edicaoResult.error.code,
    });
    throw new Error(`Falha ao carregar edicao do evento: ${edicaoResult.error.message}`);
  }

  if (configuracaoResult.error) {
    throw new Error(`Falha ao carregar configuracao da edicao: ${configuracaoResult.error.message}`);
  }

  if (itensResult.error) {
    throw new Error(`Falha ao carregar itens financeiros da edicao: ${itensResult.error.message}`);
  }

  if (regrasResult.error) {
    throw new Error(`Falha ao carregar regras financeiras da edicao: ${regrasResult.error.message}`);
  }

  if (coreografiasResult.error) {
    throw new Error(`Falha ao carregar coreografias da edicao: ${coreografiasResult.error.message}`);
  }

  if (estilosResult.error) {
    throw new Error(`Falha ao carregar estilos de coreografia: ${estilosResult.error.message}`);
  }

  if (formacoesResult.error) {
    throw new Error(`Falha ao carregar formacoes de coreografia: ${formacoesResult.error.message}`);
  }

  if (referenciasFinanceirasResult.error) {
    throw new Error(
      `Falha ao carregar referencias financeiras da edicao: ${referenciasFinanceirasResult.error.message}`,
    );
  }

  const edicaoData = (edicaoResult.data as EdicaoRow | null) ?? null;
  if (!edicaoData) {
    throw new Error(`Edicao do evento nao encontrada: ${edicaoId}`);
  }

  const configuracaoData = configuracaoResult.data;
  const itensData = Array.isArray(itensResult.data) ? itensResult.data : [];
  const regrasData = Array.isArray(regrasResult.data) ? regrasResult.data : [];
  const coreografiasData = Array.isArray(coreografiasResult.data) ? coreografiasResult.data : [];
  const estilosData = Array.isArray(estilosResult.data) ? estilosResult.data : [];
  const formacoesData = Array.isArray(formacoesResult.data) ? formacoesResult.data : [];
  const referenciasFinanceirasData = Array.isArray(referenciasFinanceirasResult.data)
    ? referenciasFinanceirasResult.data
    : [];
  const inscricoesHydrated = Array.isArray(inscricoesResult)
    ? (inscricoesResult as EventoEdicaoInscricoesData["inscricoes"])
    : [];
  const coreografias = enriquecerCoreografiasComCapacidade({
    coreografias: mapCoreografias(coreografiasData as CoreografiaRow[]),
    inscricoes: inscricoesHydrated,
  });
  const dashboard = buildDashboardInscricoes({
    inscricoes: inscricoesHydrated,
    referenciasFinanceiras: referenciasFinanceirasData as FinanceiroReferenciaRow[],
  });

  return {
    edicao: mapEdicao(edicaoData),
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
    inscricoes: inscricoesHydrated,
    coreografias,
    estilos: estilosData as CoreografiaEstiloResumo[],
    formacoes: formacoesData as CoreografiaFormacaoResumo[],
    itensFinanceiros: itensData as EventoEdicaoInscricoesData["itensFinanceiros"],
    formasPagamento: [],
    dashboard,
  };
}
