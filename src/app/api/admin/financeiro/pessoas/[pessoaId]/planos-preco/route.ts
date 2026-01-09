import { NextResponse } from "next/server";
import { getSupabaseServerSSR } from "@/lib/supabaseServerSSR";
import { guardApiByRole } from "@/lib/auth/roleGuard";

function toInt(v: string): number | null {
  const n = Number(v);
  if (!Number.isFinite(n) || n <= 0) return null;
  return Math.trunc(n);
}

export async function GET(_req: Request, ctx: { params: Promise<{ pessoaId: string }> }) {
  const denied = await guardApiByRole(_req as any);
  if (denied) return denied as any;
  const supabase = await getSupabaseServerSSR();
  const { pessoaId } = await ctx.params;
  const pid = toInt(pessoaId);

  if (!pid) return NextResponse.json({ error: "pessoaId invalido." }, { status: 400 });

  const { data, error } = await supabase
    .from("financeiro_aluno_planos_preco")
    .select("id,pessoa_id,politica_id,ativo,manual,motivo,justificativa,definida_por,definida_em,created_at")
    .eq("pessoa_id", pid)
    .order("created_at", { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ vinculos: data ?? [] });
}

export async function POST(req: Request, ctx: { params: Promise<{ pessoaId: string }> }) {
  const denied = await guardApiByRole(req as any);
  if (denied) return denied as any;
  const supabase = await getSupabaseServerSSR();
  const { pessoaId } = await ctx.params;
  const pid = toInt(pessoaId);

  if (!pid) return NextResponse.json({ error: "pessoaId invalido." }, { status: 400 });

  const body = (await req.json().catch(() => null)) as
    | { politica_id?: unknown; manual?: unknown; motivo?: unknown; justificativa?: unknown }
    | null;

  const politicaId = typeof body?.politica_id === "number" ? body.politica_id : null;
  const manual = typeof body?.manual === "boolean" ? body.manual : false;
  const motivo = typeof body?.motivo === "string" ? body.motivo.trim() : "";
  const justificativa = typeof body?.justificativa === "string" ? body.justificativa.trim() : "";

  if (!politicaId || !Number.isFinite(politicaId)) {
    return NextResponse.json({ error: "Campo politica_id e obrigatorio." }, { status: 400 });
  }
  if (manual && (!motivo || !justificativa)) {
    return NextResponse.json(
      { error: "Motivo e justificativa sao obrigatorios quando manual=true." },
      { status: 400 },
    );
  }

  const { data: politica, error: politicaErr } = await supabase
    .from("financeiro_politicas_preco")
    .select("id,ativo")
    .eq("id", politicaId)
    .single();

  if (politicaErr) return NextResponse.json({ error: politicaErr.message }, { status: 500 });
  if (!politica?.ativo) {
    return NextResponse.json({ error: "Plano inativo nao pode ser aplicado." }, { status: 400 });
  }

  const { data: ativoAtual, error: ativoAtualErr } = await supabase
    .from("financeiro_aluno_planos_preco")
    .select("id")
    .eq("pessoa_id", pid)
    .eq("politica_id", politicaId)
    .eq("ativo", true)
    .maybeSingle();

  if (ativoAtualErr) return NextResponse.json({ error: ativoAtualErr.message }, { status: 500 });
  if (ativoAtual) {
    return NextResponse.json({ error: "Este plano ja esta ativo para o aluno." }, { status: 409 });
  }

  const { data: novoItens, error: novoErr } = await supabase
    .from("financeiro_tiers")
    .select("tabela_id,tabela_item_id")
    .eq("politica_id", politicaId)
    .eq("ativo", true);

  if (novoErr) return NextResponse.json({ error: novoErr.message }, { status: 500 });

  const novoSet = new Set(
    (novoItens ?? [])
      .filter((x) => x.tabela_id != null && x.tabela_item_id != null)
      .map((x) => `${x.tabela_id}:${x.tabela_item_id}`),
  );

  if (novoSet.size === 0) {
    return NextResponse.json(
      { error: "Este plano nao possui tiers ativos vinculados a itens/tabelas." },
      { status: 400 },
    );
  }

  const { data: ativosAluno, error: ativosErr } = await supabase
    .from("financeiro_aluno_planos_preco")
    .select("politica_id")
    .eq("pessoa_id", pid)
    .eq("ativo", true);

  if (ativosErr) return NextResponse.json({ error: ativosErr.message }, { status: 500 });

  const politicasAtivas = Array.from(
    new Set((ativosAluno ?? []).map((x) => x.politica_id).filter((v) => Number.isFinite(v))),
  ) as number[];

  if (politicasAtivas.length > 0) {
    const { data: cobertos, error: cobertosErr } = await supabase
      .from("financeiro_tiers")
      .select("tabela_id,tabela_item_id,politica_id")
      .in("politica_id", politicasAtivas)
      .eq("ativo", true);

    if (cobertosErr) return NextResponse.json({ error: cobertosErr.message }, { status: 500 });

    for (const item of cobertos ?? []) {
      if (item.tabela_id == null || item.tabela_item_id == null) continue;
      const key = `${item.tabela_id}:${item.tabela_item_id}`;
      if (novoSet.has(key)) {
        return NextResponse.json(
          {
            error:
              "Conflito: o aluno ja possui um plano ativo que cobre pelo menos um dos mesmos itens desta nova regra.",
            conflito_item: { tabela_id: item.tabela_id, tabela_item_id: item.tabela_item_id },
          },
          { status: 409 },
        );
      }
    }
  }

  const payload: Record<string, unknown> = {
    pessoa_id: pid,
    politica_id: politicaId,
    ativo: true,
    manual,
    motivo: manual ? motivo : null,
    justificativa: manual ? justificativa : null,
    definida_em: new Date().toISOString(),
  };

  const { data, error } = await supabase
    .from("financeiro_aluno_planos_preco")
    .insert(payload)
    .select(
      "id,pessoa_id,politica_id,ativo,manual,motivo,justificativa,definida_por,definida_em,created_at",
    )
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ vinculo: data }, { status: 201 });
}
