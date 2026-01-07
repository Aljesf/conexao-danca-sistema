import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(_req: Request, ctx: { params: Promise<{ id: string }> | { id: string } }) {
  const rawParams = (ctx as { params: Promise<{ id: string }> }).params;
  const params = rawParams instanceof Promise ? await rawParams : (ctx as { params: { id: string } }).params;

  return NextResponse.json({ ok: true, ping: "habilidades/[id] OK", id: params.id }, { status: 200 });
}

export async function PUT(req: Request, ctx: { params: Promise<{ id: string }> | { id: string } }) {
  const mod = await import("./put");
  return mod.PUT(req, ctx);
}
