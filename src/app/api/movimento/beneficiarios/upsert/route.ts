import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";

type UpsertBeneficiarioBody = {
  pessoa_id: string;
  responsavel_id?: string | null;
  eh_menor?: boolean;
  acionar_form_responsavel?: boolean;
  acionar_form_aluno_menor?: boolean;
  acionar_form_aluno_maior?: boolean;
  observacoes?: string | null;
  dados_complementares?: Record<string, unknown> | null;
  concessao?: {
    status?: "ATIVA" | "SUSPENSA" | "ENCERRADA";
    data_inicio?: string;
    data_fim?: string | null;
    revisao_prevista_em?: string | null;
    dia_vencimento_ciclo?: number;
    justificativa?: string | null;
  };
};

async function getModeloAtivoIdByTipo(
  tipo: "RESPONSAVEL_LEGAL" | "ALUNO_MENOR" | "ALUNO_MAIOR"
): Promise<string> {
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("movimento_formularios_modelo")
    .select("id")
    .eq("tipo", tipo)
    .eq("ativo", true)
    .limit(1)
    .maybeSingle();

  if (error) throw new Error(error.message);
  if (!data?.id) throw new Error(`Modelo ativo nao encontrado para tipo=${tipo}`);
  return String(data.id);
}

async function ensureInstancia(params: {
  beneficiario_id: string;
  tipo: "RESPONSAVEL_LEGAL" | "ALUNO_MENOR" | "ALUNO_MAIOR";
  respondente_pessoa_id: string | null;
}) {
  const supabase = getSupabaseAdmin();

  const { data: existing, error: errFind } = await supabase
    .from("movimento_formularios_instancia")
    .select("id")
    .eq("beneficiario_id", params.beneficiario_id)
    .eq("tipo", params.tipo)
    .limit(1)
    .maybeSingle();

  if (errFind) throw new Error(errFind.message);
  if (existing?.id) return existing;

  const modelo_id = await getModeloAtivoIdByTipo(params.tipo);

  const { data: created, error: errCreate } = await supabase
    .from("movimento_formularios_instancia")
    .insert({
      beneficiario_id: params.beneficiario_id,
      modelo_id,
      tipo: params.tipo,
      status: "PENDENTE",
      respondente_pessoa_id: params.respondente_pessoa_id,
    })
    .select("id")
    .single();

  if (errCreate) throw new Error(errCreate.message);
  return created;
}

