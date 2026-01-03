import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase/server-admin";

type ApiResp<T> = { ok: boolean; data?: T; message?: string };

export async function GET(req: Request) {
  const url = new URL(req.url);
  const onlyActive = url.searchParams.get("ativo") !== "0";
  const tag = String(url.searchParams.get("tag") || "").trim();

  const supabase = getSupabaseAdmin();

  let q = supabase
    .from("documentos_imagens")
    .select("imagem_id,nome,tags,bucket,path,public_url,largura,altura,mime_type,tamanho_bytes,ativo,created_at")
    .order("created_at", { ascending: false });

  if (onlyActive) q = q.eq("ativo", true);
  if (tag) q = q.contains("tags", [tag]);

  const { data, error } = await q;
  if (error) {
    return NextResponse.json({ ok: false, message: error.message } satisfies ApiResp<never>, { status: 500 });
  }

  return NextResponse.json({ ok: true, data } satisfies ApiResp<unknown>);
}
