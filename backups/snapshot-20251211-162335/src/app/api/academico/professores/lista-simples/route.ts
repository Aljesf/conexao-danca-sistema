import { NextResponse } from "next/server";
import { listarProfessoresAtivosSimples } from "@/lib/academico/turmaProfessoresServer";

export async function GET() {
  const professores = await listarProfessoresAtivosSimples();
  return NextResponse.json({ professores });
}
