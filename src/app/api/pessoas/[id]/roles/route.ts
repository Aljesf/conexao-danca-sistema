import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { normalizeCpf, validateCpf } from "@/lib/validators/cpf";

const BodySchema = z.object({
  role: z.string().min(2),
});

function isResponsavelFinanceiro(role: string): boolean {
  return role.toUpperCase() === "RESPONSAVEL_FINANCEIRO";
}

export async function POST(req: Request, ctx: { params: { id: string } }) {
  const supabase = await createClient();

  const pessoaId = Number(ctx.params.id);
  if (!Number.isFinite(pessoaId) || pessoaId <= 0) {
    return Response.json({ ok: false, code: "PESSOA_ID_INVALIDO" }, { status: 400 });
  }

  const bodyUnknown: unknown = await req.json().catch(() => null);
  const parsed = BodySchema.safeParse(bodyUnknown);
  if (!parsed.success) {
    return Response.json(
      { ok: false, code: "PAYLOAD_INVALIDO", issues: parsed.error.issues },
      { status: 400 }
    );
  }

  const role = parsed.data.role;

  if (isResponsavelFinanceiro(role)) {
    const { data: pessoa, error: pessoaErr } = await supabase
      .from("pessoas")
      .select("id, cpf")
      .eq("id", pessoaId)
      .maybeSingle();

    if (pessoaErr) {
      return Response.json(
        { ok: false, code: "ERRO_BUSCAR_PESSOA", message: pessoaErr.message },
        { status: 500 }
      );
    }

    const cpfDb = normalizeCpf(pessoa?.cpf ?? "");
    const v = validateCpf(cpfDb);
    if (!v.ok) {
      return Response.json(
        { ok: false, code: "CPF_OBRIGATORIO_PARA_RESPONSAVEL_FINANCEIRO", reason: v.reason },
        { status: 400 }
      );
    }
  }

  const { error: insErr } = await supabase
    .from("pessoas_roles")
    .insert({ pessoa_id: pessoaId, role });

  if (insErr) {
    return Response.json(
      { ok: false, code: "ERRO_ATRIBUIR_ROLE", message: insErr.message },
      { status: 500 }
    );
  }

  return Response.json({ ok: true });
}
