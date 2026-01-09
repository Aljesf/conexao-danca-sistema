import { NextResponse } from "next/server";
import { z } from "zod";
import { requireMovimentoAdmin } from "@/lib/auth/movimento-guard";
import { executarMotorMensalMovimento } from "@/lib/movimento/motor";
import { guardApiByRole } from "@/lib/auth/roleGuard";

const ExecSchema = z.object({
  competencia: z.string().min(7), // YYYY-MM
  valoresBasePorOrigemRecurso: z.record(z.number().nonnegative()).optional(),
});

export async function POST(req: Request) {
  const denied = await guardApiByRole(req as any);
  if (denied) return denied as any;
  try {
    await requireMovimentoAdmin();
    const payloadUnknown = await req.json();
    const payload = ExecSchema.parse(payloadUnknown);

    const result = await executarMotorMensalMovimento({
      competencia: payload.competencia,
      valoresBasePorOrigemRecurso: payload.valoresBasePorOrigemRecurso,
    });

    return NextResponse.json({ ok: true, data: result });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "ERRO_INESPERADO";
    const status =
      msg === "NAO_AUTENTICADO" ? 401 :
      msg === "SEM_PERMISSAO_MOVIMENTO_ADMIN" ? 403 :
      msg === "SERVICE_ROLE_NAO_CONFIGURADO" ? 500 :
      msg.startsWith("ZodError") ? 400 : 500;
    return NextResponse.json({ ok: false, codigo: msg }, { status });
  }
}
