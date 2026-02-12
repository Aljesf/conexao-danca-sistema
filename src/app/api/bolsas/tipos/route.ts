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

type BolsaTipoPostBody = {
  projeto_social_id?: number;
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

export async function GET(req: Request) {
  const denied = await guardApiByRole(req);
  if (denied) return denied;

  try {
    const supabase = getSupabaseAdmin();
    const { searchParams } = new URL(req.url);

    const projetoSocialId = toInt(searchParams.get("projeto_social_id"));
    if (!projetoSocialId || projetoSocialId <= 0) {
      return jsonError(400, "projeto_social_id_obrigatorio");
    }

    const ativoParam = searchParams.get("ativo");

    let query = supabase
      .from("bolsa_tipos")
      .select(
        "id,projeto_social_id,nome,modo,percentual_desconto,valor_final_familia_centavos,observacoes,ativo,created_at,updated_at",
      )
      .eq("projeto_social_id", projetoSocialId)
      .order("nome", { ascending: true });

    if (ativoParam === "true") query = query.eq("ativo", true);
    if (ativoParam === "false") query = query.eq("ativo", false);

    const { data, error } = await query;
    if (error) return jsonError(500, "erro_listar_bolsa_tipos", error.message);

    return NextResponse.json({ ok: true, data: (data ?? []) as BolsaTipoRow[] });
  } catch (error) {
    const detail = error instanceof Error ? error.message : "erro_desconhecido";
    return jsonError(500, "erro_listar_bolsa_tipos", detail);
  }
}

export async function POST(req: Request) {
  const denied = await guardApiByRole(req);
  if (denied) return denied;

  try {
    const supabase = getSupabaseAdmin();
    const body = (await req.json().catch(() => null)) as BolsaTipoPostBody | null;
    if (!body) return jsonError(400, "payload_invalido");

    const projetoSocialId = toInt(body.projeto_social_id);
    const nome = asString(body.nome)?.trim() ?? "";
    const modo = body.modo;
    const percentualDesconto = toNumber(body.percentual_desconto);
    const valorFinalFamiliaCentavos = toInt(body.valor_final_familia_centavos);

    if (!projetoSocialId || projetoSocialId <= 0) return jsonError(400, "projeto_social_id_obrigatorio");
    if (!nome) return jsonError(400, "nome_obrigatorio");
    if (!isBolsaTipoModo(modo)) return jsonError(400, "modo_obrigatorio");

    const erroModo = validarModo(modo, percentualDesconto, valorFinalFamiliaCentavos);
    if (erroModo) return jsonError(400, erroModo);

    const { data: projeto, error: projetoErr } = await supabase
      .from("projetos_sociais")
      .select("id")
      .eq("id", projetoSocialId)
      .maybeSingle();

    if (projetoErr) return jsonError(500, "erro_validar_projeto_social", projetoErr.message);
    if (!projeto) return jsonError(404, "projeto_social_nao_encontrado");

    const { data, error } = await supabase
      .from("bolsa_tipos")
      .insert({
        projeto_social_id: projetoSocialId,
        nome,
        modo,
        percentual_desconto: modo === "PERCENTUAL" ? percentualDesconto : null,
        valor_final_familia_centavos: modo === "VALOR_FINAL_FAMILIA" ? valorFinalFamiliaCentavos : null,
        observacoes: asString(body.observacoes) ?? null,
        ativo: body.ativo ?? true,
      })
      .select(
        "id,projeto_social_id,nome,modo,percentual_desconto,valor_final_familia_centavos,observacoes,ativo,created_at,updated_at",
      )
      .single();

    if (error) return jsonError(500, "erro_criar_bolsa_tipo", error.message);
    return NextResponse.json({ ok: true, data: data as BolsaTipoRow }, { status: 201 });
  } catch (error) {
    const detail = error instanceof Error ? error.message : "erro_desconhecido";
    return jsonError(500, "erro_criar_bolsa_tipo", detail);
  }
}
