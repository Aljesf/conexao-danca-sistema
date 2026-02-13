import { isBolsaConcessaoStatus, type BolsaConcessaoStatus } from "@/lib/bolsas/bolsasTypes";
import { getSupabaseAdmin } from "@/lib/supabase/server-admin";

function toIsoDate(value: string | undefined | null): string | null {
  if (!value) return null;
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) return value;
  return null;
}

function toPositiveInt(value: unknown): number | null {
  const num = typeof value === "number" ? value : Number(value);
  if (!Number.isInteger(num) || num <= 0) return null;
  return num;
}

export async function aplicarBolsaNaMatricula(params: {
  pessoa_id: number;
  projeto_social_id: number;
  bolsa_tipo_id: number;
  matricula_id?: number | null;
  turma_id?: number | null;
  data_inicio?: string;
  data_fim?: string | null;
  status?: BolsaConcessaoStatus;
  motivo?: string | null;
  observacoes?: string | null;
}): Promise<{
  projeto_social_beneficiario_id: number;
  bolsa_concessao_id: number;
}> {
  const supabase = getSupabaseAdmin();

  const pessoaId = toPositiveInt(params.pessoa_id);
  const projetoSocialId = toPositiveInt(params.projeto_social_id);
  const bolsaTipoId = toPositiveInt(params.bolsa_tipo_id);
  const matriculaId = params.matricula_id === null || params.matricula_id === undefined ? null : toPositiveInt(params.matricula_id);
  const turmaId = params.turma_id === null || params.turma_id === undefined ? null : toPositiveInt(params.turma_id);
  if (!pessoaId || !projetoSocialId || !bolsaTipoId) {
    throw new Error("parametros_bolsa_invalidos");
  }
  if (params.matricula_id !== null && params.matricula_id !== undefined && !matriculaId) {
    throw new Error("matricula_id_invalido");
  }
  if (params.turma_id !== null && params.turma_id !== undefined && !turmaId) {
    throw new Error("turma_id_invalido");
  }

  const dataInicio = toIsoDate(params.data_inicio) ?? new Date().toISOString().slice(0, 10);
  const dataFim = toIsoDate(params.data_fim) ?? null;
  if (dataFim && dataFim < dataInicio) {
    throw new Error("data_fim_menor_que_data_inicio");
  }

  const status = params.status ?? "ATIVA";
  if (!isBolsaConcessaoStatus(status)) {
    throw new Error("status_bolsa_invalido");
  }

  const { data: projeto, error: projetoErr } = await supabase
    .from("projetos_sociais")
    .select("id")
    .eq("id", projetoSocialId)
    .maybeSingle();
  if (projetoErr) throw new Error(projetoErr.message);
  if (!projeto) throw new Error("projeto_social_nao_encontrado");

  const { data: pessoa, error: pessoaErr } = await supabase
    .from("pessoas")
    .select("id")
    .eq("id", pessoaId)
    .maybeSingle();
  if (pessoaErr) throw new Error(pessoaErr.message);
  if (!pessoa) throw new Error("pessoa_nao_encontrada");

  const { data: bolsaTipo, error: bolsaTipoErr } = await supabase
    .from("bolsa_tipos")
    .select("id,projeto_social_id")
    .eq("id", bolsaTipoId)
    .maybeSingle();
  if (bolsaTipoErr) throw new Error(bolsaTipoErr.message);
  if (!bolsaTipo) throw new Error("bolsa_tipo_nao_encontrado");
  if (Number((bolsaTipo as { projeto_social_id?: number }).projeto_social_id ?? 0) !== projetoSocialId) {
    throw new Error("bolsa_tipo_nao_pertence_ao_projeto");
  }

  if (matriculaId) {
    const { data: matricula, error: matriculaErr } = await supabase
      .from("matriculas")
      .select("id")
      .eq("id", matriculaId)
      .maybeSingle();
    if (matriculaErr) throw new Error(matriculaErr.message);
    if (!matricula) throw new Error("matricula_nao_encontrada");
  }

  if (turmaId) {
    const { data: turma, error: turmaErr } = await supabase
      .from("turmas")
      .select("turma_id")
      .eq("turma_id", turmaId)
      .maybeSingle();
    if (turmaErr) throw new Error(turmaErr.message);
    if (!turma) throw new Error("turma_nao_encontrada");
  }

  const { data: existingBenef, error: existingBenefErr } = await supabase
    .from("projetos_sociais_beneficiarios")
    .select("id")
    .eq("projeto_social_id", projetoSocialId)
    .eq("pessoa_id", pessoaId)
    .maybeSingle();
  if (existingBenefErr) throw new Error(existingBenefErr.message);

  let projetoSocialBeneficiarioId = Number((existingBenef as { id?: number } | null)?.id ?? 0) || null;

  if (!projetoSocialBeneficiarioId) {
    const { data: createdBenef, error: createdBenefErr } = await supabase
      .from("projetos_sociais_beneficiarios")
      .insert({
        projeto_social_id: projetoSocialId,
        pessoa_id: pessoaId,
        status: "ATIVO",
        data_inicio: dataInicio,
        data_fim: null,
        origem_legado: null,
        legado_payload: null,
        observacoes: null,
      })
      .select("id")
      .maybeSingle();

    if (createdBenefErr) {
      if (createdBenefErr.code !== "23505") throw new Error(createdBenefErr.message);
      const { data: raceBenef, error: raceBenefErr } = await supabase
        .from("projetos_sociais_beneficiarios")
        .select("id")
        .eq("projeto_social_id", projetoSocialId)
        .eq("pessoa_id", pessoaId)
        .maybeSingle();
      if (raceBenefErr) throw new Error(raceBenefErr.message);
      projetoSocialBeneficiarioId = Number((raceBenef as { id?: number } | null)?.id ?? 0) || null;
    } else {
      projetoSocialBeneficiarioId = Number((createdBenef as { id?: number } | null)?.id ?? 0) || null;
    }
  }

  if (!projetoSocialBeneficiarioId) {
    throw new Error("falha_ao_garantir_beneficiario_projeto_social");
  }

  const concessaoBasePayload = {
    projeto_social_id: projetoSocialId,
    bolsa_tipo_id: bolsaTipoId,
    pessoa_id: pessoaId,
    turma_id: turmaId ?? null,
    matricula_id: matriculaId ?? null,
    data_inicio: dataInicio,
    data_fim: dataFim,
    status,
    motivo: params.motivo ?? null,
    observacoes: params.observacoes ?? null,
    projeto_social_beneficiario_id: projetoSocialBeneficiarioId,
  };

  let concessaoExistenteId: number | null = null;
  {
    let query = supabase
      .from("bolsa_concessoes")
      .select("id")
      .eq("projeto_social_id", projetoSocialId)
      .eq("pessoa_id", pessoaId)
      .eq("bolsa_tipo_id", bolsaTipoId)
      .order("updated_at", { ascending: false })
      .limit(1);

    if (matriculaId) query = query.eq("matricula_id", matriculaId);
    else query = query.is("matricula_id", null);

    const { data: rows, error: rowErr } = await query;
    if (rowErr) throw new Error(rowErr.message);
    concessaoExistenteId = Number((rows?.[0] as { id?: number } | undefined)?.id ?? 0) || null;
  }

  if (concessaoExistenteId) {
    const { data: concessaoAtualizada, error: concessaoUpdateErr } = await supabase
      .from("bolsa_concessoes")
      .update(concessaoBasePayload)
      .eq("id", concessaoExistenteId)
      .select("id")
      .single();
    if (concessaoUpdateErr) throw new Error(concessaoUpdateErr.message);
    return {
      projeto_social_beneficiario_id: projetoSocialBeneficiarioId,
      bolsa_concessao_id: Number((concessaoAtualizada as { id?: number }).id ?? 0),
    };
  }

  const { data: concessao, error: concessaoErr } = await supabase
    .from("bolsa_concessoes")
    .insert(concessaoBasePayload)
    .select("id")
    .single();
  if (concessaoErr) throw new Error(concessaoErr.message);

  return {
    projeto_social_beneficiario_id: projetoSocialBeneficiarioId,
    bolsa_concessao_id: Number((concessao as { id?: number }).id ?? 0),
  };
}

