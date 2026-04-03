import type { SupabaseClient } from "@supabase/supabase-js";
import type {
  CoreografiaFormacao,
  CoreografiaEstiloPayload,
  CoreografiaEstiloUpdatePayload,
  CoreografiaMestrePayload,
  CoreografiaMestreUpdatePayload,
  EventoContratacaoPayload,
  EventoCoreografiaParticipantePayload,
  EventoDiaPayload,
  EventoEdicaoCalendarioPayload,
  EventoEdicaoCalendarioUpdatePayload,
  EventoEdicaoConfiguracaoPayload,
  EventoEdicaoPayload,
  EventoEdicaoCoreografiaVinculoPayload,
  EventoEdicaoCoreografiaVinculoUpdatePayload,
  EventoEscolaPayload,
  EventoEscolaUpdatePayload,
  EventoFinanceiroReferenciaPayload,
  EventoParticipanteExternoPayload,
  EventoParticipanteExternoUpdatePayload,
  EventoEdicaoInscricaoPayload,
  EventoEdicaoInscricaoUpdatePayload,
  EventoInscricaoItemPayload,
  EventoInscricaoPayload,
  EventoModalidadePayload,
  EventoSessaoAtividadePayload,
  EventoSessaoPayload,
  EventoTurmaVinculoPayload,
  EventoEdicaoUpdatePayload,
} from "@/lib/eventos/types";

type DbClient = SupabaseClient;

function normalizeCpfFromDocumento(value: string | null | undefined) {
  const digits = (value ?? "").replace(/\D/g, "");
  return digits.length === 11 ? digits : null;
}

const COREOGRAFIA_SELECT = `
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
  professor_responsavel_id,
  turma_base_id,
  observacoes,
  ativa,
  created_at,
  updated_at,
  formacao:coreografia_formacoes(
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
  estilo:coreografia_estilos(
    id,
    nome,
    slug,
    descricao,
    ativo,
    ordem_exibicao,
    created_at,
    updated_at
  )
`;

export async function insertEventoEscola(
  db: DbClient,
  payload: EventoEscolaPayload,
) {
  const insertPayload = {
    titulo: payload.titulo,
    descricao: payload.descricao ?? null,
    tipo_evento: payload.tipoEvento,
    natureza_evento: payload.naturezaEvento,
    abrangencia_evento: payload.abrangenciaEvento,
    contexto: "ESCOLA",
    centro_custo_codigo: "ESCOLA",
    publico_alvo: payload.publicoAlvo ?? null,
    ativo: payload.ativo ?? true,
  };

  const { data, error } = await db
    .from("eventos_escola")
    .insert(insertPayload)
    .select("*")
    .single();

  if (error) {
    console.error("SUPABASE EVENTO INSERT ERROR:", error);
    throw error;
  }

  return data;
}

export async function updateEventoEscola(
  db: DbClient,
  payload: EventoEscolaUpdatePayload,
) {
  const updatePayload: Record<string, unknown> = {
    updated_at: new Date().toISOString(),
  };

  if (payload.titulo !== undefined) updatePayload.titulo = payload.titulo;
  if (payload.descricao !== undefined) updatePayload.descricao = payload.descricao;
  if (payload.tipoEvento !== undefined) updatePayload.tipo_evento = payload.tipoEvento;
  if (payload.naturezaEvento !== undefined) {
    updatePayload.natureza_evento = payload.naturezaEvento;
  }
  if (payload.abrangenciaEvento !== undefined) {
    updatePayload.abrangencia_evento = payload.abrangenciaEvento;
  }
  if (payload.publicoAlvo !== undefined) updatePayload.publico_alvo = payload.publicoAlvo;
  if (payload.ativo !== undefined) updatePayload.ativo = payload.ativo;

  const { data, error } = await db
    .from("eventos_escola")
    .update(updatePayload)
    .eq("id", payload.eventoId)
    .select("*")
    .single();

  if (error) throw error;
  return data;
}

export async function insertEventoEdicao(
  db: DbClient,
  payload: EventoEdicaoPayload,
) {
  const { data, error } = await db
    .from("eventos_escola_edicoes")
    .insert({
      evento_id: payload.eventoId,
      titulo_exibicao: payload.tituloExibicao,
      tema: payload.tema ?? null,
      descricao: payload.descricao ?? null,
      ano_referencia: payload.anoReferencia,
      status: payload.status ?? "EM_PLANEJAMENTO",
      data_inicio: payload.dataInicio ?? null,
      data_fim: payload.dataFim ?? null,
      local_principal_nome: payload.localPrincipalNome ?? null,
      local_principal_endereco: payload.localPrincipalEndereco ?? null,
      local_principal_cidade: payload.localPrincipalCidade ?? null,
      regulamento_resumo: payload.regulamentoResumo ?? null,
      observacoes: payload.observacoes ?? null,
    })
    .select("*")
    .single();

  if (error) throw error;
  return data;
}

export async function updateEventoEdicao(
  db: DbClient,
  payload: EventoEdicaoUpdatePayload,
) {
  const updatePayload: Record<string, unknown> = {
    updated_at: new Date().toISOString(),
  };

  if (payload.tituloExibicao !== undefined) {
    updatePayload.titulo_exibicao = payload.tituloExibicao;
  }
  if (payload.tema !== undefined) updatePayload.tema = payload.tema;
  if (payload.descricao !== undefined) updatePayload.descricao = payload.descricao;
  if (payload.anoReferencia !== undefined) {
    updatePayload.ano_referencia = payload.anoReferencia;
  }
  if (payload.status !== undefined) updatePayload.status = payload.status;
  if (payload.dataInicio !== undefined) updatePayload.data_inicio = payload.dataInicio;
  if (payload.dataFim !== undefined) updatePayload.data_fim = payload.dataFim;
  if (payload.localPrincipalNome !== undefined) {
    updatePayload.local_principal_nome = payload.localPrincipalNome;
  }
  if (payload.localPrincipalEndereco !== undefined) {
    updatePayload.local_principal_endereco = payload.localPrincipalEndereco;
  }
  if (payload.localPrincipalCidade !== undefined) {
    updatePayload.local_principal_cidade = payload.localPrincipalCidade;
  }
  if (payload.regulamentoResumo !== undefined) {
    updatePayload.regulamento_resumo = payload.regulamentoResumo;
  }
  if (payload.observacoes !== undefined) updatePayload.observacoes = payload.observacoes;

  const { data, error } = await db
    .from("eventos_escola_edicoes")
    .update(updatePayload)
    .eq("id", payload.edicaoId)
    .select("*")
    .single();

  if (error) throw error;
  return data;
}

export async function insertEventoDia(db: DbClient, payload: EventoDiaPayload) {
  const { data, error } = await db
    .from("eventos_escola_dias")
    .insert({
      edicao_id: payload.edicaoId,
      data_evento: payload.dataEvento,
      titulo: payload.titulo ?? null,
      ordem: payload.ordem ?? null,
      status: payload.status ?? "PLANEJADO",
      observacoes: payload.observacoes ?? null,
    })
    .select("*")
    .single();

  if (error) throw error;
  return data;
}

export async function insertEventoSessao(
  db: DbClient,
  payload: EventoSessaoPayload,
) {
  const { data, error } = await db
    .from("eventos_escola_sessoes")
    .insert({
      edicao_id: payload.edicaoId,
      dia_id: payload.diaId,
      local_id: payload.localId ?? null,
      titulo: payload.titulo,
      subtitulo: payload.subtitulo ?? null,
      tipo_sessao: payload.tipoSessao,
      hora_inicio: payload.horaInicio ?? null,
      hora_fim: payload.horaFim ?? null,
      ordem: payload.ordem ?? null,
      status: payload.status ?? "PLANEJADA",
      capacidade_total: payload.capacidadeTotal ?? null,
      exige_ingresso: payload.exigeIngresso ?? false,
      usa_mapa_lugares: payload.usaMapaLugares ?? false,
      permite_publico_externo: payload.permitePublicoExterno ?? true,
      observacoes: payload.observacoes ?? null,
    })
    .select("*")
    .single();

  if (error) throw error;
  return data;
}

export async function insertEventoModalidade(
  db: DbClient,
  payload: EventoModalidadePayload,
) {
  const { data, error } = await db
    .from("eventos_escola_modalidades")
    .insert({
      edicao_id: payload.edicaoId,
      codigo: payload.codigo ?? null,
      nome: payload.nome,
      tipo_modalidade: payload.tipoModalidade,
      descricao: payload.descricao ?? null,
      obrigatoria: payload.obrigatoria ?? false,
      permite_multiplas_unidades: payload.permiteMultiplasUnidades ?? false,
      quantidade_minima: payload.quantidadeMinima ?? null,
      quantidade_maxima: payload.quantidadeMaxima ?? null,
      ativo: payload.ativo ?? true,
    })
    .select("*")
    .single();

  if (error) throw error;
  return data;
}

export async function insertEventoInscricao(
  db: DbClient,
  payload: EventoInscricaoPayload,
) {
  const { data, error } = await db
    .from("eventos_escola_inscricoes")
    .insert({
      edicao_id: payload.edicaoId,
      pessoa_id: payload.pessoaId,
      aluno_pessoa_id: payload.alunoPessoaId ?? null,
      responsavel_financeiro_id: payload.responsavelFinanceiroId ?? null,
      conta_interna_id: payload.contaInternaId ?? null,
      status_inscricao: "RASCUNHO",
      status_financeiro: "NAO_GERADO",
      observacoes: payload.observacoes ?? null,
    })
    .select("*")
    .single();

  if (error) throw error;
  return data;
}

export async function insertEventoInscricaoItem(
  db: DbClient,
  payload: EventoInscricaoItemPayload,
) {
  const quantidade = payload.quantidade ?? 1;
  const valorUnitarioCentavos = payload.valorUnitarioCentavos ?? 0;
  const valorTotalCentavos = quantidade * valorUnitarioCentavos;

  const { data, error } = await db
    .from("eventos_escola_inscricao_itens")
    .insert({
      inscricao_id: payload.inscricaoId,
      modalidade_id: payload.modalidadeId ?? null,
      subevento_id: payload.subeventoId ?? null,
      descricao: payload.descricao ?? null,
      quantidade,
      valor_unitario_centavos: valorUnitarioCentavos,
      valor_total_centavos: valorTotalCentavos,
      obrigatorio: payload.obrigatorio ?? false,
      origem_financeira: "EVENTO_ESCOLA",
      status: "ATIVO",
      observacoes: payload.observacoes ?? null,
    })
    .select("*")
    .single();

  if (error) throw error;
  return data;
}

