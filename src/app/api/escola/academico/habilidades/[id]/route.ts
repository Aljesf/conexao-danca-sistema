import { NextResponse } from "next/server";
import { handlePut } from "./put";

export async function GET(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  return NextResponse.json({ ok: true, ping: "habilidades/[id] OK", id });
}

export async function PUT(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const params = await ctx.params;
  return handlePut(req, params);
}
