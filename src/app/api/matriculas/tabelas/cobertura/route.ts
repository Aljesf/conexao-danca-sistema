import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { guardApiByRole } from "@/lib/auth/roleGuard";
import { requireUser } from "@/lib/supabase/api-auth";

function badRequest(message: string, details?: Record<string, unknown>) {
  return NextResponse.json({ ok: false, error: "bad_request", message, details: details ?? null }, { status: 400 });
}
function serverError(message: string, details?: Record<string, unknown>) {
  return NextResponse.json({ ok: false, error: "server_error", message, details: details ?? null }, { status: 500 });
}
function getAdmin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const service =
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.SUPABASE_SERVICE_ROLE ||
    process.env.SUPABASE_SERVICE_KEY ||
    "";
  if (!url) throw new Error("Env ausente: NEXT_PUBLIC_SUPABASE_URL");
  if (!service) throw new Error("Env ausente: SUPABASE_SERVICE_ROLE_KEY");
  return createClient(url, service, { auth: { persistSession: false } });
}

export async function GET(request: NextRequest) {
  const denied = await guardApiByRole(request as any);
  if (denied) return denied as any;
  try {
    const auth = await requireUser(request);
    if (auth instanceof NextResponse) return auth;

    const url = new URL(request.url);
    const ano = Number(url.searchParams.get("ano") || "");
    if (!ano) return badRequest("ano e obrigatorio.");

    const admin = getAdmin();

    const { data: coberturaRaw, error: cobErr } = await admin
      .from("matricula_tabelas_alvos")
      .select("alvo_tipo,alvo_id,matricula_tabelas:tabela_id ( id, ano_referencia, ativo, titulo, produto_tipo )")
      .eq("matricula_tabelas.ativo", true);

    if (cobErr) return serverError("Falha ao montar cobertura.", { cobErr });

    const cobertura = (coberturaRaw ?? []).filter((row) => {
      const tabela = row.matricula_tabelas as {
        ano_referencia?: number | null;
        produto_tipo?: string | null;
      } | null;
      if (!tabela) return false;
      const produtoTipo = String(tabela.produto_tipo ?? "").toUpperCase();
      const alvoTipo = String(row.alvo_tipo ?? "").toUpperCase();
      const isRegular = produtoTipo === "REGULAR" || (!produtoTipo && alvoTipo === "TURMA");
      if (isRegular) {
        return tabela.ano_referencia === ano;
      }
      return true;
    });

    return NextResponse.json({ ok: true, data: cobertura }, { status: 200 });
  } catch (e: unknown) {
    return serverError("Erro inesperado ao montar cobertura.", { message: e instanceof Error ? e.message : String(e) });
  }
}