export async function ensureEventoExists(db: DbClient, eventoId: string) {
  const { data, error } = await db
    .from("eventos_escola")
    .select("id")
    .eq("id", eventoId)
    .maybeSingle();

  if (error) throw error;
  if (!data) throw new Error("evento nao encontrado");
  return data;
}

export async function ensureEdicaoExists(db: DbClient, edicaoId: string) {
  const { data, error } = await db
    .from("eventos_escola_edicoes")
    .select("id, evento_id")
    .eq("id", edicaoId)
    .maybeSingle();

  if (error) throw error;
  if (!data) throw new Error("edicao nao encontrada");
  return data;
}

export async function ensureDiaExists(
  db: DbClient,
  diaId: string,
  edicaoId: string,
) {
  const { data, error } = await db
    .from("eventos_escola_dias")
    .select("id, edicao_id")
    .eq("id", diaId)
    .eq("edicao_id", edicaoId)
    .maybeSingle();

  if (error) throw error;
  if (!data) throw new Error("dia nao encontrado para a edicao informada");
  return data;
}

export async function ensureInscricaoExists(
  db: DbClient,
  inscricaoId: string,
) {
  const { data, error } = await db
    .from("eventos_escola_inscricoes")
    .select(
      `
        id,
        edicao_id,
        pessoa_id,
        aluno_pessoa_id,
        responsavel_financeiro_id,
        participante_externo_id,
        conta_interna_id,
        origem_inscricao,
        status_inscricao,
        status_financeiro,
        destino_financeiro,
        pagamento_no_ato,
        quantidade_parcelas_conta_interna,
        forma_pagamento_codigo,
        valor_total_centavos,
        participante_nome_snapshot
      `,
    )
    .eq("id", inscricaoId)
    .maybeSingle();

  if (error) throw error;
  if (!data) throw new Error("inscricao nao encontrada");
  return data;
}

export async function ensureInscricaoItemExists(
  db: DbClient,
  itemId: string,
) {
  const { data, error } = await db
    .from("eventos_escola_inscricao_itens")
    .select("*")
    .eq("id", itemId)
    .maybeSingle();

  if (error) throw error;
  if (!data) throw new Error("item da inscricao nao encontrado");
  return data;
}

export async function ensurePessoaExists(db: DbClient, pessoaId: number) {
  const { data, error } = await db
    .from("pessoas")
    .select("id")
    .eq("id", pessoaId)
    .maybeSingle();

  if (error) throw error;
  if (!data) throw new Error("pessoa nao encontrada");
  return data;
}

export async function insertEventoSessaoAtividade(
  db: DbClient,
  payload: EventoSessaoAtividadePayload,
) {
  const { data, error } = await db
    .from("eventos_escola_sessao_atividades")
    .insert({
      sessao_id: payload.sessaoId,
      local_id: payload.localId ?? null,
      tipo_atividade: payload.tipoAtividade,
      titulo: payload.titulo,
      descricao: payload.descricao ?? null,
      inicio: payload.inicio ?? null,
      fim: payload.fim ?? null,
      ordem: payload.ordem ?? null,
      aberta_ao_publico: payload.abertaAoPublico ?? false,
      coreografia_id: payload.coreografiaId ?? null,
      turma_id: payload.turmaId ?? null,
      observacoes: payload.observacoes ?? null,
    })
    .select("*")
    .single();

  if (error) throw error;
  return data;
}

export async function listCoreografiaEstilos(db: DbClient) {
  const { data, error } = await db
    .from("coreografia_estilos")
    .select("*")
    .order("ativo", { ascending: false })
    .order("ordem_exibicao", { ascending: true })
    .order("nome", { ascending: true });

  if (error) throw error;
  return data ?? [];
}

export async function listCoreografiaFormacoes(db: DbClient) {
  const { data, error } = await db
    .from("coreografia_formacoes")
    .select(
      "id, codigo, nome, quantidade_minima_padrao, quantidade_maxima_padrao, quantidade_fixa, ativa, created_at, updated_at",
    )
    .eq("ativa", true)
    .order("quantidade_fixa", { ascending: false })
    .order("quantidade_minima_padrao", { ascending: true })
    .order("nome", { ascending: true });

  if (error) throw error;
  return data ?? [];
}

export async function getCoreografiaFormacaoById(
  db: DbClient,
  formacaoId: string,
) {
  const { data, error } = await db
    .from("coreografia_formacoes")
    .select(
      "id, codigo, nome, quantidade_minima_padrao, quantidade_maxima_padrao, quantidade_fixa, ativa, created_at, updated_at",
    )
    .eq("id", formacaoId)
    .maybeSingle();

  if (error) throw error;
  return data;
}

export async function getCoreografiaFormacaoByCodigo(
  db: DbClient,
  codigo: CoreografiaFormacao,
) {
  const { data, error } = await db
    .from("coreografia_formacoes")
    .select(
      "id, codigo, nome, quantidade_minima_padrao, quantidade_maxima_padrao, quantidade_fixa, ativa, created_at, updated_at",
    )
    .eq("codigo", codigo)
    .maybeSingle();

  if (error) throw error;
  return data;
}

export async function getCoreografiaEstiloById(
  db: DbClient,
  estiloId: string,
) {
  const { data, error } = await db
    .from("coreografia_estilos")
    .select("*")
    .eq("id", estiloId)
    .maybeSingle();

  if (error) throw error;
  if (!data) throw new Error("estilo nao encontrado");
  return data;
}

export async function insertCoreografiaEstilo(
  db: DbClient,
  payload: CoreografiaEstiloPayload,
) {
  const { data, error } = await db
    .from("coreografia_estilos")
    .insert({
      nome: payload.nome,
      slug: payload.slug,
      descricao: payload.descricao ?? null,
      ativo: payload.ativo ?? true,
      ordem_exibicao: payload.ordemExibicao ?? 0,
    })
    .select("*")
    .single();

  if (error) throw error;
  return data;
}

export async function updateCoreografiaEstilo(
  db: DbClient,
  payload: CoreografiaEstiloUpdatePayload,
) {
  const updatePayload: Record<string, unknown> = {
    updated_at: new Date().toISOString(),
  };

  if (payload.nome !== undefined) updatePayload.nome = payload.nome;
  if (payload.slug !== undefined) updatePayload.slug = payload.slug;
  if (payload.descricao !== undefined) updatePayload.descricao = payload.descricao;
  if (payload.ativo !== undefined) updatePayload.ativo = payload.ativo;
  if (payload.ordemExibicao !== undefined) {
    updatePayload.ordem_exibicao = payload.ordemExibicao;
  }

  const { data, error } = await db
    .from("coreografia_estilos")
    .update(updatePayload)
    .eq("id", payload.estiloId)
    .select("*")
    .single();

  if (error) throw error;
  return data;
}

export async function archiveCoreografiaEstilo(
  db: DbClient,
  estiloId: string,
) {
  const { data, error } = await db
    .from("coreografia_estilos")
    .update({
      ativo: false,
      updated_at: new Date().toISOString(),
    })
    .eq("id", estiloId)
    .select("*")
    .single();

  if (error) throw error;
  return data;
}

export async function ensureCoreografiaEstiloExists(
  db: DbClient,
  estiloId: string,
) {
  const { data, error } = await db
    .from("coreografia_estilos")
    .select("id")
    .eq("id", estiloId)
    .maybeSingle();

  if (error) throw error;
  if (!data) throw new Error("estilo nao encontrado");
  return data;
}

export async function listCoreografiasMestres(db: DbClient) {
  const { data, error } = await db
    .from("coreografias")
    .select(COREOGRAFIA_SELECT)
    .order("ativa", { ascending: false })
    .order("nome", { ascending: true });

  if (error) throw error;
  return data ?? [];
}

export async function insertCoreografiaMestre(
  db: DbClient,
  payload: CoreografiaMestrePayload,
) {
  const insertPayload = {
    nome: payload.nome,
    descricao: payload.descricao ?? null,
    modalidade: payload.modalidade ?? null,
    formacao_id: payload.formacaoId,
    tipo_formacao: payload.tipoFormacao ?? "LIVRE",
    quantidade_minima_participantes:
      payload.quantidadeMinimaParticipantes ?? 1,
    quantidade_maxima_participantes:
      payload.quantidadeMaximaParticipantes ?? 20,
    duracao_estimada_segundos: payload.duracaoEstimadaSegundos ?? null,
    sugestao_musica: payload.sugestaoMusica ?? null,
    link_musica: payload.linkMusica ?? null,
    estilo_id: payload.estiloId,
    professor_responsavel_id: payload.professorResponsavelId ?? null,
    turma_base_id: payload.turmaBaseId ?? null,
    observacoes: payload.observacoes ?? null,
    ativa: payload.ativa ?? true,
  };

  const { data, error } = await db
    .from("coreografias")
    .insert(insertPayload)
    .select(COREOGRAFIA_SELECT)
    .single();

  if (error) throw error;
  return data;
}

