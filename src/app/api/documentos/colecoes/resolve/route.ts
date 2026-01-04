import { NextResponse } from "next/server";
import { resolveCollections } from "@/lib/documentos/collectionsResolver";
import { normalizeOperacaoTipo } from "@/lib/documentos/operacaoTipos";

type ResolveRequestBody = {
  operacaoTipo: string;
  operacaoId: number;
  colecoes: string[];
};

export async function POST(req: Request) {
  let body: ResolveRequestBody;
  try {
    body = (await req.json()) as ResolveRequestBody;
  } catch {
    return NextResponse.json({ error: "JSON invalido" }, { status: 400 });
  }

  const operacaoTipo = String(body.operacaoTipo || "").trim();
  const operacaoId = Number(body.operacaoId);
  const colecoes = Array.isArray(body.colecoes) ? body.colecoes : [];

  if (!operacaoTipo || !Number.isFinite(operacaoId) || colecoes.length === 0) {
    return NextResponse.json({ error: "Parametros obrigatorios ausentes" }, { status: 400 });
  }

  try {
    const operacaoTipoNorm = normalizeOperacaoTipo(operacaoTipo);
    const data = await resolveCollections({ operacaoTipo: operacaoTipoNorm, operacaoId, colecoes });
    return NextResponse.json({ data }, { status: 200 });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Erro ao resolver colecoes";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
