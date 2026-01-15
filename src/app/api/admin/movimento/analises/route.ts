import { NextResponse } from "next/server";
import { z } from "zod";
import { guardApiByRole } from "@/lib/auth/roleGuard";
import { requireMovimentoAdmin } from "@/lib/auth/movimento-guard";
import { getSupabaseServiceClient } from "@/lib/supabase/service";
import { jsonError, zodToValidationError } from "@/lib/http/api-errors";

const AseCreateSchema = z.object({
  pessoa_id: z.union([z.number().int().positive(), z.string().regex(/^\d+$/)]),
  responsavel_legal_pessoa_id: z
    .union([z.number().int().positive(), z.string().regex(/^\d+$/)])
    .nullable()
    .optional(),
  data_analise: z.string().optional(),
  contexto: z.enum(["ASE_18_PLUS", "ASE_MENOR"]),
  respostas_json: z.record(z.unknown()).optional(),
  status: z.enum(["RASCUNHO", "CONCLUIDA", "REVISADA"]).optional(),
  resultado_status: z.enum(["NECESSITA_APOIO", "APOIO_PARCIAL", "SEM_APOIO"]).nullable().optional(),
  observacao_institucional: z.string().nullable().optional(),
  data_sugerida_revisao: z.string().nullable().optional(),
});

export async function GET(req: Request) {
  const denied = await guardApiByRole(req as any);
  if (denied) return denied as any;
  try {
    await requireMovimentoAdmin();
    const supabase = getSupabaseServiceClient();

    const url = new URL(req.url);
    const pessoaId = url.searchParams.get("pessoa_id");
    const status = url.searchParams.get("status");
    const contexto = url.searchParams.get("contexto");

    let q = supabase
      .from("movimento_analises_socioeconomicas")
      .select("*")
      .order("data_analise", { ascending: false })
      .order("created_at", { ascending: false });

    if (pessoaId) q = q.eq("pessoa_id", Number(pessoaId));
    if (status) q = q.eq("status", status);
    if (contexto) q = q.eq("contexto", contexto);

    const { data, error } = await q;
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
    const body = AseCreateSchema.parse(bodyUnknown);

    const pessoaId = typeof body.pessoa_id === "string" ? Number(body.pessoa_id) : body.pessoa_id;
    const responsavelId =
      body.responsavel_legal_pessoa_id == null
        ? null
        : typeof body.responsavel_legal_pessoa_id === "string"
          ? Number(body.responsavel_legal_pessoa_id)
          : body.responsavel_legal_pessoa_id;

    if (!pessoaId || Number.isNaN(pessoaId)) {
      return NextResponse.json({ ok: false, codigo: "VALIDACAO_INVALIDA" }, { status: 400 });
    }

    if (body.contexto === "ASE_MENOR" && (!responsavelId || Number.isNaN(responsavelId))) {
      return NextResponse.json({ ok: false, codigo: "VALIDACAO_INVALIDA" }, { status: 400 });
    }

    const payload = {
      pessoa_id: pessoaId,
      responsavel_legal_pessoa_id: body.contexto === "ASE_MENOR" ? responsavelId : null,
      data_analise: body.data_analise ?? undefined,
      contexto: body.contexto,
      respostas_json: body.respostas_json ?? {},
      status: body.status ?? "RASCUNHO",
      resultado_status: body.resultado_status ?? null,
      observacao_institucional: body.observacao_institucional ?? null,
      data_sugerida_revisao: body.data_sugerida_revisao ?? null,
      registrado_por_user_id: userId,
    };

    const { data, error } = await supabase
      .from("movimento_analises_socioeconomicas")
      .insert(payload)
      .select("*")
      .single();

    if (error) throw error;

    return NextResponse.json({ ok: true, data }, { status: 201 });
  } catch (err) {
    return jsonError(zodToValidationError(err));
  }
}