export async function updateCoreografiaMestre(
  db: DbClient,
  payload: CoreografiaMestreUpdatePayload,
) {
  const updatePayload: Record<string, unknown> = {
    updated_at: new Date().toISOString(),
  };

  if (payload.nome !== undefined) updatePayload.nome = payload.nome;
  if (payload.descricao !== undefined) updatePayload.descricao = payload.descricao;
  if (payload.modalidade !== undefined) updatePayload.modalidade = payload.modalidade;
  if (payload.formacaoId !== undefined) updatePayload.formacao_id = payload.formacaoId;
  if (payload.tipoFormacao !== undefined) updatePayload.tipo_formacao = payload.tipoFormacao;
  if (payload.quantidadeMinimaParticipantes !== undefined) {
    updatePayload.quantidade_minima_participantes =
      payload.quantidadeMinimaParticipantes;
  }
  if (payload.quantidadeMaximaParticipantes !== undefined) {
    updatePayload.quantidade_maxima_participantes =
      payload.quantidadeMaximaParticipantes;
  }
  if (payload.duracaoEstimadaSegundos !== undefined) {
    updatePayload.duracao_estimada_segundos = payload.duracaoEstimadaSegundos;
  }
  if (payload.sugestaoMusica !== undefined) {
    updatePayload.sugestao_musica = payload.sugestaoMusica;
  }
  if (payload.linkMusica !== undefined) updatePayload.link_musica = payload.linkMusica;
  if (payload.estiloId !== undefined) updatePayload.estilo_id = payload.estiloId;
  if (payload.professorResponsavelId !== undefined) {
    updatePayload.professor_responsavel_id = payload.professorResponsavelId;
  }
  if (payload.turmaBaseId !== undefined) updatePayload.turma_base_id = payload.turmaBaseId;
  if (payload.observacoes !== undefined) updatePayload.observacoes = payload.observacoes;
  if (payload.ativa !== undefined) updatePayload.ativa = payload.ativa;

  const { data, error } = await db
    .from("coreografias")
    .update(updatePayload)
    .eq("id", payload.coreografiaId)
    .select(COREOGRAFIA_SELECT)
    .single();

  if (error) throw error;
  return data;
}

export async function archiveCoreografiaMestre(
  db: DbClient,
  coreografiaId: string,
) {
  const { data, error } = await db
    .from("coreografias")
    .update({
      ativa: false,
      updated_at: new Date().toISOString(),
    })
    .eq("id", coreografiaId)
    .select(COREOGRAFIA_SELECT)
    .single();

  if (error) throw error;
  return data;
}

export async function ensureCoreografiaMestreExists(
  db: DbClient,
  coreografiaId: string,
) {
  const { data, error } = await db
    .from("coreografias")
    .select(
      "id, estilo_id, formacao_id, tipo_formacao, quantidade_minima_participantes, quantidade_maxima_participantes",
    )
    .eq("id", coreografiaId)
    .maybeSingle();

  if (error) throw error;
  if (!data) throw new Error("coreografia nao encontrada");
  return data;
}

export async function insertEventoEdicaoCoreografiaVinculo(
  db: DbClient,
  payload: EventoEdicaoCoreografiaVinculoPayload,
) {
  const insertPayload = {
    edicao_id: payload.edicaoId,
    coreografia_id: payload.coreografiaId,
    subevento_id: payload.subeventoId ?? null,
    ordem_prevista_apresentacao: payload.ordemPrevistaApresentacao ?? null,
    valor_participacao_coreografia_centavos:
      payload.valorParticipacaoCoreografiaCentavos ?? null,
    duracao_prevista_no_evento_segundos:
      payload.duracaoPrevistaNoEventoSegundos ?? null,
    observacoes_do_evento: payload.observacoesDoEvento ?? null,
    ativa: payload.ativa ?? true,
  };

  const { data, error } = await db
    .from("eventos_escola_edicao_coreografias")
    .insert(insertPayload)
    .select("*")
    .single();

  if (error) throw error;
  return data;
}

export async function listEventoCoreografiasByEdicao(
  db: DbClient,
  edicaoId: string,
) {
  const { data, error } = await db
    .from("eventos_escola_edicao_coreografias")
    .select(
      `
        *,
        coreografia:coreografias(
          ${COREOGRAFIA_SELECT}
        ),
        participantes:eventos_escola_edicao_coreografia_elenco(*)
      `,
    )
    .eq("edicao_id", edicaoId)
    .order("ativa", { ascending: false })
    .order("ordem_prevista_apresentacao", { ascending: true })
    .order("created_at", { ascending: true });

  if (error) throw error;
  return data ?? [];
}

export async function ensureCoreografiaExists(
  db: DbClient,
  coreografiaId: string,
) {
  const { data, error } = await db
    .from("eventos_escola_edicao_coreografias")
    .select("id, edicao_id, coreografia_id")
    .eq("id", coreografiaId)
    .maybeSingle();

  if (error) throw error;
  if (!data) throw new Error("coreografia nao encontrada");
  return data;
}

export async function updateEventoEdicaoCoreografiaVinculo(
  db: DbClient,
  payload: EventoEdicaoCoreografiaVinculoUpdatePayload,
) {
  const updatePayload: Record<string, unknown> = {
    updated_at: new Date().toISOString(),
  };

  if (payload.subeventoId !== undefined) updatePayload.subevento_id = payload.subeventoId;
  if (payload.ordemPrevistaApresentacao !== undefined) {
    updatePayload.ordem_prevista_apresentacao = payload.ordemPrevistaApresentacao;
  }
  if (payload.valorParticipacaoCoreografiaCentavos !== undefined) {
    updatePayload.valor_participacao_coreografia_centavos =
      payload.valorParticipacaoCoreografiaCentavos;
  }
  if (payload.duracaoPrevistaNoEventoSegundos !== undefined) {
    updatePayload.duracao_prevista_no_evento_segundos =
      payload.duracaoPrevistaNoEventoSegundos;
  }
  if (payload.observacoesDoEvento !== undefined) {
    updatePayload.observacoes_do_evento = payload.observacoesDoEvento;
  }
  if (payload.ativa !== undefined) updatePayload.ativa = payload.ativa;

  const { data, error } = await db
    .from("eventos_escola_edicao_coreografias")
    .update(updatePayload)
    .eq("id", payload.vinculoId)
    .eq("edicao_id", payload.edicaoId)
    .select("*")
    .single();

  if (error) throw error;
  return data;
}

export async function archiveEventoCoreografia(
  db: DbClient,
  edicaoId: string,
  coreografiaId: string,
) {
  const { data, error } = await db
    .from("eventos_escola_edicao_coreografias")
    .update({
      ativa: false,
      updated_at: new Date().toISOString(),
    })
    .eq("id", coreografiaId)
    .eq("edicao_id", edicaoId)
    .select("*")
    .single();

  if (error) throw error;
  return data;
}

export async function insertEventoCoreografiaParticipante(
  db: DbClient,
  payload: EventoCoreografiaParticipantePayload,
) {
  const { data, error } = await db
    .from("eventos_escola_edicao_coreografia_elenco")
    .insert({
      edicao_coreografia_id: payload.coreografiaId,
      pessoa_id: payload.pessoaId ?? null,
      aluno_id: payload.alunoId ?? null,
      inscricao_id: payload.inscricaoId ?? null,
      tipo_participante: payload.tipoParticipante ?? null,
      ordem_interna: payload.ordemInterna ?? null,
      papel: payload.papel ?? null,
      observacao: payload.observacoes ?? null,
      ativo: payload.ativo ?? true,
    })
    .select("*")
    .single();

  if (error) throw error;
  return data;
}

export async function insertEventoTurmaVinculo(
  db: DbClient,
  payload: EventoTurmaVinculoPayload,
) {
  const { data, error } = await db
    .from("eventos_escola_turmas_vinculos")
    .insert({
      edicao_id: payload.edicaoId,
      sessao_id: payload.sessaoId ?? null,
      turma_id: payload.turmaId,
      tipo_vinculo: payload.tipoVinculo,
      coreografia_id: payload.coreografiaId ?? null,
      descricao: payload.descricao ?? null,
    })
    .select("*")
    .single();

  if (error) throw error;
  return data;
}

export async function insertEventoContratacao(
  db: DbClient,
  payload: EventoContratacaoPayload,
) {
  const { data, error } = await db
    .from("eventos_escola_contratacoes")
    .insert({
      edicao_id: payload.edicaoId,
      sessao_id: payload.sessaoId ?? null,
      prestador_pessoa_id: payload.prestadorPessoaId ?? null,
      tipo_servico: payload.tipoServico,
      descricao: payload.descricao ?? null,
      valor_previsto_centavos: payload.valorPrevistoCentavos ?? 0,
      valor_contratado_centavos: payload.valorContratadoCentavos ?? null,
      contrato_acessorio_emitido_id: payload.contratoAcessorioEmitidoId ?? null,
      conta_pagar_id: payload.contaPagarId ?? null,
      status: payload.status ?? "RASCUNHO",
      observacoes: payload.observacoes ?? null,
    })
    .select("*")
    .single();

  if (error) throw error;
  return data;
}

export async function insertEventoFinanceiroReferencia(
  db: DbClient,
  payload: EventoFinanceiroReferenciaPayload,
) {
  const { data, error } = await db
    .from("eventos_escola_financeiro_referencias")
    .insert({
      edicao_id: payload.edicaoId,
      sessao_id: payload.sessaoId ?? null,
      natureza: payload.natureza,
      origem_tipo: payload.origemTipo,
      origem_id: payload.origemId ?? null,
      pessoa_id: payload.pessoaId ?? null,
      descricao: payload.descricao ?? null,
      valor_previsto_centavos: payload.valorPrevistoCentavos ?? null,
      valor_real_centavos: payload.valorRealCentavos ?? null,
      conta_interna_id: payload.contaInternaId ?? null,
      cobranca_id: payload.cobrancaId ?? null,
      recebimento_id: payload.recebimentoId ?? null,
      conta_pagar_id: payload.contaPagarId ?? null,
      pagamento_conta_pagar_id: payload.pagamentoContaPagarId ?? null,
      movimento_financeiro_id: payload.movimentoFinanceiroId ?? null,
      observacoes: payload.observacoes ?? null,
    })
    .select("*")
    .single();

  if (error) throw error;
  return data;
}

export async function ensureSessaoExists(db: DbClient, sessaoId: string) {
  const { data, error } = await db
    .from("eventos_escola_sessoes")
    .select("id, edicao_id")
    .eq("id", sessaoId)
    .maybeSingle();

  if (error) throw error;
  if (!data) throw new Error("sessao nao encontrada");
  return data;
}

export async function ensureTurmaExists(db: DbClient, turmaId: number) {
  const { data, error } = await db
    .from("turmas")
    .select("turma_id")
    .eq("turma_id", turmaId)
    .maybeSingle();

  if (error) throw error;
  if (!data) throw new Error("turma nao encontrada");
  return data;
}

