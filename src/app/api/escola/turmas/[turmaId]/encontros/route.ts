import { NextResponse } from "next/server";
import { getSupabaseServer } from "@/lib/supabaseServer";

type EncontroRow = {
  id: number;
  data: string;
  hora_inicio: string | null;
  hora_fim: string | null;
  ordem: number;
  observacao: string | null;
};

function parseId(value: string | undefined): number | null {
  const n = Number(value);
  if (!Number.isFinite(n) || n <= 0) return null;
  return n;
}

export async function GET(_req: Request, ctx: { params: Promise<{ turmaId?: string }> }) {
  const { turmaId: turmaIdRaw } = await ctx.params;
  const turmaId = parseId(turmaIdRaw);
  if (!turmaId) {
    return NextResponse.json({ error: "turma_id_invalido" }, { status: 400 });
  }

  const supabase = await getSupabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "usuario_nao_autenticado" }, { status: 401 });
  }

  const { data, error } = await supabase
    .from("turma_encontros")
    .select("id,data,hora_inicio,hora_fim,ordem,observacao")
    .eq("turma_id", turmaId)
    .order("data", { ascending: true })
    .order("ordem", { ascending: true });

  if (error) {
    return NextResponse.json(
      { error: "falha_listar_encontros", details: error.message },
      { status: 500 },
    );
  }

  return NextResponse.json({ encontros: (data ?? []) as EncontroRow[] }, { status: 200 });
}

export async function POST(req: Request, ctx: { params: Promise<{ turmaId?: string }> }) {
  const { turmaId: turmaIdRaw } = await ctx.params;
  const turmaId = parseId(turmaIdRaw);
  if (!turmaId) {
    return NextResponse.json({ error: "turma_id_invalido" }, { status: 400 });
  }

  const supabase = await getSupabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "usuario_nao_autenticado" }, { status: 401 });
  }

  const payload: unknown = await req.json();
  if (!payload || typeof payload !== "object") {
    return NextResponse.json({ error: "payload_invalido" }, { status: 400 });
  }

  const p = payload as Record<string, unknown>;
  const data = typeof p.data === "string" ? p.data : "";
  if (!data) {
    return NextResponse.json({ error: "data_obrigatoria" }, { status: 400 });
  }

  const { data: inserted, error } = await supabase
    .from("turma_encontros")
    .insert({
      turma_id: turmaId,
      data,
      hora_inicio: typeof p.hora_inicio === "string" ? p.hora_inicio : null,
      hora_fim: typeof p.hora_fim === "string" ? p.hora_fim : null,
      ordem: typeof p.ordem === "number" ? p.ordem : 0,
      observacao: typeof p.observacao === "string" ? p.observacao : null,
    })
    .select("id")
    .single();

  if (error) {
    return NextResponse.json(
      { error: "falha_criar_encontro", details: error.message },
      { status: 500 },
    );
  }

  return NextResponse.json({ id: inserted.id }, { status: 201 });
}
