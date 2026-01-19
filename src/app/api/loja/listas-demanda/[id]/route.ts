import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

type ListaStatus = "ATIVA" | "ENCERRADA";

function json(status: number, payload: Record<string, unknown>) {
  return NextResponse.json(payload, { status });
}

export async function GET(_req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const supabase = await createClient();
  const { id } = await ctx.params;
  const listaId = Number(id);

  if (!Number.isFinite(listaId) || listaId <= 0) {
    return json(400, { error: "Lista invalida" });
  }

  const { data: lista, error: listaErr } = await supabase
    .from("loja_listas_demanda")
    .select("*")
    .eq("id", listaId)
    .single();

  if (listaErr) {
    return json(500, { error: listaErr.message });
  }

  const { data: itens, error: itensErr } = await supabase
    .from("loja_listas_demanda_itens")
    .select("*")
    .eq("lista_id", listaId)
    .order("criado_em", { ascending: false });

  if (itensErr) {
    return json(500, { error: itensErr.message });
  }

  return json(200, { data: { lista, itens: itens ?? [] } });
}

export async function PATCH(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const supabase = await createClient();
  const { id } = await ctx.params;
  const listaId = Number(id);

  if (!Number.isFinite(listaId) || listaId <= 0) {
    return json(400, { error: "Lista invalida" });
  }

  const body = (await req.json().catch(() => null)) as
    | { acao?: string; bloqueada?: boolean }
    | null;

  const acao = body?.acao;

  if (acao === "BLOQUEAR") {
    const bloqueada = Boolean(body?.bloqueada);
    const { error } = await supabase
      .from("loja_listas_demanda")
      .update({
        bloqueada,
        bloqueada_em: bloqueada ? new Date().toISOString() : null,
      })
      .eq("id", listaId);

    if (error) return json(500, { error: error.message });
    return json(200, { ok: true });
  }

  if (acao === "ENCERRAR") {
    const { error } = await supabase
      .from("loja_listas_demanda")
      .update({
        status: "ENCERRADA" as ListaStatus,
        encerrada_em: new Date().toISOString(),
      })
      .eq("id", listaId);

    if (error) return json(500, { error: error.message });
    return json(200, { ok: true });
  }

  return json(400, { error: "Acao invalida" });
}
