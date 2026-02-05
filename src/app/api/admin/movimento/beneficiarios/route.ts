import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { getSupabaseServiceClient } from "@/lib/supabase/service";
import { jsonError, zodToValidationError } from "@/lib/http/api-errors";
import { guardApiByRole } from "@/lib/auth/roleGuard";
import { requireUser } from "@/lib/supabase/api-auth";

const BeneficiarioCreateSchema = z.object({
  pessoa_id: z.string().regex(/^\d+$/, "pessoa_id deve ser bigint em string numerica"),
  analise_id: z.string().uuid().optional(),
  resumo_institucional: z.string().optional(),
  observacoes: z.string().optional(),
  exercicio_ano: z.number().int().optional(),
  valido_ate: z.string().optional(),
  dados_complementares: z.record(z.unknown()).optional(),
});

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
    const pessoaId = String(body.pessoa_id);
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

    const pessoaIdNumber = Number(pessoaId);
    if (!Number.isFinite(pessoaIdNumber) || pessoaIdNumber <= 0) {
      return NextResponse.json(
        { ok: false, codigo: "VALIDACAO_INVALIDA", message: "pessoa_id invalido." },
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
        return NextResponse.json(
          { ok: false, codigo: "ANALISE_NAO_ENCONTRADA" },
          { status: 404 },
        );
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

    if (existingErr) throw existingErr;
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
      return NextResponse.json(
        { ok: false, codigo: "ERRO_BUSCAR_PESSOA", message: pessoaErr.message },
        { status: 500 }
      );
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

    if (error) throw error;
    return NextResponse.json({ ok: true, data });
  } catch (err) {
    return jsonError(zodToValidationError(err));
  }
}


