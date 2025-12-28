import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs";
import { createClient, type PostgrestError } from "@supabase/supabase-js";

export const dynamic = "force-dynamic";

type ApiOk<T> = { ok: true; data: T; warning?: string };
type ApiErr = {
  ok: false;
  error: "bad_request" | "unauthorized" | "server_error";
  message: string;
  details?: Record<string, unknown> | null;
};

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

function isMissingRelation(err: unknown): boolean {
  const e = err as PostgrestError | null;
  return !!e && typeof e.code === "string" && e.code === "42P01";
}

export async function GET(req: Request) {
  try {
    const cookieStore = await cookies();
    const supabaseAuth = createRouteHandlerClient({ cookies: () => cookieStore });
    const { data: u } = await supabaseAuth.auth.getUser();
    if (!u?.user) {
      return NextResponse.json(
        { ok: false, error: "unauthorized", message: "Nao autenticado.", details: null } satisfies ApiErr,
        { status: 401 },
      );
    }

    const url = new URL(req.url);
    const servicoId = Number(url.searchParams.get("servico_id") || 0);
    if (!Number.isFinite(servicoId) || servicoId <= 0) {
      return NextResponse.json(
        {
          ok: false,
          error: "bad_request",
          message: "servico_id invalido.",
          details: { servicoId },
        } satisfies ApiErr,
        { status: 400 },
      );
    }

    const admin = getAdmin();
    const { data, error } = await admin
      .from("escola_unidades_execucao")
      .select("unidade_execucao_id, denominacao, nome")
      .eq("servico_id", servicoId)
      .eq("ativo", true)
      .order("nome", { ascending: true });

    if (error) {
      if (isMissingRelation(error)) {
        return NextResponse.json(
          {
            ok: true,
            data: [],
            warning: "Tabela escola_unidades_execucao nao existe (migracao pendente).",
          } satisfies ApiOk<unknown[]>,
          { status: 200 },
        );
      }
      return NextResponse.json(
        {
          ok: false,
          error: "server_error",
          message: "Falha ao listar unidades de execucao.",
          details: { error },
        } satisfies ApiErr,
        { status: 500 },
      );
    }

    const mapped = (data ?? []).map((ue: any) => ({
      id: Number(ue.unidade_execucao_id),
      label: `${String(ue.denominacao)}: ${String(ue.nome)} [UE: ${Number(ue.unidade_execucao_id)}]`,
    }));

    return NextResponse.json({ ok: true, data: mapped } satisfies ApiOk<typeof mapped>, { status: 200 });
  } catch (e: unknown) {
    return NextResponse.json(
      {
        ok: false,
        error: "server_error",
        message: "Erro inesperado ao listar unidades de execucao.",
        details: { message: e instanceof Error ? e.message : String(e) },
      } satisfies ApiErr,
      { status: 500 },
    );
  }
}
