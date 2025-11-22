// src/app/api/pessoas/[id]/route.ts
import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

// Garante runtime Node (supabase precisa disso)
export const runtime = "nodejs";

// Cliente ADMIN do Supabase (mesmo padrão das outras rotas que já funcionam)
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  }
);

// GET /api/pessoas/[id] -> detalhes de uma pessoa
export async function GET(
  _req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const rawId = params?.id;
    const id = Number(rawId);

    // Validação simples do ID
    if (!rawId || Number.isNaN(id) || id <= 0) {
      return NextResponse.json(
        { error: "ID inválido." },
        { status: 400 }
      );
    }

    // Busca na tabela pessoas
    const { data, error } = await supabaseAdmin
      .from("pessoas")
      .select(
        "id, nome, email, telefone, nascimento, cpf, tipo_pessoa, ativo, observacoes, neofin_customer_id, created_at, updated_at"
      )
      .eq("id", id)
      .maybeSingle(); // não lança erro se vier null

    if (error) {
      console.error("Erro Supabase (GET /api/pessoas/[id]):", error);
      return NextResponse.json(
        {
          error: "Erro ao buscar pessoa.",
          details: error.message,
        },
        { status: 500 }
      );
    }

    if (!data) {
      return NextResponse.json(
        { error: "Pessoa não encontrada." },
        { status: 404 }
      );
    }

    // Sucesso – sempre JSON
    return NextResponse.json({ data }, { status: 200 });
  } catch (err: any) {
    // CORREÇÃO: Certifica que a resposta de erro é um JSON válido e tem o status 500
    console.error("Erro inesperado em GET /api/pessoas/[id]", err);
    return NextResponse.json(
      {
        error: "Erro inesperado ao carregar pessoa.",
        details: err?.message ?? "Erro desconhecido",
      },
      { status: 500 } // Garantindo que o status HTTP 500 seja o segundo argumento
    );
  }
}