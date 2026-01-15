import { NextResponse } from "next/server";
import { z } from "zod";
import { requireMovimentoAdmin } from "@/lib/auth/movimento-guard";
import { getSupabaseServiceClient } from "@/lib/supabase/service";
import { jsonError, zodToValidationError } from "@/lib/http/api-errors";
import { guardApiByRole } from "@/lib/auth/roleGuard";

const BeneficiarioCreateSchema = z.object({
  pessoa_id: z
    .string()
    .regex(/^\d+$/, "pessoa_id deve ser bigint em string numerica")
    .optional(),
  analise_id: z.string().uuid().optional(),
  contexto: z.enum(["ASE_18_PLUS", "ASE_MENOR"]).optional(),
  responsavel_legal_pessoa_id: z.string().regex(/^\d+$/).optional(),
  resumo_institucional: z.string().optional(),
  observacoes: z.string().optional(),
  dados_complementares: z.record(z.unknown()).optional(),
});

export async function GET(req: Request) {
  const denied = await guardApiByRole(req as any);
  if (denied) return denied as any;
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
  const denied = await guardApiByRole(req as any);
  if (denied) return denied as any;
  try {
    const { userId } = await requireMovimentoAdmin();
    const supabase = getSupabaseServiceClient();

    const bodyUnknown = await req.json();
    const body = BeneficiarioCreateSchema.parse(bodyUnknown);

    const analiseId = body.analise_id ? String(body.analise_id) : null;
    const pessoaIdFromBody = body.pessoa_id ? String(body.pessoa_id) : null;
    const responsavelId =
      body.responsavel_legal_pessoa_id ? Number(body.responsavel_legal_pessoa_id) : null;

    if (!analiseId && !pessoaIdFromBody) {
      return NextResponse.json(
        { ok: false, codigo: "VALIDACAO_INVALIDA", message: "Informe analise_id ou pessoa_id." },
        { status: 400 },
      );
    }

    let analise:
      | {
          id: string;
          pessoa_id: number;
          contexto: "ASE_18_PLUS" | "ASE_MENOR";
          data_analise: string;
        }
      | null = null;

    if (analiseId) {
      const { data: analiseData, error: analiseErr } = await supabase
        .from("movimento_analises_socioeconomicas")
        .select("id,pessoa_id,contexto,data_analise")
        .eq("id", analiseId)
        .single();

      if (analiseErr) {
        return NextResponse.json(
          { ok: false, codigo: "ANALISE_NAO_ENCONTRADA" },
          { status: 404 },
        );
      }

      analise = analiseData as {
        id: string;
        pessoa_id: number;
        contexto: "ASE_18_PLUS" | "ASE_MENOR";
        data_analise: string;
      };
    }

    const pessoaId = analise ? String(analise.pessoa_id) : pessoaIdFromBody;

    if (analise && pessoaIdFromBody && pessoaIdFromBody !== String(analise.pessoa_id)) {
      return NextResponse.json(
        { ok: false, codigo: "VALIDACAO_INVALIDA", message: "pessoa_id nao confere com analise." },
        { status: 400 },
      );
    }

    if (!pessoaId) {
      return NextResponse.json(
        { ok: false, codigo: "VALIDACAO_INVALIDA", message: "pessoa_id invalido." },
        { status: 400 },
      );
    }

    if (!analise) {
      const contexto = body.contexto ?? "ASE_18_PLUS";

      if (contexto === "ASE_MENOR" && (!responsavelId || Number.isNaN(responsavelId))) {
        return NextResponse.json(
          { ok: false, codigo: "VALIDACAO_INVALIDA", message: "ASE_MENOR exige responsavel legal." },
          { status: 400 },
        );
      }

      const { data: analiseData, error: analiseErr } = await supabase
        .from("movimento_analises_socioeconomicas")
        .insert({
          pessoa_id: Number(pessoaId),
          responsavel_legal_pessoa_id: contexto === "ASE_MENOR" ? responsavelId : null,
          contexto,
          status: "RASCUNHO",
          respostas_json: {},
          registrado_por_user_id: userId,
        })
        .select("id,pessoa_id,contexto,data_analise")
        .single();

      if (analiseErr) throw analiseErr;

      analise = analiseData as {
        id: string;
        pessoa_id: number;
        contexto: "ASE_18_PLUS" | "ASE_MENOR";
        data_analise: string;
      };
    }

    if (!analise) {
      return NextResponse.json(
        { ok: false, codigo: "ANALISE_NAO_ENCONTRADA" },
        { status: 500 },
      );
    }

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
      fonte: "analise_socioeconomica",
      analise_id: analise.id,
      pessoa_id: String(pessoa.id),
      snapshot_minimo: {
        nome: pessoa.nome ?? null,
        cpf: pessoa.cpf ?? null,
        email: pessoa.email ?? null,
        telefone: pessoa.telefone ?? null,
      },
      resumo_institucional: body.resumo_institucional ?? null,
      observacao:
        "Dados socioeconomicos completos ficam na ASE vinculada ao beneficiario.",
    });

    const { data, error } = await supabase
      .from("movimento_beneficiarios")
      .insert({
        pessoa_id: pessoaId,
        analise_id: analise.id,
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
