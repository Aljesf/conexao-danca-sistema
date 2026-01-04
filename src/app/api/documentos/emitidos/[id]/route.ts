import { NextResponse } from "next/server";
import { getSupabaseServerSSR } from "@/lib/supabaseServerSSR";
import { stripBackgroundStyles } from "@/lib/documentos/sanitizeHtml";

type ApiResp<T> = { ok: boolean; data?: T; message?: string };

export async function GET(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const docId = Number(id);
  if (!Number.isFinite(docId) || docId <= 0) {
    return NextResponse.json(
      { ok: false, message: "ID invalido." } satisfies ApiResp<never>,
      { status: 400 },
    );
  }

  const supabase = await getSupabaseServerSSR();
  const { data, error } = await supabase
    .from("documentos_emitidos")
    .select("*")
    .eq("id", docId)
    .single();

  if (error) {
    return NextResponse.json({ ok: false, message: error.message } satisfies ApiResp<never>, { status: 404 });
  }

  return NextResponse.json({ ok: true, data } satisfies ApiResp<unknown>, { status: 200 });
}

export async function PATCH(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const docId = Number(id);
  if (!Number.isFinite(docId) || docId <= 0) {
    return NextResponse.json(
      { ok: false, message: "ID invalido." } satisfies ApiResp<never>,
      { status: 400 },
    );
  }

  const body = (await req.json()) as Record<string, unknown>;
  const conteudoResolvido =
    typeof body.conteudo_resolvido_html === "string" ? body.conteudo_resolvido_html : "";
  const conteudoResolvidoLimpo = stripBackgroundStyles(conteudoResolvido);

  if (!conteudoResolvidoLimpo.trim()) {
    return NextResponse.json(
      { ok: false, message: "Conteudo resolvido e obrigatorio." } satisfies ApiResp<never>,
      { status: 400 },
    );
  }

  const supabase = await getSupabaseServerSSR();

  const { data, error } = await supabase
    .from("documentos_emitidos")
    .update({
      conteudo_resolvido_html: conteudoResolvidoLimpo,
      editado_manual: true,
      updated_at: new Date().toISOString(),
    })
    .eq("id", docId)
    .select("id,editado_manual,updated_at")
    .single();

  if (error) {
    return NextResponse.json({ ok: false, message: error.message } satisfies ApiResp<never>, { status: 500 });
  }

  return NextResponse.json({ ok: true, data } satisfies ApiResp<unknown>);
}
