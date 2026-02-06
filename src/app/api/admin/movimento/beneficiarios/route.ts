import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { getSupabaseServiceClient } from "@/lib/supabase/service";
import { jsonError, zodToValidationError } from "@/lib/http/api-errors";
import { guardApiByRole } from "@/lib/auth/roleGuard";
import { requireUser } from "@/lib/supabase/api-auth";

const BeneficiarioCreateSchema = z.object({
  pessoa_id: z.union([z.string(), z.number()]),
  analise_id: z.string().uuid().optional(),
  resumo_institucional: z.string().optional(),
  observacoes: z.string().optional(),
  exercicio_ano: z.number().int().optional(),
  valido_ate: z.string().optional(),
  dados_complementares: z.record(z.unknown()).optional(),
});

function supabaseErrorResponse(error: unknown, fallbackMessage: string) {
  const err = error as {
    message?: string;
    details?: unknown;
    hint?: unknown;
    code?: unknown;
  } | null;

  console.error("[movimento/beneficiarios][POST] supabase_error:", error);

  return NextResponse.json(
    {
      error: "ERRO_INESPERADO",
      message: err?.message ?? fallbackMessage,
      details: err?.details ?? null,
      hint: err?.hint ?? null,
      code: err?.code ?? null,
    },
    { status: 500 },
  );
}

export async function GET(request: NextRequest) {
  const denied = await guardApiByRole(request as any);
  if (denied) return denied as any;
  try {
    const supabase = getSupabaseServiceClient();

    const { data, error } = await supabase
      .from("movimento_beneficiarios")
      .select("*")
      .order("criado_em", { ascending: false });

    if (error) throw error;
    return NextResponse.json({ ok: true, data });
  } catch (err) {
    return jsonError(err);
  }
}

export async function POST(request: NextRequest) {
  const denied = await guardApiByRole(request as any);
  if (denied) return denied as any;
  try {
    const auth = await requireUser(request);
    if (auth instanceof NextResponse) return auth;

    const { userId } = auth;
    const supabase = getSupabaseServiceClient();

    const bodyUnknown = await request.json();
    const body = BeneficiarioCreateSchema.parse(bodyUnknown);

    const analiseId = body.analise_id ? String(body.analise_id) : null;
    const pessoaIdNumber =
      typeof body.pessoa_id === "string" ? Number(body.pessoa_id) : body.pessoa_id;
    const now = new Date();
    const anoAtual = now.getFullYear();
    const exercicioAno =
      typeof body.exercicio_ano === "number" && Number.isFinite(body.exercicio_ano)
        ? Math.trunc(body.exercicio_ano)
        : anoAtual;
    const validoAte =
      typeof body.valido_ate === "string" && body.valido_ate.trim()
        ? body.valido_ate
        : `${exercicioAno}-12-31`;

    if (!Number.isInteger(pessoaIdNumber) || pessoaIdNumber <= 0) {
      return NextResponse.json(
        { ok: false, codigo: "PESSOA_ID_INVALIDO", message: "pessoa_id invalido." },
        { status: 400 },
      );
    }

    if (analiseId) {
      const { data: analise, error: analiseErr } = await supabase
        .from("movimento_analises_socioeconomicas")
        .select("id,pessoa_id")
        .eq("id", analiseId)
        .maybeSingle();
      if (analiseErr) {
        return supabaseErrorResponse(analiseErr, "Falha ao buscar analise socioeconomica.");
      }
      if (analise && Number(analise.pessoa_id) !== pessoaIdNumber) {
        return NextResponse.json(
          { ok: false, codigo: "VALIDACAO_INVALIDA", message: "pessoa_id nao confere com analise." },
          { status: 400 },
        );
      }
    }

    const { data: existing, error: existingErr } = await supabase
      .from("movimento_beneficiarios")
      .select("id")
      .eq("pessoa_id", pessoaIdNumber)
      .maybeSingle();

    if (existingErr) {
      return supabaseErrorResponse(existingErr, "Falha ao verificar beneficiario existente.");
    }
    if (existing?.id) {
      return NextResponse.json(
        {
          ok: false,
          codigo: "BENEFICIARIO_JA_EXISTE",
          message: "Beneficiario ja cadastrado para esta pessoa.",
        },
        { status: 409 },
      );
    }

    const { data: pessoa, error: pessoaErr } = await supabase
      .from("pessoas")
      .select("id,nome,cpf,email,telefone")
      .eq("id", pessoaIdNumber)
      .maybeSingle();

    if (pessoaErr) {
      return supabaseErrorResponse(pessoaErr, "Falha ao buscar pessoa.");
    }

    if (!pessoa) {
      return NextResponse.json(
        { ok: false, codigo: "PESSOA_NAO_ENCONTRADA" },
        { status: 404 }
      );
    }

    const relatorioSocioeconomico = JSON.stringify({
      fonte: "cadastro_manual",
      analise_id: analiseId ?? null,
      pessoa_id: String(pessoa.id),
      snapshot_minimo: {
        nome: pessoa.nome ?? null,
        cpf: pessoa.cpf ?? null,
        email: pessoa.email ?? null,
        telefone: pessoa.telefone ?? null,
      },
      resumo_institucional: body.resumo_institucional ?? null,
      observacoes: body.observacoes ?? null,
    });

    const { data, error } = await supabase
      .from("movimento_beneficiarios")
      .insert({
        pessoa_id: pessoaIdNumber,
        analise_id: analiseId,
        exercicio_ano: exercicioAno,
        valido_ate: validoAte,
        relatorio_socioeconomico: relatorioSocioeconomico,
        dados_complementares: (body.dados_complementares ?? null) as unknown,
        observacoes: body.observacoes ?? null,
        criado_por: userId,
      })
      .select("*")
      .single();

    if (error) {
      return supabaseErrorResponse(error, "Falha ao cadastrar beneficiario.");
    }
    return NextResponse.json({ ok: true, data });
  } catch (err) {
    const mapped = zodToValidationError(err);
    if (mapped.message === "VALIDACAO_INVALIDA") {
      return NextResponse.json(
        { ok: false, codigo: "VALIDACAO_INVALIDA", message: "Dados invalidos." },
        { status: 400 },
      );
    }

    return supabaseErrorResponse(err, "Falha ao cadastrar beneficiario.");
  }
}


