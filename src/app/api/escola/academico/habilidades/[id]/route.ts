import { NextResponse } from "next/server";
import { handlePut } from "./put";

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  return NextResponse.json({
    ok: true,
    ping: "habilidades/[id] OK",
    id: params.id,
  });
}

export async function PUT(req: Request, { params }: { params: { id: string } }) {
  return handlePut(req, params);
}
