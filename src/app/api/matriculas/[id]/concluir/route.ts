/* [INÍCIO DO BLOCO] src/app/api/matriculas/[id]/concluir/route.ts (novo) */
import type { NextRequest } from "next/server";
import { POST as postEncerrar } from "../encerrar/route";

export const runtime = "nodejs";

export async function POST(request: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  return postEncerrar(request, ctx);
}
/* [FIM DO BLOCO] */
