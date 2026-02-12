import { NextResponse } from "next/server";
import { guardApiByRole } from "@/lib/auth/roleGuard";
import { getSupabaseAdmin } from "@/lib/supabase/server-admin";
import { isBolsaTipoModo, type BolsaTipoModo } from "@/lib/bolsas/bolsasTypes";

type BolsaTipoRow = {
  id: number;
  projeto_social_id: number;
  nome: string;
  modo: BolsaTipoModo;
  percentual_desconto: number | null;
  valor_final_familia_centavos: number | null;
  observacoes: string | null;
  ativo: boolean;
  created_at: string;
  updated_at: string;
};

type BolsaTipoPutBody = {
  nome?: string;
  modo?: BolsaTipoModo;
  percentual_desconto?: number | null;
  valor_final_familia_centavos?: number | null;
  observacoes?: string | null;
  ativo?: boolean;
};

function toInt(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return Math.trunc(value);
  if (typeof value === "string" && value.trim() !== "" && Number.isFinite(Number(value))) {
    return Math.trunc(Number(value));
  }
  return null;
}

function toNumber(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim() !== "" && Number.isFinite(Number(value))) {
    return Number(value);
  }
  return null;
}

function asString(value: unknown): string | null {
  return typeof value === "string" ? value : null;
}

function validarModo(
  modo: BolsaTipoModo,
  percentualDesconto: number | null,
  valorFinalFamiliaCentavos: number | null,
): string | null {
  if (modo === "INTEGRAL") {
    if (percentualDesconto !== null || valorFinalFamiliaCentavos !== null) {
      return "modo_integral_nao_aceita_percentual_ou_valor_final";
    }
    return null;
  }

  if (modo === "PERCENTUAL") {
    if (percentualDesconto === null) return "modo_percentual_exige_percentual_desconto";
    if (percentualDesconto < 0 || percentualDesconto > 100) return "percentual_desconto_invalido";
    if (valorFinalFamiliaCentavos !== null) return "modo_percentual_nao_aceita_valor_final";
    return null;
  }

  if (valorFinalFamiliaCentavos === null) return "modo_valor_final_exige_valor_final_familia_centavos";
  if (valorFinalFamiliaCentavos < 0) return "valor_final_familia_centavos_invalido";
  if (percentualDesconto !== null) return "modo_valor_final_nao_aceita_percentual";
  return null;
}

function jsonError(status: number, error: string, detail?: string) {
  return NextResponse.json({ ok: false, error, detail: detail ?? null }, { status });
}

export async function GET(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const denied = await guardApiByRole(req);
  if (denied) return denied;

  try {
    const { id: rawId } = await ctx.params;
    const id = toInt(rawId);
    if (!id || id <= 0) return jsonError(400, "id_invalido");

    const supabase = getSupabaseAdmin();
    const { data, error } = await supabase
      .from("bolsa_tipos")
      .select(
        "id,projeto_social_id,nome,modo,percentual_desconto,valor_final_familia_centavos,observacoes,ativo,created_at,updated_at",
      )
      .eq("id", id)
      .maybeSingle();

    if (error) return jsonError(500, "erro_buscar_bolsa_tipo", error.message);
    if (!data) return jsonError(404, "bolsa_tipo_nao_encontrado");

    return NextResponse.json({ ok: true, data: data as BolsaTipoRow });
  } catch (error) {
    const detail = error instanceof Error ? error.message : "erro_desconhecido";
    return jsonError(500, "erro_buscar_bolsa_tipo", detail);
  }
}

export async function PUT(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const denied = await guardApiByRole(req);
  if (denied) return denied;

  try {
    const { id: rawId } = await ctx.params;
    const id = toInt(rawId);
    if (!id || id <= 0) return jsonError(400, "id_invalido");

    const body = (await req.json().catch(() => null)) as BolsaTipoPutBody | null;
    if (!body) return jsonError(400, "payload_invalido");

    const supabase = getSupabaseAdmin();
    const { data: atual, error: atualErr } = await supabase
      .from("bolsa_tipos")
      .select("id,nome,modo,percentual_desconto,valor_final_familia_centavos,observacoes,ativo")
      .eq("id", id)
      .maybeSingle();

    if (atualErr) return jsonError(500, "erro_buscar_bolsa_tipo", atualErr.message);
    if (!atual) return jsonError(404, "bolsa_tipo_nao_encontrado");

    const modoFinal = isBolsaTipoModo(body.modo) ? body.modo : (atual.modo as BolsaTipoModo);
    const percentualFinal =
      "percentual_desconto" in body ? toNumber(body.percentual_desconto) : (atual.percentual_desconto as number | null);
    const valorFinal =
      "valor_final_familia_centavos" in body
        ? toInt(body.valor_final_familia_centavos)
        : (atual.valor_final_familia_centavos as number | null);

    const erroModo = validarModo(modoFinal, percentualFinal, valorFinal);
    if (erroModo) return jsonError(400, erroModo);

    const patch: {
      nome?: string;
      modo?: BolsaTipoModo;
      percentual_desconto?: number | null;
      valor_final_familia_centavos?: number | null;
      observacoes?: string | null;
      ativo?: boolean;
    } = {};

    if ("nome" in body) {
      const nome = asString(body.nome)?.trim() ?? "";
      if (!nome) return jsonError(400, "nome_invalido");
      patch.nome = nome;
    }

    if ("modo" in body) {
      if (!isBolsaTipoModo(body.modo)) return jsonError(400, "modo_invalido");
      patch.modo = body.modo;
    }

    if ("percentual_desconto" in body || "modo" in body || "valor_final_familia_centavos" in body) {
      patch.percentual_desconto = modoFinal === "PERCENTUAL" ? percentualFinal : null;
      patch.valor_final_familia_centavos = modoFinal === "VALOR_FINAL_FAMILIA" ? valorFinal : null;
    }

    if ("observacoes" in body) patch.observacoes = asString(body.observacoes) ?? null;
    if (typeof body.ativo === "boolean") patch.ativo = body.ativo;

    if (Object.keys(patch).length === 0) return jsonError(400, "nada_para_atualizar");

    const { data, error } = await supabase
      .from("bolsa_tipos")
      .update(patch)
      .eq("id", id)
      .select(
        "id,projeto_social_id,nome,modo,percentual_desconto,valor_final_familia_centavos,observacoes,ativo,created_at,updated_at",
      )
      .maybeSingle();

    if (error) return jsonError(500, "erro_atualizar_bolsa_tipo", error.message);
    if (!data) return jsonError(404, "bolsa_tipo_nao_encontrado");

    return NextResponse.json({ ok: true, data: data as BolsaTipoRow });
  } catch (error) {
    const detail = error instanceof Error ? error.message : "erro_desconhecido";
    return jsonError(500, "erro_atualizar_bolsa_tipo", detail);
  }
}