export async function ensureGrupoExists(db: DbClient, grupoId: number) {
  const { data, error } = await db
    .from("aluno_grupos")
    .select("id")
    .eq("id", grupoId)
    .maybeSingle();

  if (error) throw error;
  if (!data) throw new Error("grupo nao encontrado");
  return data;
}

export async function listEventoEdicaoCalendarioItems(
  db: DbClient,
  edicaoId: string,
) {
  const { data, error } = await db
    .from("eventos_escola_edicao_calendario_itens")
    .select("*")
    .eq("edicao_id", edicaoId)
    .eq("ativo", true)
    .order("inicio", { ascending: true })
    .order("ordem", { ascending: true });

  if (error) throw error;
  return data ?? [];
}

export async function insertEventoEdicaoCalendarioItem(
  db: DbClient,
  payload: EventoEdicaoCalendarioPayload,
) {
  const { data, error } = await db
    .from("eventos_escola_edicao_calendario_itens")
    .insert({
      edicao_id: payload.edicaoId,
      tipo: payload.tipo,
      titulo: payload.titulo,
      descricao: payload.descricao ?? null,
      inicio: payload.inicio,
      fim: payload.fim ?? null,
      dia_inteiro: payload.diaInteiro ?? false,
      local_nome: payload.localNome ?? null,
      cidade: payload.cidade ?? null,
      endereco: payload.endereco ?? null,
      reflete_no_calendario_escola: payload.refleteNoCalendarioEscola ?? false,
      turma_id: payload.turmaId ?? null,
      grupo_id: payload.grupoId ?? null,
      ordem: payload.ordem ?? null,
      ativo: payload.ativo ?? true,
    })
    .select("*")
    .single();

  if (error) throw error;
  return data;
}

export async function ensureEventoEdicaoCalendarioItemExists(
  db: DbClient,
  itemId: string,
  edicaoId: string,
) {
  const { data, error } = await db
    .from("eventos_escola_edicao_calendario_itens")
    .select("id, edicao_id, inicio, fim, ativo")
    .eq("id", itemId)
    .eq("edicao_id", edicaoId)
    .maybeSingle();

  if (error) throw error;
  if (!data) throw new Error("item do calendario nao encontrado");
  return data;
}

export async function updateEventoEdicaoCalendarioItem(
  db: DbClient,
  payload: EventoEdicaoCalendarioUpdatePayload,
) {
  const updatePayload: Record<string, unknown> = {
    updated_at: new Date().toISOString(),
  };

  if (payload.tipo !== undefined) updatePayload.tipo = payload.tipo;
  if (payload.titulo !== undefined) updatePayload.titulo = payload.titulo;
  if (payload.descricao !== undefined) updatePayload.descricao = payload.descricao;
  if (payload.inicio !== undefined) updatePayload.inicio = payload.inicio;
  if (payload.fim !== undefined) updatePayload.fim = payload.fim;
  if (payload.diaInteiro !== undefined) updatePayload.dia_inteiro = payload.diaInteiro;
  if (payload.localNome !== undefined) updatePayload.local_nome = payload.localNome;
  if (payload.cidade !== undefined) updatePayload.cidade = payload.cidade;
  if (payload.endereco !== undefined) updatePayload.endereco = payload.endereco;
  if (payload.refleteNoCalendarioEscola !== undefined) {
    updatePayload.reflete_no_calendario_escola = payload.refleteNoCalendarioEscola;
  }
  if (payload.turmaId !== undefined) updatePayload.turma_id = payload.turmaId;
  if (payload.grupoId !== undefined) updatePayload.grupo_id = payload.grupoId;
  if (payload.ordem !== undefined) updatePayload.ordem = payload.ordem;
  if (payload.ativo !== undefined) updatePayload.ativo = payload.ativo;

  const { data, error } = await db
    .from("eventos_escola_edicao_calendario_itens")
    .update(updatePayload)
    .eq("id", payload.itemId)
    .eq("edicao_id", payload.edicaoId)
    .select("*")
    .single();

  if (error) throw error;
  return data;
}

export async function archiveEventoEdicaoCalendarioItem(
  db: DbClient,
  edicaoId: string,
  itemId: string,
) {
  const { data, error } = await db
    .from("eventos_escola_edicao_calendario_itens")
    .update({
      ativo: false,
      updated_at: new Date().toISOString(),
    })
    .eq("id", itemId)
    .eq("edicao_id", edicaoId)
    .select("*")
    .single();

  if (error) throw error;
  return data;
}

export async function getEventoEdicaoConfiguracao(
  db: DbClient,
  edicaoId: string,
) {
  const [
    { data: configuracao, error: configuracaoError },
    { data: itens, error: itensError },
    { data: regras, error: regrasError },
  ] = await Promise.all([
    db
      .from("eventos_escola_edicao_configuracoes")
      .select("*")
      .eq("edicao_id", edicaoId)
      .maybeSingle(),
    db
      .from("eventos_escola_edicao_itens_financeiros")
      .select(
        "id, codigo, nome, descricao, tipo_item, modo_cobranca, valor_centavos, ativo, ordem, metadata",
      )
      .eq("edicao_id", edicaoId)
      .order("ordem", { ascending: true }),
    db
      .from("eventos_escola_edicao_regras_financeiras")
      .select(
        "id, tipo_regra, modo_calculo, descricao_regra, formacao_coreografia, estilo_id, modalidade_nome, ordem_progressao, quantidade_minima, quantidade_maxima, valor_centavos, valor_por_participante_centavos, ativa, ordem_aplicacao, metadata",
      )
      .eq("edicao_id", edicaoId)
      .order("ordem_aplicacao", { ascending: true })
      .order("created_at", { ascending: true }),
  ]);

  if (configuracaoError) throw configuracaoError;
  if (itensError) throw itensError;
  if (regrasError) throw regrasError;
  if (!configuracao) return null;

  return {
    ...configuracao,
    itensFinanceiros: itens ?? [],
    regrasFinanceiras: regras ?? [],
  };
}

export async function upsertEventoEdicaoConfiguracao(
  db: DbClient,
  payload: EventoEdicaoConfiguracaoPayload,
) {
  const configuracaoPayload = {
    edicao_id: payload.edicaoId,
    cobra_taxa_participacao_geral: payload.cobraTaxaParticipacaoGeral ?? false,
    cobra_por_coreografia: payload.cobraPorCoreografia ?? false,
    cobra_por_pacote: payload.cobraPorPacote ?? false,
    permite_itens_adicionais: payload.permiteItensAdicionais ?? false,
    permite_pagamento_no_ato: payload.permitePagamentoNoAto ?? true,
    permite_conta_interna: payload.permiteContaInterna ?? true,
    permite_parcelamento_conta_interna:
      payload.permiteParcelamentoContaInterna ?? false,
    exige_inscricao_geral: payload.exigeInscricaoGeral ?? true,
    permite_inscricao_por_coreografia:
      payload.permiteInscricaoPorCoreografia ?? true,
    permite_vincular_coreografia_depois:
      payload.permiteVincularCoreografiaDepois ?? true,
    participacao_por_aluno: payload.participacaoPorAluno ?? true,
    participacao_por_turma: payload.participacaoPorTurma ?? false,
    participacao_por_grupo: payload.participacaoPorGrupo ?? false,
    participacao_por_coreografia: payload.participacaoPorCoreografia ?? true,
    permite_multiplas_coreografias_aluno:
      payload.permiteMultiplasCoreografiasAluno ?? false,
    valor_taxa_participacao_centavos: payload.valorTaxaParticipacaoCentavos ?? 0,
    modo_composicao_valor: payload.modoComposicaoValor ?? "VALOR_FIXO",
    modo_cobranca: payload.modoCobranca ?? "UNICA",
    quantidade_maxima_parcelas: payload.quantidadeMaximaParcelas ?? 1,
    maximo_parcelas_conta_interna: payload.maximoParcelasContaInterna ?? 1,
    competencias_elegiveis_conta_interna:
      payload.competenciasElegiveisContaInterna ?? [],
    permite_competencias_apos_evento:
      payload.permiteCompetenciasAposEvento ?? false,
    dia_corte_operacional_parcelamento:
      payload.diaCorteOperacionalParcelamento ?? null,
    gera_conta_interna_automaticamente:
      payload.geraContaInternaAutomaticamente ?? false,
    regras_adicionais: payload.regrasAdicionais ?? {},
    updated_at: new Date().toISOString(),
  };

  const { data: configuracao, error: configuracaoError } = await db
    .from("eventos_escola_edicao_configuracoes")
    .upsert(configuracaoPayload, { onConflict: "edicao_id" })
    .select("*")
    .single();

  if (configuracaoError) throw configuracaoError;

  if ((payload.itensFinanceiros?.length ?? 0) > 0) {
    const timestamp = new Date().toISOString();
    const itensExistentes = (payload.itensFinanceiros ?? [])
      .filter((item) => typeof item.id === "string" && item.id.length > 0)
      .map((item) => ({
        id: item.id as string,
        edicao_id: payload.edicaoId,
        codigo: item.codigo ?? null,
        nome: item.nome,
        descricao: item.descricao ?? null,
        tipo_item: item.tipoItem,
        modo_cobranca: item.modoCobranca ?? "UNICO",
        valor_centavos: item.valorCentavos ?? 0,
        ativo: item.ativo ?? true,
        ordem: item.ordem ?? null,
        metadata: item.metadata ?? {},
        updated_at: timestamp,
      }));
    const itensNovos = (payload.itensFinanceiros ?? [])
      .filter((item) => !(typeof item.id === "string" && item.id.length > 0))
      .map((item) => ({
        edicao_id: payload.edicaoId,
        codigo: item.codigo ?? null,
        nome: item.nome,
        descricao: item.descricao ?? null,
        tipo_item: item.tipoItem,
        modo_cobranca: item.modoCobranca ?? "UNICO",
        valor_centavos: item.valorCentavos ?? 0,
        ativo: item.ativo ?? true,
        ordem: item.ordem ?? null,
        metadata: item.metadata ?? {},
        updated_at: timestamp,
      }));

    if (itensExistentes.length > 0) {
      const { error: itensExistentesError } = await db
        .from("eventos_escola_edicao_itens_financeiros")
        .upsert(itensExistentes, { onConflict: "id" });

      if (itensExistentesError) throw itensExistentesError;
    }

    if (itensNovos.length > 0) {
      const { error: itensNovosError } = await db
        .from("eventos_escola_edicao_itens_financeiros")
        .insert(itensNovos);

      if (itensNovosError) throw itensNovosError;
    }
  }

  const { error: deleteRegrasError } = await db
    .from("eventos_escola_edicao_regras_financeiras")
    .delete()
    .eq("edicao_id", payload.edicaoId);

  if (deleteRegrasError) throw deleteRegrasError;

  if ((payload.regrasFinanceiras?.length ?? 0) > 0) {
    const regrasPayload = (payload.regrasFinanceiras ?? []).map((regra) => ({
      edicao_id: payload.edicaoId,
      tipo_regra: regra.tipoRegra,
      modo_calculo: regra.modoCalculo ?? "VALOR_FIXO",
      descricao_regra: regra.descricaoRegra ?? null,
      formacao_coreografia: regra.formacaoCoreografia ?? null,
      estilo_id: regra.estiloId ?? null,
      modalidade_nome: regra.modalidadeNome ?? null,
      ordem_progressao: regra.ordemProgressao ?? null,
      quantidade_minima: regra.quantidadeMinima ?? null,
      quantidade_maxima: regra.quantidadeMaxima ?? null,
      valor_centavos: regra.valorCentavos ?? 0,
      valor_por_participante_centavos:
        regra.valorPorParticipanteCentavos ?? null,
      ativa: regra.ativa ?? true,
      ordem_aplicacao: regra.ordemAplicacao ?? 0,
      metadata: regra.metadata ?? {},
      updated_at: new Date().toISOString(),
    }));

    const { error: regrasInsertError } = await db
      .from("eventos_escola_edicao_regras_financeiras")
      .insert(regrasPayload);

    if (regrasInsertError) throw regrasInsertError;
  }

  return (await getEventoEdicaoConfiguracao(db, payload.edicaoId)) ?? configuracao;
}

