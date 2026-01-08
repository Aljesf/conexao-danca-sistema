import { NextResponse } from "next/server";
import { z } from "zod";
import { requireMovimentoAdmin } from "@/lib/auth/movimento-guard";
import { getSupabaseServiceClient } from "@/lib/supabase/service";
import { jsonError, zodToValidationError } from "@/lib/http/api-errors";

const BeneficiarioCreateSchema = z.object({
  pessoa_id: z
    .string()
    .regex(/^\d+$/, "pessoa_id deve ser bigint em string numerica"),
  resumo_institucional: z.string().optional(),
  observacoes: z.string().optional(),
  dados_complementares: z.record(z.unknown()).optional(),
});

export async function GET() {
  try {
    await requireMovimentoAdmin();
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

export async function POST(req: Request) {
  try {
    const { userId } = await requireMovimentoAdmin();
    const supabase = getSupabaseServiceClient();

    const bodyUnknown = await req.json();
    const body = BeneficiarioCreateSchema.parse(bodyUnknown);

    const { data: pessoa, error: pessoaErr } = await supabase
      .from("pessoas")
      .select("id,nome,cpf,email,telefone")
      .eq("id", body.pessoa_id)
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
      fonte: "pessoas",
      pessoa_id: String(pessoa.id),
      snapshot_minimo: {
        nome: pessoa.nome ?? null,
        cpf: pessoa.cpf ?? null,
        email: pessoa.email ?? null,
        telefone: pessoa.telefone ?? null,
      },
      resumo_institucional: body.resumo_institucional ?? null,
      observacao:
        "Dados socioeconomicos completos ficam no cadastro de Pessoas.",
    });

    const { data, error } = await supabase
      .from("movimento_beneficiarios")
      .insert({
        pessoa_id: body.pessoa_id,
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
