import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs";
import { createClient, type PostgrestError } from "@supabase/supabase-js";
import { guardApiByRole } from "@/lib/auth/roleGuard";

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
    const servicoId = Number(url.searchParams.get("servico_id") || 0);
    const contextoId = Number(url.searchParams.get("contexto_id") || 0);
    const servicoTipoParam = String(url.searchParams.get("servico_tipo") || "").toUpperCase();
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

    let servicoTipo = "";
    let servicoContextoId = 0;
    let isCursoLivre = false;
    let servicoEncontrado = false;

    if (servicoTipoParam === "CURSO_LIVRE") {
      const { data: cursoLivre, error: cursoLivreErr } = await admin
        .from("cursos_livres")
        .select("id")
        .eq("id", servicoId)
        .maybeSingle();

      if (cursoLivreErr) {
        if (isMissingRelation(cursoLivreErr)) {
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
          {
            ok: false,
            error: "server_error",
            message: "Falha ao carregar curso livre.",
            details: { error: cursoLivreErr },
          } satisfies ApiErr,
          { status: 500 },
        );
      }

      if (cursoLivre) {
        servicoTipo = "CURSO_LIVRE";
        isCursoLivre = true;
        servicoEncontrado = true;
      }
    } else {
      const { data: servico, error: servicoErr } = await admin
        .from("escola_produtos_educacionais")
        .select("id,tipo,contexto_matricula_id")
        .eq("id", servicoId)
        .maybeSingle();

      if (servicoErr && !isMissingRelation(servicoErr)) {
        return NextResponse.json(
          {
            ok: false,
            error: "server_error",
            message: "Falha ao carregar servico.",
            details: { error: servicoErr },
          } satisfies ApiErr,
          { status: 500 },
        );
      }

      if (servico) {
        servicoTipo = String((servico as { tipo?: string }).tipo || "").toUpperCase();
        servicoContextoId = Number(
          (servico as { contexto_matricula_id?: number | null }).contexto_matricula_id ?? 0,
        );
        servicoEncontrado = true;
      } else if (!servicoTipoParam) {
        const { data: cursoLivre, error: cursoLivreErr } = await admin
          .from("cursos_livres")
          .select("id")
          .eq("id", servicoId)
          .maybeSingle();

        if (cursoLivreErr) {
          if (isMissingRelation(cursoLivreErr)) {
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
            {
              ok: false,
              error: "server_error",
              message: "Falha ao carregar curso livre.",
              details: { error: cursoLivreErr },
            } satisfies ApiErr,
            { status: 500 },
          );
        }

        if (cursoLivre) {
          servicoTipo = "CURSO_LIVRE";
          isCursoLivre = true;
          servicoEncontrado = true;
        }
      }
    }

    if (!servicoEncontrado) {
      return NextResponse.json(
        {
          ok: false,
          error: "bad_request",
          message: "servico nao encontrado.",
          details: { servicoId },
        } satisfies ApiErr,
        { status: 404 },
      );
    }
    const deveFiltrarPorContextoNaTurma = servicoTipo === "CURSO_REGULAR" || servicoTipo === "REGULAR";
    let turmaIds: number[] | null = null;
    if (deveFiltrarPorContextoNaTurma && Number.isFinite(contextoId) && contextoId > 0) {
      const { data: turmasCtx, error: turmasErr } = await admin
        .from("turmas")
        .select("turma_id")
        .eq("contexto_matricula_id", contextoId);
      if (turmasErr) {
        return NextResponse.json(
          {
            ok: false,
            error: "server_error",
            message: "Falha ao filtrar turmas pelo contexto.",
            details: { turmasErr },
          } satisfies ApiErr,
          { status: 500 },
        );
      }
      turmaIds = (turmasCtx ?? [])
        .map((row) => Number((row as { turma_id?: number }).turma_id))
        .filter((id) => Number.isFinite(id) && id > 0);
      if (turmaIds.length === 0) {
        return NextResponse.json({ ok: true, data: [] } satisfies ApiOk<unknown[]>, { status: 200 });
      }
    } else if (!deveFiltrarPorContextoNaTurma && Number.isFinite(contextoId) && contextoId > 0) {
      if (Number.isFinite(servicoContextoId) && servicoContextoId > 0 && contextoId !== servicoContextoId) {
        return NextResponse.json(
          {
            ok: false,
            error: "bad_request",
            message: "contexto incompativel com o servico informado.",
            details: { contextoId, servicoContextoId },
          } satisfies ApiErr,
          { status: 409 },
        );
      }
    }

    let data: unknown[] | null = null;
    let error: PostgrestError | null = null;
    let turmasCursoLivre: Array<{ turma_id: number; nome: string | null; ano_referencia: number | null; curso: string | null }> = [];

    if (isCursoLivre) {
      const { data: turmasData, error: turmasErr } = await admin
        .from("turmas")
        .select("turma_id,nome,ano_referencia,curso")
        .eq("tipo_turma", "CURSO_LIVRE")
        .eq("curso_livre_id", servicoId);

      if (turmasErr) {
        return NextResponse.json(
          {
            ok: false,
            error: "server_error",
            message: "Falha ao listar turmas do curso livre.",
            details: { error: turmasErr },
          } satisfies ApiErr,
          { status: 500 },
        );
      }

      turmasCursoLivre = (turmasData ?? []) as Array<{
        turma_id: number;
        nome: string | null;
        ano_referencia: number | null;
        curso: string | null;
      }>;
      const turmaIdsCursoLivre = turmasCursoLivre
        .map((t) => Number(t.turma_id))
        .filter((id) => Number.isFinite(id) && id > 0);

      if (turmaIdsCursoLivre.length === 0) {
        return NextResponse.json({ ok: true, data: [] } satisfies ApiOk<unknown[]>, { status: 200 });
      }

      ({ data, error } = await admin
        .from("escola_unidades_execucao")
        .select("unidade_execucao_id, denominacao, nome, origem_tipo, origem_id")
        .eq("ativo", true)
        .eq("origem_tipo", "TURMA")
        .in("origem_id", turmaIdsCursoLivre)
        .order("nome", { ascending: true }));
    } else {
      let query = admin
        .from("escola_unidades_execucao")
        .select("unidade_execucao_id, denominacao, nome, origem_tipo, origem_id")
        .eq("servico_id", servicoId)
        .eq("ativo", true)
        .eq("origem_tipo", "TURMA");

      if (turmaIds) {
        query = query.in("origem_id", turmaIds);
      }

      ({ data, error } = await query.order("nome", { ascending: true }));
    }

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

    const origemTurmaIds = (data ?? [])
      .map((ue) => Number((ue as { origem_id?: number }).origem_id))
      .filter((id) => Number.isFinite(id) && id > 0);

    const turmaById = new Map<number, { nome: string | null; ano_referencia: number | null; curso: string | null }>();
    if (isCursoLivre) {
      turmasCursoLivre.forEach((t) => {
        const turmaId = Number(t.turma_id);
        if (!Number.isFinite(turmaId) || turmaId <= 0) return;
        turmaById.set(turmaId, {
          nome: t.nome ?? null,
          ano_referencia: t.ano_referencia ?? null,
          curso: t.curso ?? null,
        });
      });
    } else if (origemTurmaIds.length > 0) {
      const { data: turmas, error: turmasErr } = await admin
        .from("turmas")
        .select("turma_id,nome,ano_referencia,curso")
        .in("turma_id", Array.from(new Set(origemTurmaIds)));

      if (!turmasErr) {
        (turmas ?? []).forEach((t) => {
          const record = t as {
            turma_id?: number | null;
            nome?: string | null;
            ano_referencia?: number | null;
            curso?: string | null;
          };
          const turmaId = Number(record.turma_id);
          if (!Number.isFinite(turmaId) || turmaId <= 0) return;
          turmaById.set(turmaId, {
            nome: record.nome ?? null,
            ano_referencia: record.ano_referencia ?? null,
            curso: record.curso ?? null,
          });
        });
      }
    }

    const mapped = (data ?? []).map((ue) => {
      const record = ue as {
        unidade_execucao_id: number | null;
        denominacao: string | null;
        nome: string | null;
        origem_id?: number | null;
      };
      const ueId = Number(record.unidade_execucao_id);
      const turmaId = Number(record.origem_id);
      const turma = Number.isFinite(turmaId) ? turmaById.get(turmaId) ?? null : null;
      return {
        id: ueId,
        unidade_execucao_id: ueId,
        turma_id: Number.isFinite(turmaId) ? turmaId : null,
        turma_nome: turma?.nome ?? null,
        turma_ano_referencia: turma?.ano_referencia ?? null,
        turma_curso: turma?.curso ?? null,
        label: `${String(record.denominacao ?? "")}: ${String(record.nome ?? "")} [UE: ${ueId}]`,
      };
    });

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