const EVENTO_EDICAO_INSCRICAO_SELECT = `
  id,
  edicao_id,
  pessoa_id,
  aluno_pessoa_id,
  responsavel_financeiro_id,
  participante_externo_id,
  conta_interna_id,
  origem_inscricao,
  status_inscricao,
  status_financeiro,
  financeiro_status,
  financeiro_erro_codigo,
  financeiro_erro_detalhe,
  financeiro_processado_em,
  data_inscricao,
  observacoes,
  destino_financeiro,
  gerar_em_conta_interna,
  pagamento_no_ato,
  modalidade_pagamento_financeiro,
  valor_total_centavos,
  valor_pago_ato_centavos,
  valor_saldo_conta_interna_centavos,
  participante_nome_snapshot,
  quantidade_parcelas_conta_interna,
  cobranca_id,
  cobranca_avulsa_id,
  recebimento_id,
  lancamento_conta_interna_id,
  fatura_conta_interna_id,
  forma_pagamento_codigo,
  created_at,
  updated_at,
  itens:eventos_escola_inscricao_itens(
    id,
    inscricao_id,
    modalidade_id,
    subevento_id,
    descricao,
    descricao_snapshot,
    quantidade,
    valor_unitario_centavos,
    valor_total_centavos,
    obrigatorio,
    origem_financeira,
    lancamento_conta_interna_id,
    status,
    origem_item,
    cancelado_em,
    motivo_cancelamento,
    observacoes,
    tipo_item,
    item_configuracao_id,
    coreografia_vinculo_id,
    created_at,
    updated_at
  )
`;

export async function listEventoParticipantesExternos(
  db: DbClient,
  options?: { ativo?: boolean | null },
) {
  let query = db
    .from("eventos_escola_participantes_externos")
    .select("*")
    .order("ativo", { ascending: false })
    .order("created_at", { ascending: false });

  if (options?.ativo !== undefined && options.ativo !== null) {
    query = query.eq("ativo", options.ativo);
  }

  const { data, error } = await query;

  if (error) throw error;
  return data ?? [];
}

export async function listEventoParticipantesExternosByIds(
  db: DbClient,
  participanteIds: string[],
) {
  if (participanteIds.length === 0) return [];

  const { data, error } = await db
    .from("eventos_escola_participantes_externos")
    .select("*")
    .in("id", participanteIds);

  if (error) throw error;
  return data ?? [];
}

export async function getEventoParticipanteExternoById(
  db: DbClient,
  participanteExternoId: string,
) {
  const { data, error } = await db
    .from("eventos_escola_participantes_externos")
    .select("*")
    .eq("id", participanteExternoId)
    .maybeSingle();

  if (error) throw error;
  if (!data) throw new Error("participante externo nao encontrado");
  return data;
}

export async function ensureParticipanteExternoExists(
  db: DbClient,
  participanteExternoId: string,
) {
  return getEventoParticipanteExternoById(db, participanteExternoId);
}

export async function insertEventoParticipanteExterno(
  db: DbClient,
  payload: EventoParticipanteExternoPayload,
  userId?: string | null,
) {
  const pessoaPayload = {
    nome: payload.nome,
    email: payload.email ?? null,
    telefone: payload.telefone ?? null,
    nascimento: payload.dataNascimento ?? null,
    cpf: normalizeCpfFromDocumento(payload.documento),
    observacoes: payload.observacoes ?? null,
    ativo: payload.ativo ?? true,
    created_by: userId ?? null,
    updated_by: userId ?? null,
  };

  const { data: pessoa, error: pessoaError } = await db
    .from("pessoas")
    .insert(pessoaPayload)
    .select("id, nome, email, telefone, nascimento, cpf, ativo, observacoes")
    .single();

  if (pessoaError) throw pessoaError;

  const { data, error } = await db
    .from("eventos_escola_participantes_externos")
    .insert({
      pessoa_id: pessoa.id,
      documento: payload.documento ?? null,
      responsavel_nome: payload.responsavelNome ?? null,
      observacoes: payload.observacoes ?? null,
      ativo: payload.ativo ?? true,
    })
    .select("*")
    .single();

  if (error) throw error;
  return { ...data, pessoa };
}

export async function updateEventoParticipanteExterno(
  db: DbClient,
  payload: EventoParticipanteExternoUpdatePayload,
  userId?: string | null,
) {
  const participante = await getEventoParticipanteExternoById(
    db,
    payload.participanteExternoId,
  );

  const pessoaUpdatePayload: Record<string, unknown> = {
    updated_at: new Date().toISOString(),
    updated_by: userId ?? null,
  };

  if (payload.nome !== undefined) pessoaUpdatePayload.nome = payload.nome;
  if (payload.email !== undefined) pessoaUpdatePayload.email = payload.email;
  if (payload.telefone !== undefined) pessoaUpdatePayload.telefone = payload.telefone;
  if (payload.dataNascimento !== undefined) {
    pessoaUpdatePayload.nascimento = payload.dataNascimento;
  }
  if (payload.documento !== undefined) {
    pessoaUpdatePayload.cpf = normalizeCpfFromDocumento(payload.documento);
  }
  if (payload.observacoes !== undefined) {
    pessoaUpdatePayload.observacoes = payload.observacoes;
  }
  if (payload.ativo !== undefined) pessoaUpdatePayload.ativo = payload.ativo;

  const { data: pessoa, error: pessoaError } = await db
    .from("pessoas")
    .update(pessoaUpdatePayload)
    .eq("id", participante.pessoa_id)
    .select("id, nome, email, telefone, nascimento, cpf, ativo, observacoes")
    .single();

  if (pessoaError) throw pessoaError;

  const participanteUpdatePayload: Record<string, unknown> = {
    updated_at: new Date().toISOString(),
  };

  if (payload.responsavelNome !== undefined) {
    participanteUpdatePayload.responsavel_nome = payload.responsavelNome;
  }
  if (payload.documento !== undefined) {
    participanteUpdatePayload.documento = payload.documento;
  }
  if (payload.observacoes !== undefined) {
    participanteUpdatePayload.observacoes = payload.observacoes;
  }
  if (payload.ativo !== undefined) participanteUpdatePayload.ativo = payload.ativo;

  const { data, error } = await db
    .from("eventos_escola_participantes_externos")
    .update(participanteUpdatePayload)
    .eq("id", payload.participanteExternoId)
    .select("*")
    .single();

  if (error) throw error;
  return { ...data, pessoa };
}

export async function listPessoasByIds(db: DbClient, pessoaIds: number[]) {
  if (pessoaIds.length === 0) return [];

  const { data, error } = await db
    .from("pessoas")
    .select("id, nome, email, telefone, cpf, nascimento, ativo")
    .in("id", pessoaIds);

  if (error) throw error;
  return data ?? [];
}

export async function getAlunoMatriculaAtual(
  db: DbClient,
  alunoPessoaId: number,
) {
  const { data, error } = await db
    .from("matriculas")
    .select("id, pessoa_id, responsavel_financeiro_id, status, ano_referencia")
    .eq("pessoa_id", alunoPessoaId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) throw error;
  return data;
}

export async function listEventoEdicaoItemFinanceirosByIds(
  db: DbClient,
  edicaoId: string,
  itemIds: string[],
) {
  if (itemIds.length === 0) return [];

  const { data, error } = await db
    .from("eventos_escola_edicao_itens_financeiros")
    .select(
      "id, edicao_id, codigo, nome, descricao, tipo_item, modo_cobranca, valor_centavos, ativo, ordem, metadata",
    )
    .eq("edicao_id", edicaoId)
    .in("id", itemIds);

  if (error) throw error;
  return data ?? [];
}

