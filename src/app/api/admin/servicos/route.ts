import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { guardApiByRole } from "@/lib/auth/roleGuard";

type ServicoRow = {
  id: number;
  tipo: string;
  titulo: string | null;
  ativo: boolean;
  ano_referencia: number | null;
  referencia_tipo?: string | null;
  referencia_id?: number | null;
  created_at: string | null;
  updated_at: string | null;
};

type TurmaRow = {
  turma_id: number;
  nome: string | null;
  tipo_turma: string | null;
  capacidade: number | null;
};

type ServicoPayload = {
  tipo?: string | null;
  titulo?: string | null;
  ano_referencia?: number | null;
  ativo?: boolean | null;
  referencia_tipo?: string | null;
  referencia_id?: number | null;
};

// Observacao:
// - Esta rota e ADMIN: usar SERVICE_ROLE para leitura e evitar travas de RLS.
// - Caso voce ja tenha um helper padrao no projeto (ex.: getSupabaseServerSSR),
//   pode substituir o createClient daqui por ele, mantendo a logica de tratamento.

function getSupabaseAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRole = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceRole) {
    throw new Error("ENV ausente: NEXT_PUBLIC_SUPABASE_URL e/ou SUPABASE_SERVICE_ROLE_KEY");
  }

  return createClient(url, serviceRole, {
    auth: { persistSession: false },
  });
}

export async function GET(req: Request) {
  const denied = await guardApiByRole(req as any);
  if (denied) return denied as any;
  try {
    const supabase = getSupabaseAdminClient();

    // Query simples e robusta:
    // - Sem joins (para nao quebrar por coluna/relacionamento ainda em migracao)
    // - Ordenacao por id (mais seguro)
    const { data, error } = await supabase
      .from("servicos")
      .select("id,tipo,titulo,ativo,ano_referencia,referencia_tipo,referencia_id,created_at,updated_at")
      .order("id", { ascending: false });

    if (error) {
      console.error("[api/admin/servicos] Supabase error:", {
        message: error.message,
        details: (error as unknown as { details?: string }).details,
        hint: (error as unknown as { hint?: string }).hint,
        code: (error as unknown as { code?: string }).code,
      });

      // Nao devolver 500 "cego" sem contexto
      return NextResponse.json(
        {
          ok: false,
          error: "erro_ao_listar_servicos",
          message: error.message,
        },
        { status: 500 },
      );
    }

    const servicosBase = (data ?? []) as ServicoRow[];
    const turmaIds = servicosBase
      .filter((s) => s.referencia_tipo === "TURMA" && s.referencia_id)
      .map((s) => Number(s.referencia_id))
      .filter((id) => Number.isInteger(id) && id > 0);

    const turmaById = new Map<number, TurmaRow>();
    if (turmaIds.length > 0) {
      const { data: turmas, error: turmaError } = await supabase
        .from("turmas")
        .select("turma_id,nome,tipo_turma,capacidade")
        .in("turma_id", turmaIds);

      if (turmaError) {
        console.error("[api/admin/servicos] Supabase turmas error:", {
          message: turmaError.message,
          details: (turmaError as unknown as { details?: string }).details,
          hint: (turmaError as unknown as { hint?: string }).hint,
          code: (turmaError as unknown as { code?: string }).code,
        });
        return NextResponse.json(
          { ok: false, error: "erro_listar_turmas", message: turmaError.message },
          { status: 500 },
        );
      }

      (turmas ?? []).forEach((t) => {
        turmaById.set(Number(t.turma_id), {
          turma_id: Number(t.turma_id),
          nome: t.nome ?? null,
          tipo_turma: t.tipo_turma ?? null,
          capacidade: t.capacidade ?? null,
        });
      });
    }

    const servicos = servicosBase.map((s) => {
      const turmaId = s.referencia_tipo === "TURMA" ? Number(s.referencia_id) : null;
      const turma = turmaId ? turmaById.get(turmaId) ?? null : null;
      const anoLabel = s.ano_referencia ? ` ${s.ano_referencia}` : "";
      const titulo =
        s.titulo && s.titulo.trim()
          ? s.titulo
          : turma?.nome
            ? `${turma.nome}${anoLabel}`
            : `Servico #${s.id}`;

      return {
        ...s,
        titulo,
        turma_nome: turma?.nome ?? null,
        turma_id: turma?.turma_id ?? (turmaId || null),
        turma_tipo_turma: turma?.tipo_turma ?? null,
        turma_capacidade: turma?.capacidade ?? null,
      };
    });

    return NextResponse.json({ ok: true, servicos }, { status: 200 });
  } catch (err) {
    console.error("[api/admin/servicos] Unhandled error:", err);

    const message = err instanceof Error ? err.message : "Erro inesperado no servidor";

    return NextResponse.json(
      { ok: false, error: "erro_interno", message },
      { status: 500 },
    );
  }
}

export async function POST(req: Request) {
  const denied = await guardApiByRole(req as any);
  if (denied) return denied as any;
  try {
    const supabase = getSupabaseAdminClient();
    const body = (await req.json().catch(() => null)) as ServicoPayload | null;

    const tipo = body?.tipo?.toString().trim() ?? "";
    const titulo = body?.titulo?.toString().trim() ?? "";
    const ano = body?.ano_referencia ?? null;
    const referenciaTipo = body?.referencia_tipo ?? null;
    const referenciaIdRaw = body?.referencia_id ?? null;

    if (!tipo) {
      return NextResponse.json({ ok: false, error: "tipo_obrigatorio" }, { status: 400 });
    }
    if (!titulo) {
      return NextResponse.json({ ok: false, error: "titulo_obrigatorio" }, { status: 400 });
    }

    const anoRef =
      typeof ano === "number" && Number.isInteger(ano)
        ? ano
        : ano === null || ano === undefined
          ? null
          : null;
    const referenciaId =
      typeof referenciaIdRaw === "number" && Number.isInteger(referenciaIdRaw) && referenciaIdRaw > 0
        ? referenciaIdRaw
        : null;

    const { data, error } = await supabase
      .from("servicos")
      .insert({
        tipo,
        titulo,
        ano_referencia: anoRef,
        referencia_tipo: referenciaTipo,
        referencia_id: referenciaId,
        ativo: typeof body?.ativo === "boolean" ? body?.ativo : true,
      })
      .select("*")
      .single();

    if (error) {
      return NextResponse.json({ ok: false, error: "erro_criar_servico", message: error.message }, { status: 500 });
    }

    return NextResponse.json({ ok: true, servico: data }, { status: 201 });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Erro inesperado no servidor";
    return NextResponse.json({ ok: false, error: "erro_interno", message }, { status: 500 });
  }
}