export async function POST(req: Request) {
  try {
    const supabase = getSupabaseAdmin();
    const body = (await req.json()) as UpsertBeneficiarioBody;

    if (!body?.pessoa_id) {
      return NextResponse.json({ ok: false, error: "pessoa_id_obrigatorio" }, { status: 400 });
    }

    const pessoa_id = String(body.pessoa_id);
    const responsavel_id = body.responsavel_id ? String(body.responsavel_id) : null;

    const payloadBenef = {
      pessoa_id,
      responsavel_id,
      eh_menor: Boolean(body.eh_menor ?? false),
      acionar_form_responsavel: Boolean(body.acionar_form_responsavel ?? false),
      acionar_form_aluno_menor: Boolean(body.acionar_form_aluno_menor ?? false),
      acionar_form_aluno_maior: Boolean(body.acionar_form_aluno_maior ?? false),
      observacoes: body.observacoes ?? null,
      dados_complementares: body.dados_complementares ?? null,
      atualizado_em: new Date().toISOString(),
    };

    const { data: found, error: errFound } = await supabase
      .from("movimento_beneficiarios")
      .select("id")
      .eq("pessoa_id", pessoa_id)
      .limit(1)
      .maybeSingle();

    if (errFound) throw new Error(errFound.message);

    let beneficiarioId: string;

    if (found?.id) {
      const { data: updated, error: errUpd } = await supabase
        .from("movimento_beneficiarios")
        .update(payloadBenef)
        .eq("id", found.id)
        .select("id")
        .single();

      if (errUpd) throw new Error(errUpd.message);
      beneficiarioId = String(updated.id);
    } else {
      const insertPayload = {
        ...payloadBenef,
        criado_em: new Date().toISOString(),
      };

      const { data: created, error: errIns } = await supabase
        .from("movimento_beneficiarios")
        .insert(insertPayload)
        .select("id")
        .single();

      if (errIns) throw new Error(errIns.message);
      beneficiarioId = String(created.id);
    }

    let concessao: { id: string } | null = null;
    let cicloCriado = false;

    if (body.concessao) {
      const c = body.concessao;

      const { data: concFound, error: concFindErr } = await supabase
        .from("movimento_concessoes")
        .select("id")
        .eq("beneficiario_id", beneficiarioId)
        .order("criado_em", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (concFindErr) throw new Error(concFindErr.message);

      const diaVenc = Number.isFinite(c.dia_vencimento_ciclo)
        ? Math.trunc(c.dia_vencimento_ciclo as number)
        : 1;
      const diaVencimentoCiclo = Math.min(28, Math.max(1, diaVenc));

      const concPayload = {
        beneficiario_id: beneficiarioId,
        status: c.status ?? "ATIVA",
        data_inicio: c.data_inicio ?? undefined,
        data_fim: c.data_fim ?? null,
        revisao_prevista_em: c.revisao_prevista_em ?? null,
        dia_vencimento_ciclo: diaVencimentoCiclo,
        justificativa: c.justificativa ?? null,
        atualizado_em: new Date().toISOString(),
      };

      if (concFound?.id) {
        const { data: concUpd, error: concUpdErr } = await supabase
          .from("movimento_concessoes")
          .update(concPayload)
          .eq("id", concFound.id)
          .select("id")
          .single();

        if (concUpdErr) throw new Error(concUpdErr.message);
        concessao = { id: String(concUpd.id) };
      } else {
        const { data: concIns, error: concInsErr } = await supabase
          .from("movimento_concessoes")
          .insert({
            ...concPayload,
            criado_em: new Date().toISOString(),
          })
          .select("id")
          .single();

        if (concInsErr) throw new Error(concInsErr.message);
        concessao = { id: String(concIns.id) };
      }

      if (concessao?.id) {
        const inicio = c.data_inicio ?? new Date().toISOString().slice(0, 10);
        const competencia = `${inicio.slice(0, 7)}-01`;
        const dia = String(diaVencimentoCiclo).padStart(2, "0");
        const dtVencimento = `${inicio.slice(0, 7)}-${dia}`;

        const { data: cicloExist, error: cicloFindErr } = await supabase
          .from("movimento_concessoes_ciclos")
          .select("id")
          .eq("concessao_id", concessao.id)
          .eq("competencia", competencia)
          .maybeSingle();

        if (cicloFindErr) throw new Error(cicloFindErr.message);

        if (!cicloExist) {
          const { error: cicloInsErr } = await supabase
            .from("movimento_concessoes_ciclos")
            .insert({
              concessao_id: concessao.id,
              competencia,
              dt_vencimento: dtVencimento,
              criado_em: new Date().toISOString(),
            });

          if (cicloInsErr) throw new Error(cicloInsErr.message);
          cicloCriado = true;
        }
      }
    }

    const instancias: Array<{ tipo: string; id: string }> = [];

    if (payloadBenef.acionar_form_responsavel && responsavel_id) {
      const created = await ensureInstancia({
        beneficiario_id: beneficiarioId,
        tipo: "RESPONSAVEL_LEGAL",
        respondente_pessoa_id: responsavel_id,
      });
      instancias.push({ tipo: "RESPONSAVEL_LEGAL", id: String(created.id) });
    }

    if (payloadBenef.acionar_form_aluno_menor) {
      const created = await ensureInstancia({
        beneficiario_id: beneficiarioId,
        tipo: "ALUNO_MENOR",
        respondente_pessoa_id: pessoa_id,
      });
      instancias.push({ tipo: "ALUNO_MENOR", id: String(created.id) });
    }

    if (payloadBenef.acionar_form_aluno_maior) {
      const created = await ensureInstancia({
        beneficiario_id: beneficiarioId,
        tipo: "ALUNO_MAIOR",
        respondente_pessoa_id: pessoa_id,
      });
      instancias.push({ tipo: "ALUNO_MAIOR", id: String(created.id) });
    }

    return NextResponse.json({
      ok: true,
      beneficiario: { id: beneficiarioId },
      concessao,
      instancias,
      ciclo_criado: cicloCriado,
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Erro inesperado";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