export async function listEventoEdicaoCoreografiaVinculosByIds(
  db: DbClient,
  edicaoId: string,
  vinculoIds: string[],
) {
  if (vinculoIds.length === 0) return [];

  const { data, error } = await db
    .from("eventos_escola_edicao_coreografias")
    .select(
      `
        id,
        edicao_id,
        coreografia_id,
        ordem_prevista_apresentacao,
        valor_participacao_coreografia_centavos,
        duracao_prevista_no_evento_segundos,
        observacoes_do_evento,
        ativa,
        coreografia:coreografias(
          id,
          nome,
          modalidade,
          formacao_id,
          tipo_formacao,
          quantidade_minima_participantes,
          quantidade_maxima_participantes,
          duracao_estimada_segundos,
          estilo_id,
          formacao:coreografia_formacoes(
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
          estilo:coreografia_estilos(
            nome
          )
        )
      `,
    )
    .eq("edicao_id", edicaoId)
    .in("id", vinculoIds);

  if (error) throw error;

  const order = new Map(vinculoIds.map((id, index) => [id, index]));
  return [...(data ?? [])].sort(
    (left, right) =>
      (order.get(String(left.id)) ?? Number.MAX_SAFE_INTEGER) -
      (order.get(String(right.id)) ?? Number.MAX_SAFE_INTEGER),
  );
}

export async function insertEventoEdicaoInscricao(
  db: DbClient,
  payload: EventoEdicaoInscricaoPayload & {
    pessoaId: number;
    contaInternaId?: number | null;
    participanteNomeSnapshot?: string | null;
    valorTotalCentavos?: number | null;
    modalidadePagamentoFinanceiro?: "ATO_TOTAL" | "CONTA_INTERNA_TOTAL" | "MISTO" | null;
    valorPagoAtoCentavos?: number | null;
    valorSaldoContaInternaCentavos?: number | null;
  },
) {
  const insertPayload = {
    edicao_id: payload.edicaoId,
    pessoa_id: payload.pessoaId,
    aluno_pessoa_id: payload.alunoPessoaId ?? null,
    responsavel_financeiro_id: payload.responsavelFinanceiroId ?? null,
    participante_externo_id: payload.participanteExternoId ?? null,
    conta_interna_id: payload.contaInternaId ?? null,
    origem_inscricao: payload.origemInscricao,
    status_inscricao: "RASCUNHO",
    status_financeiro: "NAO_GERADO",
    financeiro_status: "PENDENTE",
    financeiro_erro_codigo: null,
    financeiro_erro_detalhe: null,
    financeiro_processado_em: null,
    observacoes: payload.observacoes ?? null,
    destino_financeiro: payload.destinoFinanceiro ?? "CONTA_INTERNA",
    gerar_em_conta_interna: payload.destinoFinanceiro === "CONTA_INTERNA",
    pagamento_no_ato: payload.pagamentoNoAto ?? false,
    modalidade_pagamento_financeiro:
      payload.modalidadePagamentoFinanceiro ?? null,
    participante_nome_snapshot: payload.participanteNomeSnapshot ?? null,
    quantidade_parcelas_conta_interna:
      payload.quantidadeParcelasContaInterna ?? 1,
    valor_total_centavos: payload.valorTotalCentavos ?? 0,
    valor_pago_ato_centavos: payload.valorPagoAtoCentavos ?? 0,
    valor_saldo_conta_interna_centavos:
      payload.valorSaldoContaInternaCentavos ?? 0,
    forma_pagamento_codigo: payload.formaPagamentoCodigo ?? null,
  };

  const { data, error } = await db
    .from("eventos_escola_inscricoes")
    .insert(insertPayload)
    .select(EVENTO_EDICAO_INSCRICAO_SELECT)
    .single();

  if (error) throw error;
  return data;
}

export async function updateEventoEdicaoInscricaoResumoFinanceiro(
  db: DbClient,
  inscricaoId: string,
  patch: {
    modalidadePagamentoFinanceiro?:
      | "ATO_TOTAL"
      | "CONTA_INTERNA_TOTAL"
      | "MISTO"
      | null;
    valorPagoAtoCentavos?: number;
    valorSaldoContaInternaCentavos?: number;
  },
) {
  const updatePayload: Record<string, unknown> = {
    updated_at: new Date().toISOString(),
  };

  if (patch.modalidadePagamentoFinanceiro !== undefined) {
    updatePayload.modalidade_pagamento_financeiro =
      patch.modalidadePagamentoFinanceiro;
  }
  if (patch.valorPagoAtoCentavos !== undefined) {
    updatePayload.valor_pago_ato_centavos = patch.valorPagoAtoCentavos;
  }
  if (patch.valorSaldoContaInternaCentavos !== undefined) {
    updatePayload.valor_saldo_conta_interna_centavos =
      patch.valorSaldoContaInternaCentavos;
  }

  const { data, error } = await db
    .from("eventos_escola_inscricoes")
    .update(updatePayload)
    .eq("id", inscricaoId)
    .select(EVENTO_EDICAO_INSCRICAO_SELECT)
    .single();

  if (error) throw error;
  return data;
}

export async function insertEventoEdicaoInscricaoPagamento(
  db: DbClient,
  payload: {
    inscricaoId: string;
    tipoPagamento: "ATO" | "AJUSTE" | "QUITACAO";
    formaPagamentoId?: number | null;
    valorCentavos: number;
    recebimentoId?: number | null;
    movimentoFinanceiroId?: number | null;
    observacoes?: string | null;
    createdBy?: string | null;
  },
) {
  const { data, error } = await db
    .from("eventos_escola_inscricao_pagamentos")
    .insert({
      inscricao_id: payload.inscricaoId,
      tipo_pagamento: payload.tipoPagamento,
      forma_pagamento_id: payload.formaPagamentoId ?? null,
      valor_centavos: payload.valorCentavos,
      recebimento_id: payload.recebimentoId ?? null,
      movimento_financeiro_id: payload.movimentoFinanceiroId ?? null,
      observacoes: payload.observacoes ?? null,
      created_by: payload.createdBy ?? null,
    })
    .select("*")
    .single();

  if (error) throw error;
  return data;
}

export async function insertEventoEdicaoInscricaoItens(
  db: DbClient,
  itens: Array<{
    inscricaoId: string;
    tipoItem: "EVENTO_GERAL" | "ITEM_EDICAO" | "COREOGRAFIA";
    itemConfiguracaoId?: string | null;
    coreografiaVinculoId?: string | null;
    descricaoSnapshot: string;
    quantidade: number;
    valorUnitarioCentavos: number;
    valorTotalCentavos: number;
    observacoes?: string | null;
    obrigatorio?: boolean;
    origemItem?: "INSCRICAO_INICIAL" | "AMPLIACAO_POSTERIOR";
  }>,
) {
  if (itens.length === 0) return [];

  const now = new Date().toISOString();
  const insertPayload = itens.map((item) => ({
    inscricao_id: item.inscricaoId,
    modalidade_id: null,
    subevento_id: null,
    descricao: item.descricaoSnapshot,
    descricao_snapshot: item.descricaoSnapshot,
    quantidade: item.quantidade,
    valor_unitario_centavos: item.valorUnitarioCentavos,
    valor_total_centavos: item.valorTotalCentavos,
    obrigatorio: item.obrigatorio ?? false,
    origem_financeira: "EVENTO_ESCOLA",
    status: "ATIVO",
    origem_item: item.origemItem ?? "INSCRICAO_INICIAL",
    observacoes: item.observacoes ?? null,
    tipo_item: item.tipoItem,
    item_configuracao_id: item.itemConfiguracaoId ?? null,
    coreografia_vinculo_id: item.coreografiaVinculoId ?? null,
    updated_at: now,
  }));

  const { data, error } = await db
    .from("eventos_escola_inscricao_itens")
    .insert(insertPayload)
    .select("*");

  if (error) throw error;
  return data ?? [];
}

export async function updateEventoEdicaoInscricaoItemCancelamento(
  db: DbClient,
  params: {
    inscricaoId: string;
    itemId: string;
    motivoCancelamento?: string | null;
  },
) {
  const now = new Date().toISOString();
  const { data, error } = await db
    .from("eventos_escola_inscricao_itens")
    .update({
      status: "CANCELADO",
      cancelado_em: now,
      motivo_cancelamento: params.motivoCancelamento ?? null,
      updated_at: now,
    })
    .eq("id", params.itemId)
    .eq("inscricao_id", params.inscricaoId)
    .select("*")
    .single();

  if (error) throw error;
  return data;
}

export async function listEventoEdicaoInscricoes(
  db: DbClient,
  edicaoId: string,
) {
  const { data, error } = await db
    .from("eventos_escola_inscricoes")
    .select(EVENTO_EDICAO_INSCRICAO_SELECT)
    .eq("edicao_id", edicaoId)
    .order("created_at", { ascending: false });

  if (error) throw error;
  return data ?? [];
}

export async function getEventoEdicaoInscricaoById(
  db: DbClient,
  edicaoId: string,
  inscricaoId: string,
) {
  const { data, error } = await db
    .from("eventos_escola_inscricoes")
    .select(EVENTO_EDICAO_INSCRICAO_SELECT)
    .eq("edicao_id", edicaoId)
    .eq("id", inscricaoId)
    .maybeSingle();

  if (error) throw error;
  if (!data) throw new Error("inscricao nao encontrada");
  return data;
}

export async function updateEventoEdicaoInscricao(
  db: DbClient,
  payload: EventoEdicaoInscricaoUpdatePayload,
) {
  const updatePayload: Record<string, unknown> = {
    updated_at: new Date().toISOString(),
  };

  if (payload.statusInscricao !== undefined) {
    updatePayload.status_inscricao = payload.statusInscricao;
  }
  if (payload.statusFinanceiro !== undefined) {
    updatePayload.status_financeiro = payload.statusFinanceiro;
  }
  if (payload.destinoFinanceiro !== undefined) {
    updatePayload.destino_financeiro = payload.destinoFinanceiro;
  }
  if (payload.pagamentoNoAto !== undefined) {
    updatePayload.pagamento_no_ato = payload.pagamentoNoAto;
  }
  if (payload.gerarEmContaInterna !== undefined) {
    updatePayload.gerar_em_conta_interna = payload.gerarEmContaInterna;
  }
  if (payload.quantidadeParcelasContaInterna !== undefined) {
    updatePayload.quantidade_parcelas_conta_interna =
      payload.quantidadeParcelasContaInterna;
  }
  if (payload.formaPagamentoCodigo !== undefined) {
    updatePayload.forma_pagamento_codigo = payload.formaPagamentoCodigo;
  }
  if (payload.observacoes !== undefined) {
    updatePayload.observacoes = payload.observacoes;
  }

  const { data, error } = await db
    .from("eventos_escola_inscricoes")
    .update(updatePayload)
    .eq("id", payload.inscricaoId)
    .eq("edicao_id", payload.edicaoId)
    .select(EVENTO_EDICAO_INSCRICAO_SELECT)
    .single();

  if (error) throw error;
  return data;
}

