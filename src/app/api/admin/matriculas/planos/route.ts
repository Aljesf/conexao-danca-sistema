import { NextResponse } from "next/server";
import { getSupabaseRoute } from "@/lib/supabaseRoute";
import { guardApiByRole } from "@/lib/auth/roleGuard";

type MatriculaPlano = {
  id: number;
  codigo: string;
  nome: string;
  descricao: string | null;
  valor_mensal_base_centavos: number;
  total_parcelas: number;
  valor_anuidade_centavos: number;
  ativo: boolean;
  created_at: string;
  updated_at: string;
  created_by: string | null;
  updated_by: string | null;
};

type MatriculaPlanoInput = Pick<
  MatriculaPlano,
  | "codigo"
  | "nome"
  | "descricao"
  | "valor_mensal_base_centavos"
  | "total_parcelas"
  | "valor_anuidade_centavos"
>;

type ValidationResult =
  | { ok: true; value: MatriculaPlanoInput }
  | { ok: false; message: string; details?: Record<string, unknown> };

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

function parseString(v: unknown): string | null {
  if (typeof v !== "string") return null;
  const s = v.trim();
  return s.length ? s : null;
}

function parseIntStrict(v: unknown): number | null {
  if (typeof v === "number" && Number.isInteger(v)) return v;
  if (typeof v === "string" && v.trim().length) {
    const n = Number(v);
    if (Number.isInteger(n)) return n;
  }
  return null;
}

function validateCodigo(codigo: string): boolean {
  // permite letras, numeros, "_", "-", "."
  return /^[A-Za-z0-9_.-]{2,40}$/.test(codigo);
}

function validatePayload(input: unknown): ValidationResult {
  if (!input || typeof input !== "object") {
    return { ok: false, message: "Payload invalido." };
  }

  const obj = input as Record<string, unknown>;

  const codigoRaw = parseString(obj.codigo);
  const nomeRaw = parseString(obj.nome);
  const descricaoRaw = typeof obj.descricao === "string" ? obj.descricao.trim() : null;

  const mensal = parseIntStrict(obj.valor_mensal_base_centavos);
  const parcelas = parseIntStrict(obj.total_parcelas);

  if (!codigoRaw) {
    return { ok: false, message: "codigo e obrigatorio.", details: { codigo: obj.codigo } };
  }
  if (!validateCodigo(codigoRaw)) {
    return { ok: false, message: "codigo invalido.", details: { codigo: codigoRaw } };
  }
  if (!nomeRaw) {
    return { ok: false, message: "nome e obrigatorio.", details: { nome: obj.nome } };
  }
  if (mensal === null || mensal <= 0) {
    return {
      ok: false,
      message: "valor_mensal_base_centavos invalido (deve ser inteiro > 0).",
      details: { valor_mensal_base_centavos: obj.valor_mensal_base_centavos },
    };
  }
  if (parcelas === null || parcelas < 1 || parcelas > 24) {
    return {
      ok: false,
      message: "total_parcelas invalido (1..24).",
      details: { total_parcelas: obj.total_parcelas },
    };
  }

  const calculado = mensal * parcelas;
  const anuidadeProvided = obj.valor_anuidade_centavos !== undefined;
  if (anuidadeProvided) {
    const anuidadeInformada = parseIntStrict(obj.valor_anuidade_centavos);
    if (anuidadeInformada === null || anuidadeInformada <= 0) {
      return {
        ok: false,
        message: "valor_anuidade_centavos invalido (deve ser inteiro > 0).",
        details: { valor_anuidade_centavos: obj.valor_anuidade_centavos },
      };
    }
    if (anuidadeInformada !== calculado) {
      return {
        ok: false,
        message: "valor_anuidade_centavos deve ser igual a valor_mensal_base_centavos * total_parcelas.",
        details: {
          valor_anuidade_centavos: anuidadeInformada,
          esperado: calculado,
        },
      };
    }
  }

  return {
    ok: true,
    value: {
      codigo: codigoRaw,
      nome: nomeRaw,
      descricao: descricaoRaw && descricaoRaw.length ? descricaoRaw : null,
      valor_mensal_base_centavos: mensal,
      total_parcelas: parcelas,
      valor_anuidade_centavos: calculado,
    },
  };
}

export async function GET(req: Request) {
  const denied = await guardApiByRole(req as any);
  if (denied) return denied as any;
  const { searchParams } = new URL(req.url);
  const includeInativos = searchParams.get("include_inativos") === "1";

  const supabase = await getSupabaseRoute();

  let query = supabase.from("matricula_planos").select("*").order("id", { ascending: false });
  if (!includeInativos) query = query.eq("ativo", true);

  const { data, error } = await query;
  if (error) {
    return serverError("Falha ao listar planos de matricula.", { supabase: error });
  }

  return NextResponse.json({ ok: true, data: (data ?? []) as MatriculaPlano[] });
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
  if (!validated.ok) return badRequest(validated.message, validated.details);

  const supabase = await getSupabaseRoute();

  const { data, error } = await supabase
    .from("matricula_planos")
    .insert({
      ...validated.value,
      ativo: true,
    })
    .select("*")
    .single();

  if (error) {
    return serverError("Falha ao criar plano de matricula.", { supabase: error });
  }

  return NextResponse.json({ ok: true, data: data as MatriculaPlano });
}
