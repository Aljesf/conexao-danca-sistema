import { NextResponse } from "next/server";
import { z } from "zod";
import { requireMovimentoAdmin } from "@/lib/auth/movimento-guard";
import { getSupabaseServiceClient } from "@/lib/supabase/service";
import { jsonError, zodToValidationError } from "@/lib/http/api-errors";
import { guardApiByRole } from "@/lib/auth/roleGuard";

const ConcederSchema = z.object({
  beneficiario_id: z.string().uuid(),

  // se informado, tenta conceder com lastro do lote; se nao, concede em deficit (permitir_deficit precisa ser true)
  lote_id: z.string().uuid().optional(),

  permitir_deficit: z.boolean().default(false),

  tipo: z.enum(["CR_REGULAR", "CR_LIVRE", "CR_PROJETO"]),
  origem: z.enum(["INSTITUCIONAL_AUTOMATICA", "EXTERNA"]),

  proposito: z.string().min(1),

  curso_id: z.string().uuid().optional(),
  projeto_id: z.string().uuid().optional(),

  competencia_inicio: z.string().min(7),
  competencia_fim: z.string().min(7),

  quantidade_total: z.number().int().positive(),

  observacoes: z.string().optional(),
});

export async function POST(req: Request) {
  const denied = await guardApiByRole(req as any);
  if (denied) return denied as any;
  try {
    const { userId } = await requireMovimentoAdmin();
    const supabase = getSupabaseServiceClient();

    const bodyUnknown = await req.json();
    const body = ConcederSchema.parse(bodyUnknown);

    // 1) Beneficiario deve existir e estar APROVADO
    const { data: ben, error: benErr } = await supabase
      .from("movimento_beneficiarios")
      .select("id, status")
      .eq("id", body.beneficiario_id)
      .maybeSingle();

    if (benErr) throw benErr;
    if (!ben) throw new Error("BENEFICIARIO_NAO_ENCONTRADO");
    if (ben.status !== "APROVADO") throw new Error("BENEFICIARIO_NAO_APROVADO");

    // 2) Se lote_id foi informado, validar saldo
    if (body.lote_id) {
      const { data: lote, error: loteErr } = await supabase
        .from("movimento_creditos_lotes")
        .select("id, quantidade_total, quantidade_alocada, status")
        .eq("id", body.lote_id)
        .maybeSingle();

      if (loteErr) throw loteErr;
      if (!lote) throw new Error("LOTE_NAO_ENCONTRADO");

      const saldo = Number(lote.quantidade_total) - Number(lote.quantidade_alocada);
      if (lote.status !== "ABERTO" || saldo < body.quantidade_total) {
        throw new Error("LOTE_SEM_SALDO");
      }

      // conceder com lastro: cria credito e incrementa alocada
      const { data: credito, error: credErr } = await supabase
        .from("movimento_creditos")
        .insert({
          beneficiario_id: body.beneficiario_id,
          lote_id: body.lote_id,
          aluno_id: null,
          tipo: body.tipo,
          origem: body.origem,
          proposito: body.proposito,
          curso_id: body.curso_id ?? null,
          projeto_id: body.projeto_id ?? null,
          competencia_inicio: body.competencia_inicio,
          competencia_fim: body.competencia_fim,
          quantidade_total: body.quantidade_total,
          quantidade_consumida: 0,
          status: "ATIVO",
          observacoes: body.observacoes ?? null,
          criado_por: userId,
        })
        .select("*")
        .single();

      if (credErr) throw credErr;

      const { error: upLoteErr } = await supabase
        .from("movimento_creditos_lotes")
        .update({ quantidade_alocada: Number(lote.quantidade_alocada) + body.quantidade_total })
        .eq("id", body.lote_id);

      if (upLoteErr) throw upLoteErr;

      return NextResponse.json({ ok: true, data: credito, modo: "COM_LOTE" });
    }

    // 3) Sem lote => exige permitir_deficit
    if (!body.permitir_deficit) {
      throw new Error("DEFICIT_NAO_PERMITIDO");
    }

    const { data: credito, error: credErr } = await supabase
      .from("movimento_creditos")
      .insert({
        beneficiario_id: body.beneficiario_id,
        lote_id: null,
        aluno_id: null,
        tipo: body.tipo,
        origem: body.origem,
        proposito: body.proposito,
        curso_id: body.curso_id ?? null,
        projeto_id: body.projeto_id ?? null,
        competencia_inicio: body.competencia_inicio,
        competencia_fim: body.competencia_fim,
        quantidade_total: body.quantidade_total,
        quantidade_consumida: 0,
        status: "ATIVO",
        observacoes: body.observacoes ?? null,
        criado_por: userId,
      })
      .select("*")
      .single();

    if (credErr) throw credErr;

    return NextResponse.json({ ok: true, data: credito, modo: "DEFICIT" });
  } catch (err) {
    return jsonError(zodToValidationError(err));
  }
}
