import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs";
import { createClient, type PostgrestError } from "@supabase/supabase-js";

type AlvoTipo = "TURMA" | "CURSO_LIVRE" | "PROJETO";

type ApiOk<T> = { ok: true; data: T; warning?: string };
type ApiErr = {
  ok: false;
  message: string;
  error: "bad_request" | "unauthorized" | "server_error";
  details?: Record<string, unknown> | null;
};

function badRequest(message: string, details?: Record<string, unknown>) {
  return NextResponse.json(
    { ok: false, error: "bad_request", message, details: details ?? null } satisfies ApiErr,
    { status: 400 },
  );
}
function serverError(message: string, details?: Record<string, unknown>) {
  return NextResponse.json(
    { ok: false, error: "server_error", message, details: details ?? null } satisfies ApiErr,
    { status: 500 },
  );
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
    const tipoRaw = String(url.searchParams.get("tipo") || "TURMA").toUpperCase();

    if (tipoRaw === "WORKSHOP") return badRequest("WORKSHOP nao e um tipo separado; use CURSO_LIVRE.");

    if (!["TURMA", "CURSO_LIVRE", "PROJETO"].includes(tipoRaw)) {
      return badRequest("tipo invalido.", { tipo: tipoRaw });
    }

    const tipo = tipoRaw as AlvoTipo;
    const admin = getAdmin();

    if (tipo === "TURMA") {
      const { data, error } = await admin
        .from("turmas")
        .select("turma_id, nome")
        .eq("tipo_turma", "REGULAR")
        .order("nome", { ascending: true });

      if (error) return serverError("Falha ao listar turmas (REGULAR).", { error });

      const mapped = (data ?? []).map((t) => ({
        id: Number((t as unknown as { turma_id: number }).turma_id),
        label: String((t as unknown as { nome: string }).nome),
      }));

      return NextResponse.json({ ok: true, data: mapped } satisfies ApiOk<typeof mapped>, { status: 200 });
    }

    if (tipo === "CURSO_LIVRE") {
      const { data, error } = await admin
        .from("turmas")
        .select("turma_id, nome")
        .eq("tipo_turma", "CURSO_LIVRE")
        .order("nome", { ascending: true });

      if (error) return serverError("Falha ao listar turmas (CURSO_LIVRE).", { error });

      const mapped = (data ?? []).map((t) => ({
        id: Number((t as unknown as { turma_id: number }).turma_id),
        label: String((t as unknown as { nome: string }).nome),
      }));

      return NextResponse.json({ ok: true, data: mapped } satisfies ApiOk<typeof mapped>, { status: 200 });
    }

    {
      const { data, error } = await admin.from("projetos_artistico").select("id, titulo").order("titulo");

      if (error) {
        if (isMissingRelation(error)) {
          return NextResponse.json(
            { ok: true, data: [], warning: "Fonte PROJETO ainda nao configurada no banco." } satisfies ApiOk<unknown[]>,
            { status: 200 },
          );
        }
        return serverError("Falha ao listar projetos artisticos.", { error });
      }

      const mapped = (data ?? []).map((x: { id: number; titulo: string }) => ({
        id: Number(x.id),
        label: String(x.titulo),
      }));
      return NextResponse.json({ ok: true, data: mapped } satisfies ApiOk<typeof mapped>, { status: 200 });
    }
  } catch (e: unknown) {
    return serverError("Erro inesperado ao listar alvos.", { message: e instanceof Error ? e.message : String(e) });
  }
}
