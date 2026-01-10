import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs";
import { createClient, type PostgrestError } from "@supabase/supabase-js";
import { guardApiByRole } from "@/lib/auth/roleGuard";

export const dynamic = "force-dynamic";

type ServicoTipo = "CURSO_REGULAR" | "CURSO_LIVRE" | "PROJETO_ARTISTICO";

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
  const denied = await guardApiByRole(req as any);
  if (denied) return denied as any;
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
    const tipoRaw = String(url.searchParams.get("tipo") || "").toUpperCase();
    if (!["CURSO_REGULAR", "CURSO_LIVRE", "PROJETO_ARTISTICO"].includes(tipoRaw)) {
      return NextResponse.json(
        { ok: false, error: "bad_request", message: "tipo invalido.", details: { tipo: tipoRaw } } satisfies ApiErr,
        { status: 400 },
      );
    }

    const tipo = tipoRaw as ServicoTipo;
    const admin = getAdmin();

    if (tipo === "CURSO_LIVRE") {
      const { data, error } = await admin.from("cursos_livres").select("id, nome").order("nome", { ascending: true });

      if (error) {
        if (isMissingRelation(error)) {
          return NextResponse.json(
            {
              ok: true,
              data: [],
              warning: "Tabela cursos_livres nao existe (migracao pendente).",
            } satisfies ApiOk<unknown[]>,
            { status: 200 },
          );
        }
        return NextResponse.json(
          { ok: false, error: "server_error", message: "Falha ao listar cursos livres.", details: { error } } satisfies ApiErr,
          { status: 500 },
        );
      }

      const mapped = (data ?? []).map((x: any) => ({ id: Number(x.id), label: String(x.nome) }));
      return NextResponse.json({ ok: true, data: mapped } satisfies ApiOk<typeof mapped>, { status: 200 });
    }

    const { data, error } = await admin
      .from("escola_produtos_educacionais")
      .select("id, titulo")
      .eq("tipo", tipo)
      .eq("ativo", true)
      .order("titulo", { ascending: true });

    if (error) {
      if (isMissingRelation(error)) {
        return NextResponse.json(
          {
            ok: true,
            data: [],
            warning: "Tabela escola_produtos_educacionais nao existe (migracao pendente).",
          } satisfies ApiOk<unknown[]>,
          { status: 200 },
        );
      }
      return NextResponse.json(
        { ok: false, error: "server_error", message: "Falha ao listar servicos.", details: { error } } satisfies ApiErr,
        { status: 500 },
      );
    }

    const mapped = (data ?? []).map((x: any) => ({ id: Number(x.id), label: String(x.titulo) }));
    return NextResponse.json({ ok: true, data: mapped } satisfies ApiOk<typeof mapped>, { status: 200 });
  } catch (e: unknown) {
    return NextResponse.json(
      {
        ok: false,
        error: "server_error",
        message: "Erro inesperado ao listar servicos.",
        details: { message: e instanceof Error ? e.message : String(e) },
      } satisfies ApiErr,
      { status: 500 },
    );
  }
}
