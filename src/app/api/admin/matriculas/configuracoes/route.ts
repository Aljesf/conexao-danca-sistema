import { NextResponse } from "next/server";
import { getSupabaseRoute } from "@/lib/supabaseRoute";
import { guardApiByRole } from "@/lib/auth/roleGuard";

type MatriculaConfiguracao = {
  id: number;
  ativo: boolean;
  vencimento_dia_padrao: number;
  mes_referencia_dias: number;
  parcelas_padrao: number;
  moeda: string;
  arredondamento_centavos: string;
  created_at: string;
  updated_at: string;
  created_by: string | null;
  updated_by: string | null;
};

type MatriculaConfiguracaoInput = Pick<
  MatriculaConfiguracao,
  | "vencimento_dia_padrao"
  | "mes_referencia_dias"
  | "parcelas_padrao"
  | "moeda"
  | "arredondamento_centavos"
>;

type ValidationResult =
  | { ok: true; value: MatriculaConfiguracaoInput }
  | { ok: false; message: string; details?: Record<string, unknown> };

type SupabaseRouteClient = Awaited<ReturnType<typeof getSupabaseRoute>>;

function badRequest(message: string, details?: Record<string, unknown>) {
  return NextResponse.json(
    { ok: false, error: { message, details: details ?? null } },
    { status: 400 }
  );
}

function serverError(message: string, details?: Record<string, unknown>) {
  return NextResponse.json(
    { ok: false, error: { message, details: details ?? null } },
    { status: 500 }
  );
}

function validatePayload(input: unknown): ValidationResult {
  if (!input || typeof input !== "object") {
    return { ok: false, message: "Payload invalido." };
  }

  const obj = input as Record<string, unknown>;

  const vencimentoDia = Number(obj.vencimento_dia_padrao);
  const mesRefDias = Number(obj.mes_referencia_dias);
  const parcelasPadrao = Number(obj.parcelas_padrao);
  const moeda = String(obj.moeda ?? "BRL");
  const arred = String(obj.arredondamento_centavos ?? "ARREDONDA_NO_FINAL");

  if (!Number.isInteger(vencimentoDia) || vencimentoDia < 1 || vencimentoDia > 28) {
    return {
      ok: false,
      message: "vencimento_dia_padrao invalido. Use 1 a 28.",
      details: { vencimento_dia_padrao: obj.vencimento_dia_padrao },
    };
  }

  if (!Number.isInteger(mesRefDias) || mesRefDias !== 30) {
    return {
      ok: false,
      message: "mes_referencia_dias invalido. Deve ser 30 (mes comercial).",
      details: { mes_referencia_dias: obj.mes_referencia_dias },
    };
  }

  if (!Number.isInteger(parcelasPadrao) || parcelasPadrao < 1 || parcelasPadrao > 24) {
    return {
      ok: false,
      message: "parcelas_padrao invalido. Use 1 a 24.",
      details: { parcelas_padrao: obj.parcelas_padrao },
    };
  }

  const allowedMoedas = new Set(["BRL"]);
  if (!allowedMoedas.has(moeda)) {
    return {
      ok: false,
      message: "moeda invalida.",
      details: { allowed: Array.from(allowedMoedas), moeda },
    };
  }

  const allowedArred = new Set(["ARREDONDA_NO_FINAL"]);
  if (!allowedArred.has(arred)) {
    return {
      ok: false,
      message: "arredondamento_centavos invalido.",
      details: { allowed: Array.from(allowedArred), arredondamento_centavos: arred },
    };
  }

  return {
    ok: true,
    value: {
      vencimento_dia_padrao: vencimentoDia,
      mes_referencia_dias: mesRefDias,
      parcelas_padrao: parcelasPadrao,
      moeda,
      arredondamento_centavos: arred,
    },
  };
}

async function fetchAtiva(supabase: SupabaseRouteClient) {
  const { data, error } = await supabase
    .from("matricula_configuracoes")
    .select("*")
    .eq("ativo", true)
    .order("id", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    return { ok: false as const, error };
  }
  return { ok: true as const, data: data as MatriculaConfiguracao | null };
}

export async function GET(req: Request) {
  const denied = await guardApiByRole(req as any);
  if (denied) return denied as any;
  const supabase = await getSupabaseRoute();
  const active = await fetchAtiva(supabase);
  if (!active.ok) {
    return serverError("Falha ao buscar configuracao ativa.", { supabase: active.error });
  }

  if (!active.data) {
    return NextResponse.json(
      { ok: false, error: { message: "Nenhuma configuracao ativa encontrada." } },
      { status: 404 }
    );
  }

  return NextResponse.json({ ok: true, data: active.data });
}

export async function POST(req: Request) {
  const denied = await guardApiByRole(req as any);
  if (denied) return denied as any;
  let payload: unknown;
  try {
    payload = await req.json();
  } catch {
    return badRequest("JSON invalido.");
  }

  const validated = validatePayload(payload);
  if (!validated.ok) {
    return badRequest(validated.message, validated.details);
  }

  const supabase = await getSupabaseRoute();
  const active = await fetchAtiva(supabase);
  if (!active.ok) {
    return serverError("Falha ao buscar configuracao ativa para atualizacao.", {
      supabase: active.error,
    });
  }

  if (!active.data) {
    const { data, error } = await supabase
      .from("matricula_configuracoes")
      .insert({
        ativo: true,
        ...validated.value,
      })
      .select("*")
      .single();

    if (error) {
      return serverError("Falha ao criar configuracao.", { supabase: error });
    }
    return NextResponse.json({ ok: true, data: data as MatriculaConfiguracao });
  }

  const { data, error } = await supabase
    .from("matricula_configuracoes")
    .update({
      ...validated.value,
      updated_at: new Date().toISOString(),
    })
    .eq("id", active.data.id)
    .select("*")
    .single();

  if (error) {
    return serverError("Falha ao atualizar configuracao.", { supabase: error });
  }

  return NextResponse.json({ ok: true, data: data as MatriculaConfiguracao });
}
