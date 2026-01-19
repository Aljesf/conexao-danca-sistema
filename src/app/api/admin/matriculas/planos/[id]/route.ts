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

type PlanoPatch = Partial<
  Pick<
    MatriculaPlano,
    | "codigo"
    | "nome"
    | "descricao"
    | "valor_mensal_base_centavos"
    | "total_parcelas"
    | "valor_anuidade_centavos"
    | "ativo"
  >
>;

type ValidationResult =
  | { ok: true; value: PlanoPatch }
  | { ok: false; message: string; details?: Record<string, unknown> };

function badRequest(message: string, details?: Record<string, unknown>) {
  return NextResponse.json(
    { ok: false, error: { message, details: details ?? null } },
    { status: 400 }
  );
}

function notFound(message: string) {
  return NextResponse.json({ ok: false, error: { message } }, { status: 404 });
}

function serverError(message: string, details?: Record<string, unknown>) {
  return NextResponse.json(
    { ok: false, error: { message, details: details ?? null } },
    { status: 500 }
  );
}

function parseIntStrict(v: unknown): number | null {
  if (typeof v === "number" && Number.isInteger(v)) return v;
  if (typeof v === "string" && v.trim().length) {
    const n = Number(v);
    if (Number.isInteger(n)) return n;
  }
  return null;
}

function parseString(v: unknown): string | null {
  if (typeof v !== "string") return null;
  const s = v.trim();
  return s.length ? s : null;
}

function validateCodigo(codigo: string): boolean {
  return /^[A-Za-z0-9_.-]{2,40}$/.test(codigo);
}

function validateUpdatePayload(input: unknown): ValidationResult {
  if (!input || typeof input !== "object") {
    return { ok: false, message: "Payload invalido." };
  }

  const obj = input as Record<string, unknown>;
  const patch: PlanoPatch = {};

  if (obj.codigo !== undefined) {
    const codigo = parseString(obj.codigo);
    if (!codigo) return { ok: false, message: "codigo invalido.", details: { codigo: obj.codigo } };
    if (!validateCodigo(codigo)) {
      return { ok: false, message: "codigo invalido.", details: { codigo } };
    }
    patch.codigo = codigo;
  }

  if (obj.nome !== undefined) {
    const nome = parseString(obj.nome);
    if (!nome) return { ok: false, message: "nome invalido.", details: { nome: obj.nome } };
    patch.nome = nome;
  }

  if (obj.descricao !== undefined) {
    if (obj.descricao === null) {
      patch.descricao = null;
    } else if (typeof obj.descricao === "string") {
      patch.descricao = obj.descricao.trim().length ? obj.descricao.trim() : null;
    } else {
      return { ok: false, message: "descricao invalida.", details: { descricao: obj.descricao } };
    }
  }

  if (obj.ativo !== undefined) {
    if (typeof obj.ativo !== "boolean") {
      return { ok: false, message: "ativo invalido.", details: { ativo: obj.ativo } };
    }
    patch.ativo = obj.ativo;
  }

  const mensal =
    obj.valor_mensal_base_centavos !== undefined
      ? parseIntStrict(obj.valor_mensal_base_centavos)
      : null;
  const parcelas = obj.total_parcelas !== undefined ? parseIntStrict(obj.total_parcelas) : null;

  if (obj.valor_mensal_base_centavos !== undefined && (mensal === null || mensal <= 0)) {
    return {
      ok: false,
      message: "valor_mensal_base_centavos invalido (inteiro > 0).",
      details: { valor_mensal_base_centavos: obj.valor_mensal_base_centavos },
    };
  }

  if (obj.total_parcelas !== undefined && (parcelas === null || parcelas < 1 || parcelas > 24)) {
    return {
      ok: false,
      message: "total_parcelas invalido (1..24).",
      details: { total_parcelas: obj.total_parcelas },
    };
  }

  if (mensal !== null) patch.valor_mensal_base_centavos = mensal;
  if (parcelas !== null) patch.total_parcelas = parcelas;

  const anuidadeProvided = obj.valor_anuidade_centavos !== undefined;
  let anuidadeInformada: number | null = null;
  if (anuidadeProvided) {
    anuidadeInformada = parseIntStrict(obj.valor_anuidade_centavos);
    if (anuidadeInformada === null || anuidadeInformada <= 0) {
      return {
        ok: false,
        message: "valor_anuidade_centavos invalido (inteiro > 0).",
        details: { valor_anuidade_centavos: obj.valor_anuidade_centavos },
      };
    }
  }

  if (mensal !== null && parcelas !== null) {
    const calculado = mensal * parcelas;
    if (anuidadeInformada !== null && anuidadeInformada !== calculado) {
      return {
        ok: false,
        message: "valor_anuidade_centavos deve ser igual a valor_mensal_base_centavos * total_parcelas.",
        details: { valor_anuidade_centavos: anuidadeInformada, esperado: calculado },
      };
    }
    patch.valor_anuidade_centavos = calculado;
  } else if (anuidadeInformada !== null) {
    patch.valor_anuidade_centavos = anuidadeInformada;
  }

  return { ok: true, value: patch };
}