export async function updateEventoEdicaoInscricaoFinanceiro(
  db: DbClient,
  inscricaoId: string,
  patch: {
    statusInscricao?: "RASCUNHO" | "CONFIRMADA" | "CANCELADA";
    statusFinanceiro?:
      | "NAO_GERADO"
      | "PENDENTE"
      | "PARCIAL"
      | "PAGO"
      | "ISENTO"
      | "CANCELADO";
    contaInternaId?: number | null;
    destinoFinanceiro?: "CONTA_INTERNA" | "COBRANCA_DIRETA" | "COBRANCA_AVULSA";
    gerarEmContaInterna?: boolean;
    pagamentoNoAto?: boolean;
    modalidadePagamentoFinanceiro?:
      | "ATO_TOTAL"
      | "CONTA_INTERNA_TOTAL"
      | "MISTO"
      | null;
    quantidadeParcelasContaInterna?: number | null;
    valorTotalCentavos?: number;
    valorPagoAtoCentavos?: number;
    valorSaldoContaInternaCentavos?: number;
    cobrancaId?: number | null;
    cobrancaAvulsaId?: number | null;
    recebimentoId?: number | null;
    lancamentoContaInternaId?: number | null;
    faturaContaInternaId?: number | null;
    formaPagamentoCodigo?: string | null;
    observacoes?: string | null;
    financeiroStatus?: "PENDENTE" | "PROCESSANDO" | "CONCLUIDO" | "ERRO";
    financeiroErroCodigo?: string | null;
    financeiroErroDetalhe?: string | null;
    financeiroProcessadoEm?: string | null;
  },
) {
  const updatePayload: Record<string, unknown> = {
    updated_at: new Date().toISOString(),
  };

  if (patch.statusInscricao !== undefined) {
    updatePayload.status_inscricao = patch.statusInscricao;
  }
  if (patch.statusFinanceiro !== undefined) {
    updatePayload.status_financeiro = patch.statusFinanceiro;
  }
  if (patch.contaInternaId !== undefined) {
    updatePayload.conta_interna_id = patch.contaInternaId;
  }
  if (patch.destinoFinanceiro !== undefined) {
    updatePayload.destino_financeiro = patch.destinoFinanceiro;
  }
  if (patch.gerarEmContaInterna !== undefined) {
    updatePayload.gerar_em_conta_interna = patch.gerarEmContaInterna;
  }
  if (patch.pagamentoNoAto !== undefined) {
    updatePayload.pagamento_no_ato = patch.pagamentoNoAto;
  }
  if (patch.modalidadePagamentoFinanceiro !== undefined) {
    updatePayload.modalidade_pagamento_financeiro =
      patch.modalidadePagamentoFinanceiro;
  }
  if (patch.quantidadeParcelasContaInterna !== undefined) {
    updatePayload.quantidade_parcelas_conta_interna =
      patch.quantidadeParcelasContaInterna;
  }
  if (patch.valorTotalCentavos !== undefined) {
    updatePayload.valor_total_centavos = patch.valorTotalCentavos;
  }
  if (patch.valorPagoAtoCentavos !== undefined) {
    updatePayload.valor_pago_ato_centavos = patch.valorPagoAtoCentavos;
  }
  if (patch.valorSaldoContaInternaCentavos !== undefined) {
    updatePayload.valor_saldo_conta_interna_centavos =
      patch.valorSaldoContaInternaCentavos;
  }
  if (patch.cobrancaId !== undefined) updatePayload.cobranca_id = patch.cobrancaId;
  if (patch.cobrancaAvulsaId !== undefined) {
    updatePayload.cobranca_avulsa_id = patch.cobrancaAvulsaId;
  }
  if (patch.recebimentoId !== undefined) {
    updatePayload.recebimento_id = patch.recebimentoId;
  }
  if (patch.lancamentoContaInternaId !== undefined) {
    updatePayload.lancamento_conta_interna_id = patch.lancamentoContaInternaId;
  }
  if (patch.faturaContaInternaId !== undefined) {
    updatePayload.fatura_conta_interna_id = patch.faturaContaInternaId;
  }
  if (patch.formaPagamentoCodigo !== undefined) {
    updatePayload.forma_pagamento_codigo = patch.formaPagamentoCodigo;
  }
  if (patch.observacoes !== undefined) updatePayload.observacoes = patch.observacoes;
  if (patch.financeiroStatus !== undefined) {
    updatePayload.financeiro_status = patch.financeiroStatus;
  }
  if (patch.financeiroErroCodigo !== undefined) {
    updatePayload.financeiro_erro_codigo = patch.financeiroErroCodigo;
  }
  if (patch.financeiroErroDetalhe !== undefined) {
    updatePayload.financeiro_erro_detalhe = patch.financeiroErroDetalhe;
  }
  if (patch.financeiroProcessadoEm !== undefined) {
    updatePayload.financeiro_processado_em = patch.financeiroProcessadoEm;
  }

  const { data, error } = await db
    .from("eventos_escola_inscricoes")
    .update(updatePayload)
    .eq("id", inscricaoId)
    .select(EVENTO_EDICAO_INSCRICAO_SELECT)
    .single();

  if (error) throw error;
  return data;
}

export async function archiveEventoEdicaoInscricao(
  db: DbClient,
  edicaoId: string,
  inscricaoId: string,
) {
  const { data, error } = await db
    .from("eventos_escola_inscricoes")
    .update({
      status_inscricao: "CANCELADA",
      status_financeiro: "CANCELADO",
      updated_at: new Date().toISOString(),
    })
    .eq("id", inscricaoId)
    .eq("edicao_id", edicaoId)
    .select(EVENTO_EDICAO_INSCRICAO_SELECT)
    .single();

  if (error) throw error;
  return data;
}

export async function listEventoEdicaoInscricaoParcelasContaInternaByInscricaoIds(
  db: DbClient,
  inscricaoIds: string[],
) {
  if (inscricaoIds.length === 0) return [];

  const { data, error } = await db
    .from("eventos_escola_inscricao_parcelas_conta_interna")
    .select("*")
    .in("inscricao_id", inscricaoIds)
    .order("parcela_numero", { ascending: true });

  if (error) throw error;
  return data ?? [];
}

export async function replaceEventoEdicaoInscricaoParcelasContaInterna(
  db: DbClient,
  inscricaoId: string,
  parcelas: Array<{
    parcelaNumero: number;
    totalParcelas: number;
    competencia: string;
    valorCentavos: number;
    contaInternaId: number;
    cobrancaId?: number | null;
    lancamentoContaInternaId?: number | null;
    faturaContaInternaId?: number | null;
    status?: string;
    observacoes?: string | null;
  }>,
) {
  // Esta funcao substitui apenas os vinculos por inscricao/parcela.
  // A cobranca correspondente deve ser resolvida antes, inclusive em cenarios de reaproveitamento idempotente.
  const { error: deleteError } = await db
    .from("eventos_escola_inscricao_parcelas_conta_interna")
    .delete()
    .eq("inscricao_id", inscricaoId);

  if (deleteError) throw deleteError;
  if (parcelas.length === 0) return [];

  const now = new Date().toISOString();
  const { data, error } = await db
    .from("eventos_escola_inscricao_parcelas_conta_interna")
    .insert(
      parcelas.map((item) => ({
        inscricao_id: inscricaoId,
        parcela_numero: item.parcelaNumero,
        total_parcelas: item.totalParcelas,
        competencia: item.competencia,
        valor_centavos: item.valorCentavos,
        conta_interna_id: item.contaInternaId,
        cobranca_id: item.cobrancaId ?? null,
        lancamento_conta_interna_id: item.lancamentoContaInternaId ?? null,
        fatura_conta_interna_id: item.faturaContaInternaId ?? null,
        status: item.status ?? "PENDENTE",
        observacoes: item.observacoes ?? null,
        updated_at: now,
      })),
    )
    .select("*")
    .order("parcela_numero", { ascending: true });

  if (error) throw error;
  return data ?? [];
}

export async function insertEventoEdicaoInscricaoItemMovimentosFinanceiros(
  db: DbClient,
  movimentos: Array<{
    inscricaoId: string;
    inscricaoItemId: string;
    tipoMovimento?: "CONSTITUICAO" | "CANCELAMENTO_SEM_ESTORNO" | "AJUSTE_MANUAL";
    destinoFinanceiro: "CONTA_INTERNA" | "COBRANCA_DIRETA" | "COBRANCA_AVULSA";
    competencia?: string | null;
    parcelaNumero?: number | null;
    totalParcelas?: number | null;
    valorCentavos: number;
    contaInternaId?: number | null;
    cobrancaId?: number | null;
    cobrancaAvulsaId?: number | null;
    recebimentoId?: number | null;
    lancamentoContaInternaId?: number | null;
    faturaContaInternaId?: number | null;
    observacoes?: string | null;
  }>,
) {
  if (movimentos.length === 0) return [];

  const { data, error } = await db
    .from("eventos_escola_inscricao_item_movimentos_financeiros")
    .insert(
      movimentos.map((item) => ({
        inscricao_id: item.inscricaoId,
        inscricao_item_id: item.inscricaoItemId,
        tipo_movimento: item.tipoMovimento ?? "CONSTITUICAO",
        destino_financeiro: item.destinoFinanceiro,
        competencia: item.competencia ?? null,
        parcela_numero: item.parcelaNumero ?? null,
        total_parcelas: item.totalParcelas ?? null,
        valor_centavos: item.valorCentavos,
        conta_interna_id: item.contaInternaId ?? null,
        cobranca_id: item.cobrancaId ?? null,
        cobranca_avulsa_id: item.cobrancaAvulsaId ?? null,
        recebimento_id: item.recebimentoId ?? null,
        lancamento_conta_interna_id: item.lancamentoContaInternaId ?? null,
        fatura_conta_interna_id: item.faturaContaInternaId ?? null,
        observacoes: item.observacoes ?? null,
      })),
    )
    .select("*");

  if (error) throw error;
  return data ?? [];
}

