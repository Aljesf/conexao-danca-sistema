import { NextRequest, NextResponse } from "next/server";

/**
 * Verifica se a requisição vem do Vercel Cron (header Authorization: Bearer <CRON_SECRET>).
 * Retorna null se autorizado, ou NextResponse 401 se não.
 */
export function verifyCronSecret(req: NextRequest): NextResponse | null {
  const secret = process.env.CRON_SECRET;
  if (!secret) {
    return NextResponse.json(
      { ok: false, error: "CRON_SECRET not configured" },
      { status: 500 },
    );
  }

  const auth = req.headers.get("authorization");
  if (auth === `Bearer ${secret}`) {
    return null;
  }

  return NextResponse.json(
    { ok: false, error: "Unauthorized" },
    { status: 401 },
  );
}
