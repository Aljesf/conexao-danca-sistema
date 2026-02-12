import { NextResponse } from "next/server";
import { guardApiByRole } from "@/lib/auth/roleGuard";
import { getSupabaseAdmin } from "@/lib/supabase/server-admin";
import {
  calcularValorFamiliaCentavos,
  isBolsaLedgerOrigemContratado,
  isBolsaTipoModo,
  type BolsaLedgerOrigemContratado,
} from "@/lib/bolsas/bolsasTypes";

type GerarLedgerBody = {
  competencia?: string;
  bolsa_concessao_id?: number;
  origem_valor_contratado?: BolsaLedgerOrigemContratado;
  valor_contratado_centavos?: number;
  valor_familia_centavos_override?: number | null;
  composicao_json?: Record<string, unknown> | null;
  observacoes?: string | null;
};

type ConcessaoRef = {
  id: number;
  projeto_social_id: number;
  pessoa_id: number;
  turma_id: number | null;
  matricula_id: number | null;
  bolsa_tipo_id: number;
};

type BolsaTipoRef = {
  id: number;
  modo: string;
  percentual_desconto: number | null;
  valor_final_familia_centavos: number | null;
  ativo: boolean;
};

type LedgerRow = {
  id: number;
  competencia: string;
  projeto_social_id: number;
  bolsa_concessao_id: number;
  pessoa_id: number;
  turma_id: number | null;
  matricula_id: number | null;
  origem_valor_contratado: BolsaLedgerOrigemContratado;
  valor_contratado_centavos: number;
  valor_familia_centavos: number;
  valor_investimento_centavos: number;
  composicao_json: Record<string, unknown> | null;
  observacoes: string | null;
  created_at: string;
  updated_at: string;
};

function toInt(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return Math.trunc(value);
  if (typeof value === "string" && value.trim() !== "" && Number.isFinite(Number(value))) {
    return Math.trunc(Number(value));
  }
  return null;
}

function asString(value: unknown): string | null {
  return typeof value === "string" ? value : null;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function jsonError(status: number, error: string, detail?: string) {
  return NextResponse.json({ ok: false, error, detail: detail ?? null }, { status });
}

export async function POST(req: Request) {
  const denied = await guardApiByRole(req);
  if (denied) return denied;

  try {
    const supabase = getSupabaseAdmin();
    const body = (await req.json().catch(() => null)) as GerarLedgerBody | null;
    if (!body) return jsonError(400, "payload_invalido");

    const competencia = asString(body.competencia) ?? "";
    const bolsaConcessaoId = toInt(body.bolsa_concessao_id);
    const valorContratado = toInt(body.valor_contratado_centavos);
    const valorFamiliaOverride = toInt(body.valor_familia_centavos_override);
    const origem = body.origem_valor_contratado;

    if (!/^\d{4}-\d{2}$/.test(competencia)) return jsonError(400, "competencia_invalida");
    if (!bolsaConcessaoId || bolsaConcessaoId <= 0) return jsonError(400, "bolsa_concessao_id_obrigatorio");
    if (valorContratado === null || valorContratado < 0) return jsonError(400, "valor_contratado_invalido");
    if (!isBolsaLedgerOrigemContratado(origem)) return jsonError(400, "origem_valor_contratado_invalida");
    if (valorFamiliaOverride !== null && valorFamiliaOverride < 0) {
      return jsonError(400, "valor_familia_centavos_override_invalido");
    }

    const { data: concessao, error: concessaoErr } = await supabase
      .from("bolsa_concessoes")
      .select("id,projeto_social_id,pessoa_id,turma_id,matricula_id,bolsa_tipo_id")
      .eq("id", bolsaConcessaoId)
      .maybeSingle();

    if (concessaoErr) return jsonError(500, "erro_buscar_concessao", concessaoErr.message);
    if (!concessao) return jsonError(404, "concessao_nao_encontrada");

    const concessaoRow = concessao as ConcessaoRef;

    const { data: tipo, error: tipoErr } = await supabase
      .from("bolsa_tipos")
      .select("id,modo,percentual_desconto,valor_final_familia_centavos,ativo")
      .eq("id", concessaoRow.bolsa_tipo_id)
      .maybeSingle();

    if (tipoErr) return jsonError(500, "erro_buscar_bolsa_tipo", tipoErr.message);
    if (!tipo) return jsonError(404, "bolsa_tipo_nao_encontrado");

    const tipoRow = tipo as BolsaTipoRef;
    if (!tipoRow.ativo) return jsonError(409, "bolsa_tipo_inativo");
    if (!isBolsaTipoModo(tipoRow.modo)) return jsonError(500, "bolsa_tipo_modo_invalido");

    const valorFamilia =
      valorFamiliaOverride !== null
        ? valorFamiliaOverride
        : calcularValorFamiliaCentavos({
            modo: tipoRow.modo,
            valorContratadoCentavos: valorContratado,
            percentualDesconto: tipoRow.percentual_desconto,
            valorFinalFamiliaCentavos: tipoRow.valor_final_familia_centavos,
          });

    const valorInvestimento = Math.max(0, valorContratado - valorFamilia);

    const { data: existente, error: existenteErr } = await supabase
      .from("bolsa_ledger")
      .select("id")
      .eq("competencia", competencia)
      .eq("bolsa_concessao_id", bolsaConcessaoId)
      .order("id", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (existenteErr) return jsonError(500, "erro_verificar_ledger_existente", existenteErr.message);

    const payload = {
      competencia,
      projeto_social_id: concessaoRow.projeto_social_id,
      bolsa_concessao_id: bolsaConcessaoId,
      pessoa_id: concessaoRow.pessoa_id,
      turma_id: concessaoRow.turma_id ?? null,
      matricula_id: concessaoRow.matricula_id ?? null,
      origem_valor_contratado: origem,
      valor_contratado_centavos: valorContratado,
      valor_familia_centavos: valorFamilia,
      valor_investimento_centavos: valorInvestimento,
      composicao_json: isRecord(body.composicao_json) ? body.composicao_json : null,
      observacoes: asString(body.observacoes) ?? null,
    };

    if (existente?.id) {
      const { data, error } = await supabase
        .from("bolsa_ledger")
        .update(payload)
        .eq("id", existente.id as number)
        .select(
          "id,competencia,projeto_social_id,bolsa_concessao_id,pessoa_id,turma_id,matricula_id,origem_valor_contratado,valor_contratado_centavos,valor_familia_centavos,valor_investimento_centavos,composicao_json,observacoes,created_at,updated_at",
        )
        .single();

      if (error) return jsonError(500, "erro_atualizar_ledger", error.message);
      return NextResponse.json({ ok: true, mode: "update", data: data as LedgerRow });
    }

    const { data, error } = await supabase
      .from("bolsa_ledger")
      .insert(payload)
      .select(
        "id,competencia,projeto_social_id,bolsa_concessao_id,pessoa_id,turma_id,matricula_id,origem_valor_contratado,valor_contratado_centavos,valor_familia_centavos,valor_investimento_centavos,composicao_json,observacoes,created_at,updated_at",
      )
      .single();

    if (error) return jsonError(500, "erro_criar_ledger", error.message);
    return NextResponse.json({ ok: true, mode: "insert", data: data as LedgerRow }, { status: 201 });
  } catch (error) {
    const detail = error instanceof Error ? error.message : "erro_desconhecido";
    return jsonError(500, "erro_gerar_ledger", detail);
  }
}