export async function listEventoEdicaoInscricaoItemMovimentosFinanceirosByInscricaoId(
  db: DbClient,
  inscricaoId: string,
) {
  const { data, error } = await db
    .from("eventos_escola_inscricao_item_movimentos_financeiros")
    .select("*")
    .eq("inscricao_id", inscricaoId)
    .order("created_at", { ascending: true });

  if (error) throw error;
  return data ?? [];
}

export async function findEventoEdicaoInscricaoAtivaByParticipante(
  db: DbClient,
  params: {
    edicaoId: string;
    alunoPessoaId?: number | null;
    participanteExternoId?: string | null;
  },
) {
  let query = db
    .from("eventos_escola_inscricoes")
    .select(EVENTO_EDICAO_INSCRICAO_SELECT)
    .eq("edicao_id", params.edicaoId)
    .neq("status_inscricao", "CANCELADA")
    .limit(1);

  if (typeof params.alunoPessoaId === "number") {
    query = query.eq("aluno_pessoa_id", params.alunoPessoaId);
  } else if (typeof params.participanteExternoId === "string") {
    query = query.eq("participante_externo_id", params.participanteExternoId);
  } else {
    return null;
  }

  const { data, error } = await query.maybeSingle();

  if (error) throw error;
  return data ?? null;
}

export async function getEventoEdicaoFinanceiroContexto(
  db: DbClient,
  edicaoId: string,
) {
  const [{ data: edicao, error: edicaoError }, { data: calendario, error: calendarioError }] =
    await Promise.all([
      db
        .from("eventos_escola_edicoes")
        .select("id, data_inicio, data_fim")
        .eq("id", edicaoId)
        .maybeSingle(),
      db
        .from("eventos_escola_edicao_calendario_itens")
        .select("tipo, inicio, fim")
        .eq("edicao_id", edicaoId)
        .eq("ativo", true)
        .order("inicio", { ascending: false })
        .limit(20),
    ]);

  if (edicaoError) throw edicaoError;
  if (calendarioError) throw calendarioError;

  return {
    edicao,
    calendario: calendario ?? [],
  };
}

export async function getCentroCustoPadraoEscolaId(db: DbClient) {
  const { data: config, error: configError } = await db
    .from("escola_config_financeira")
    .select("centro_custo_padrao_escola_id")
    .eq("id", 1)
    .maybeSingle();

  if (configError) throw configError;

  const centroCustoPadraoId =
    typeof config?.centro_custo_padrao_escola_id === "number"
      ? Number(config.centro_custo_padrao_escola_id)
      : null;

  if (centroCustoPadraoId) return centroCustoPadraoId;

  const { data: centro, error: centroError } = await db
    .from("centros_custo")
    .select("id, codigo, ativo")
    .eq("ativo", true)
    .order("id", { ascending: true });

  if (centroError) throw centroError;

  const escola =
    (centro ?? []).find((item) => item.codigo === "ESCOLA") ??
    (centro ?? [])[0] ??
    null;

  return escola?.id ? Number(escola.id) : null;
}

export async function listFormasPagamentoAtivas(db: DbClient) {
  const { data, error } = await db
    .from("formas_pagamento")
    .select("id, codigo, nome, tipo_base, ativo")
    .eq("ativo", true)
    .order("nome", { ascending: true });

  if (error) throw error;
  return data ?? [];
}

export async function getFormaPagamentoByCodigo(
  db: DbClient,
  codigo: string,
) {
  const codigoNormalizado = codigo.trim().toUpperCase();
  const { data, error } = await db
    .from("formas_pagamento")
    .select("id, codigo, nome, tipo_base, ativo")
    .eq("codigo", codigoNormalizado)
    .maybeSingle();

  if (error) throw error;
  return data;
}

export async function insertCobrancaEventoEdicaoInscricao(
  db: DbClient,
  payload: {
    origemEventoInscricaoId: string;
    pessoaId: number;
    descricao: string;
    valorCentavos: number;
    vencimento: string;
    status: "PENDENTE" | "PAGO";
    centroCustoId: number | null;
    contaInternaId?: number | null;
    metodoPagamento?: string | null;
    dataPagamento?: string | null;
    observacoes?: string | null;
    origemLabel?: string | null;
    competenciaAnoMes?: string | null;
    parcelaNumero?: number | null;
    totalParcelas?: number | null;
  },
) {
  const parcelaNumero =
    typeof payload.parcelaNumero === "number" && Number.isFinite(payload.parcelaNumero)
      ? Math.trunc(payload.parcelaNumero)
      : null;
  const totalParcelas =
    typeof payload.totalParcelas === "number" && Number.isFinite(payload.totalParcelas)
      ? Math.trunc(payload.totalParcelas)
      : null;
  const origemLabel =
    typeof payload.origemLabel === "string" && payload.origemLabel.trim()
      ? payload.origemLabel.trim()
      : parcelaNumero !== null
        ? `${payload.origemEventoInscricaoId}:` +
          `${payload.competenciaAnoMes ?? "sem_competencia"}:` +
          `${parcelaNumero}`
        : payload.origemEventoInscricaoId;

  let consultaExistente = db
    .from("cobrancas")
    .select("*")
    .eq("origem_tipo", "EVENTO_ESCOLA_INSCRICAO")
    .eq("origem_subtipo", "INSCRICAO_EDICAO")
    .eq("origem_label", origemLabel);

  if (parcelaNumero !== null) {
    consultaExistente = consultaExistente.eq("parcela_numero", parcelaNumero);
  }

  const { data: cobrancaExistente, error: cobrancaExistenteError } =
    await consultaExistente.maybeSingle();

  if (cobrancaExistenteError) throw cobrancaExistenteError;
  if (cobrancaExistente) return cobrancaExistente;

  const insertPayload: Record<string, unknown> = {
    pessoa_id: payload.pessoaId,
    descricao: payload.descricao,
    valor_centavos: payload.valorCentavos,
    moeda: "BRL",
    vencimento: payload.vencimento,
    data_pagamento: payload.dataPagamento ?? null,
    status: payload.status,
    metodo_pagamento: payload.metodoPagamento ?? null,
    observacoes: payload.observacoes ?? null,
    centro_custo_id: payload.centroCustoId,
    conta_interna_id: payload.contaInternaId ?? null,
    origem_tipo: "EVENTO_ESCOLA_INSCRICAO",
    origem_subtipo: "INSCRICAO_EDICAO",
    origem_label: origemLabel,
    competencia_ano_mes: payload.competenciaAnoMes ?? null,
    data_prevista_pagamento: payload.vencimento,
    parcela_numero: parcelaNumero,
    total_parcelas: totalParcelas,
  };

  const { data, error } = await db
    .from("cobrancas")
    .insert(insertPayload)
    .select("*")
    .single();

  if (error) throw error;
  return data;
}

export async function updateCobrancaEventoEdicaoInscricaoVencimento(
  db: DbClient,
  payload: {
    cobrancaId: number;
    vencimento: string;
  },
) {
  const { data, error } = await db
    .from("cobrancas")
    .update({
      vencimento: payload.vencimento,
      data_prevista_pagamento: payload.vencimento,
    })
    .eq("id", payload.cobrancaId)
    .select("*")
    .single();

  if (error) throw error;
  return data;
}

export async function insertCobrancaAvulsaEventoEdicaoInscricao(
  db: DbClient,
  payload: {
    pessoaId: number;
    valorCentavos: number;
    vencimento: string;
    status: "PENDENTE" | "PAGO";
    meio: "BOLETO" | "FIMP" | "OUTRO";
    observacao?: string | null;
    pagoEm?: string | null;
  },
) {
  const { data, error } = await db
    .from("financeiro_cobrancas_avulsas")
    .insert({
      pessoa_id: payload.pessoaId,
      origem_tipo: "EVENTO_ESCOLA_INSCRICAO_EXTERNA",
      origem_id: payload.pessoaId,
      valor_centavos: payload.valorCentavos,
      vencimento: payload.vencimento,
      status: payload.status,
      meio: payload.meio,
      motivo_excecao: "EVENTO_ESCOLA",
      observacao: payload.observacao ?? null,
      pago_em: payload.pagoEm ?? null,
    })
    .select("*")
    .single();

  if (error) throw error;
  return data;
}

export async function insertRecebimentoEventoEdicaoInscricao(
  db: DbClient,
  payload: {
    cobrancaId?: number | null;
    centroCustoId: number | null;
    valorCentavos: number;
    dataPagamento: string;
    metodoPagamento: string;
    formaPagamentoCodigo?: string | null;
    origemSistema: string;
    observacoes?: string | null;
  },
) {
  const { data, error } = await db
    .from("recebimentos")
    .insert({
      cobranca_id: payload.cobrancaId ?? null,
      centro_custo_id: payload.centroCustoId,
      valor_centavos: payload.valorCentavos,
      data_pagamento: payload.dataPagamento,
      metodo_pagamento: payload.metodoPagamento,
      forma_pagamento_codigo: payload.formaPagamentoCodigo ?? null,
      origem_sistema: payload.origemSistema,
      observacoes: payload.observacoes ?? null,
    })
    .select("*")
    .single();

  if (error) throw error;
  return data;
}

export async function insertMovimentoFinanceiroReceita(
  db: DbClient,
  payload: {
    centroCustoId: number;
    valorCentavos: number;
    dataMovimento: string;
    origem: string;
    origemId?: number | null;
    descricao?: string | null;
    usuarioId?: string | null;
  },
) {
  const { data, error } = await db
    .from("movimento_financeiro")
    .insert({
      tipo: "RECEITA",
      centro_custo_id: payload.centroCustoId,
      valor_centavos: payload.valorCentavos,
      data_movimento: payload.dataMovimento,
      origem: payload.origem,
      origem_id: payload.origemId ?? null,
      descricao: payload.descricao ?? null,
      usuario_id: payload.usuarioId ?? null,
    })
    .select("*")
    .single();

  if (error) throw error;
  return data;
}
