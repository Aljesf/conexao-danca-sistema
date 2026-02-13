import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(req: Request) {
  const supabase = await createClient();
  const url = new URL(req.url);
  const competencia = url.searchParams.get("competencia") ?? undefined;
  const status = url.searchParams.get("status") ?? undefined;

  let q = supabase.from("folha_pagamento").select("*").order("competencia", { ascending: false });

  if (competencia && /^\d{4}-\d{2}$/.test(competencia)) q = q.eq("competencia", competencia);
  if (status) q = q.eq("status", status);

  const { data, error } = await q;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ folhas: data ?? [] }, { status: 200 });
}

