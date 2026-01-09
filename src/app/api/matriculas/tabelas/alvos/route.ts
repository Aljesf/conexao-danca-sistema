import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs";
import { createClient, type PostgrestError } from "@supabase/supabase-js";
import { formatUnidadeExecucaoLabel } from "@/lib/escola/formatters/unidadeExecucaoLabel";
import { guardApiByRole } from "@/lib/auth/roleGuard";

type AlvoTipo = "TURMA" | "CURSO_LIVRE" | "PROJETO";
type AlvoOption = {
  id: number;
  alvo_label: string;
  servico_nome?: string | null;
};

type ApiOk<T> = { ok: true; data: T; warning?: string };
type ApiErr = {
  ok: false;
  message: string;
  error: "bad_request" | "unauthorized" | "server_error";
  details?: Record<string, unknown> | null;
};

function badRequest(message: string, details?: Record<string, unknown>) {
  return NextResponse.json({ ok: false, error: "bad_request", message, details: details ?? null } satisfies ApiErr, {
    status: 400,
  });
}
function serverError(message: string, details?: Record<string, unknown>) {
  return NextResponse.json({ ok: false, error: "server_error", message, details: details ?? null } satisfies ApiErr, {
    status: 500,
  });
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
    const tipoRaw = String(url.searchParams.get("tipo") || "TURMA").toUpperCase();

    if (tipoRaw === "WORKSHOP") return badRequest("WORKSHOP nao e um tipo separado; use CURSO_LIVRE.");
    if (!['TURMA', 'CURSO_LIVRE', 'PROJETO'].includes(tipoRaw)) {
      return badRequest("tipo invalido.", { tipo: tipoRaw });
    }

    const tipo = tipoRaw as AlvoTipo;
    const admin = getAdmin();

    if (tipo === "TURMA") {
      const { data: turmas, error: turmasErr } = await admin
        .from("turmas")
        .select("turma_id, nome, produto_id")
        .eq("tipo_turma", "REGULAR")
        .order("nome", { ascending: true });

      if (turmasErr) {
        return serverError("Falha ao listar turmas.", { error: turmasErr });
      }

      const turmaRows = (turmas ?? []) as Array<{ turma_id: number; nome: string | null; produto_id: number | null }>;
      const turmaIds = turmaRows
        .map((t) => Number(t.turma_id))
        .filter((id) => Number.isFinite(id) && id > 0);

      let warning: string | undefined;
      let ueMap = new Map<
        number,
        {
          unidade_execucao_id: number;
          denominacao: string | null;
          nome: string | null;
          servico_id: number | null;
        }
      >();

      if (turmaIds.length) {
        const { data: ueData, error: ueErr } = await admin
          .from("escola_unidades_execucao")
          .select("unidade_execucao_id, denominacao, nome, origem_id, origem_tipo, servico_id")
          .eq("origem_tipo", "TURMA")
          .in("origem_id", turmaIds);

        if (ueErr) {
          if (isMissingRelation(ueErr)) {
            warning = "Tabela escola_unidades_execucao nao encontrada (migracao pendente).";
          } else {
            return serverError("Falha ao listar unidades de execucao.", { error: ueErr });
          }
        } else {
          const rows = (ueData ?? []) as Array<{
            unidade_execucao_id: number;
            denominacao: string | null;
            nome: string | null;
            origem_id: number | null;
            origem_tipo: string | null;
            servico_id: number | null;
          }>;
          ueMap = new Map(
            rows
              .filter((row) => row.origem_tipo === "TURMA" && Number.isFinite(Number(row.origem_id)))
              .map((row) => [Number(row.origem_id), row]),
          );
        }
      }

      const servicoIds = new Set<number>();
      turmaRows.forEach((t) => {
        const ue = ueMap.get(Number(t.turma_id));
        const servicoId = Number(ue?.servico_id ?? t.produto_id ?? 0);
        if (Number.isFinite(servicoId) && servicoId > 0) servicoIds.add(servicoId);
      });

      const servicoMap = new Map<number, string>();
      if (servicoIds.size > 0) {
        const { data: servicos, error: servicosErr } = await admin
          .from("escola_produtos_educacionais")
          .select("id, titulo")
          .in("id", Array.from(servicoIds));

        if (servicosErr) {
          if (isMissingRelation(servicosErr)) {
            warning = warning || "Tabela escola_produtos_educacionais nao encontrada (migracao pendente).";
          } else {
            return serverError("Falha ao listar servicos.", { error: servicosErr });
          }
        } else {
          (servicos ?? []).forEach((row: { id: number; titulo: string | null }) => {
            const id = Number(row.id);
            if (Number.isFinite(id) && id > 0) {
              const titulo = typeof row.titulo === "string" && row.titulo.trim() ? row.titulo.trim() : `Servico ${id}`;
              servicoMap.set(id, titulo);
            }
          });
        }
      }

      const mapped: AlvoOption[] = turmaRows.map((t) => {
        const turmaId = Number(t.turma_id);
        const turmaNome = typeof t.nome === "string" ? t.nome : null;
        const ue = ueMap.get(turmaId);
        const alvo_label = formatUnidadeExecucaoLabel({
          unidadeExecucaoId: ue?.unidade_execucao_id ?? null,
          origemTipo: "TURMA",
          turmaId,
          turmaNome,
          unidadeDenominacao: ue?.denominacao ?? null,
          unidadeNome: ue?.nome ?? null,
        });

        const servicoId = Number(ue?.servico_id ?? t.produto_id ?? 0);
        const servico_nome =
          Number.isFinite(servicoId) && servicoId > 0 ? servicoMap.get(servicoId) ?? null : null;

        return { id: turmaId, alvo_label, servico_nome };
      });

      return NextResponse.json(
        { ok: true, data: mapped, warning } satisfies ApiOk<AlvoOption[]>,
        { status: 200 },
      );
    }

    const produtoTipo = tipo === "CURSO_LIVRE" ? "CURSO_LIVRE" : "PROJETO_ARTISTICO";

    const { data, error } = await admin
      .from("escola_produtos_educacionais")
      .select("id, titulo")
      .eq("tipo", produtoTipo)
      .eq("ativo", true)
      .order("titulo", { ascending: true });

    if (error) {
      if (isMissingRelation(error)) {
        return NextResponse.json(
          {
            ok: true,
            data: [],
            warning: "Fonte de produtos educacionais ainda nao esta configurada no banco (migracao pendente).",
          } satisfies ApiOk<unknown[]>,
          { status: 200 },
        );
      }
      return serverError("Falha ao listar produtos educacionais.", { error });
    }

    const mapped: AlvoOption[] = (data ?? []).map((x: { id: number; titulo: string | null }) => {
      const id = Number(x.id);
      const titulo = typeof x.titulo === "string" && x.titulo.trim() ? x.titulo.trim() : `Servico ${id}`;
      return { id, alvo_label: titulo, servico_nome: titulo };
    });
    return NextResponse.json({ ok: true, data: mapped } satisfies ApiOk<AlvoOption[]>, { status: 200 });
  } catch (e: unknown) {
    return serverError("Erro inesperado ao listar alvos.", { message: e instanceof Error ? e.message : String(e) });
  }
}