async function getById(id: number) {
  const supabase = await getSupabaseRoute();
  const { data, error } = await supabase
    .from("matricula_planos")
    .select("*")
    .eq("id", id)
    .maybeSingle();

  if (error) return { ok: false as const, error };
  return { ok: true as const, data: data as MatriculaPlano | null };
}

export async function PUT(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const denied = await guardApiByRole(req as any);
  if (denied) return denied as any;
  const { id: rawId } = await ctx.params;
  const idNum = parseIntStrict(rawId);
  if (idNum === null || idNum <= 0) return badRequest("ID invalido.");

  let payload: unknown;
  try {
    payload = await req.json();
  } catch {
    return badRequest("JSON invalido.");
  }

  const validated = validateUpdatePayload(payload);
  if (!validated.ok) return badRequest(validated.message, validated.details);

  const current = await getById(idNum);
  if (!current.ok) return serverError("Falha ao buscar plano.", { supabase: current.error });
  if (!current.data) return notFound("Plano nao encontrado.");

  const patch: PlanoPatch = { ...validated.value };

  const mensal = patch.valor_mensal_base_centavos ?? current.data.valor_mensal_base_centavos;
  const parcelas = patch.total_parcelas ?? current.data.total_parcelas;
  const deveRecalcular =
    patch.valor_mensal_base_centavos !== undefined ||
    patch.total_parcelas !== undefined ||
    patch.valor_anuidade_centavos !== undefined;

  if (deveRecalcular) {
    const calculado = mensal * parcelas;
    if (patch.valor_anuidade_centavos !== undefined && patch.valor_anuidade_centavos !== calculado) {
      return badRequest(
        "valor_anuidade_centavos deve ser igual a valor_mensal_base_centavos * total_parcelas.",
        { valor_anuidade_centavos: patch.valor_anuidade_centavos, esperado: calculado }
      );
    }
    patch.valor_anuidade_centavos = calculado;
  }

  const supabase = await getSupabaseRoute();
  const { data, error } = await supabase
    .from("matricula_planos")
    .update({
      ...patch,
      updated_at: new Date().toISOString(),
    })
    .eq("id", idNum)
    .select("*")
    .single();

  if (error) return serverError("Falha ao atualizar plano.", { supabase: error });
  return NextResponse.json({ ok: true, data: data as MatriculaPlano });
}

export async function DELETE(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const denied = await guardApiByRole(_req as any);
  if (denied) return denied as any;
  const { id: rawId } = await ctx.params;
  const idNum = parseIntStrict(rawId);
  if (idNum === null || idNum <= 0) return badRequest("ID invalido.");

  const current = await getById(idNum);
  if (!current.ok) return serverError("Falha ao buscar plano.", { supabase: current.error });
  if (!current.data) return notFound("Plano nao encontrado.");

  const supabase = await getSupabaseRoute();
  const { data, error } = await supabase
    .from("matricula_planos")
    .update({
      ativo: false,
      updated_at: new Date().toISOString(),
    })
    .eq("id", idNum)
    .select("*")
    .single();

  if (error) return serverError("Falha ao desativar plano (soft delete).", { supabase: error });
  return NextResponse.json({ ok: true, data: data as MatriculaPlano });
}
