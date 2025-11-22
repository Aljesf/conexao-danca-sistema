// src/app/api/pessoas/route.ts
import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

// Aqui usamos a chave ANON, como nas outras rotas
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

// GET /api/pessoas  -> lista todas as pessoas
export async function GET() {
  try {
    const { data, error } = await supabase
      .from("pessoas")
      .select("*")
      .order("id", { ascending: true });

    if (error) {
      console.error("Erro Supabase (GET /pessoas):", error);
      return NextResponse.json(
        { error: "Erro ao carregar pessoas.", details: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({ data }, { status: 200 });
  } catch (err: any) {
    console.error("Erro inesperado (GET /pessoas):", err);
    return NextResponse.json(
      {
        error: "Erro inesperado ao carregar pessoas.",
        details: err?.message ?? String(err),
      },
      { status: 500 }
    );
  }
}

// POST /api/pessoas  -> cria uma nova pessoa
export async function POST(req: Request) {
  try {
    const body = await req.json();

    const {
      nome,
      email,
      telefone,
      nascimento,
      cpf,
      tipo_pessoa,
      observacoes,
      ativo,
    } = body as {
      nome: string;
      email?: string | null;
      telefone?: string | null;
      nascimento?: string | null;
      cpf?: string | null;
      tipo_pessoa?: "FISICA" | "JURIDICA";
      observacoes?: string | null;
      ativo?: boolean;
    };

    if (!nome || typeof nome !== "string") {
      return NextResponse.json(
        { error: "Nome é obrigatório." },
        { status: 400 }
      );
    }

    const tipoPessoaValido =
      tipo_pessoa === "JURIDICA" ? "JURIDICA" : "FISICA";

    const { data, error } = await supabase
      .from("pessoas")
      .insert({
        nome: nome.trim(),
        email: email?.trim() || null,
        telefone: telefone?.trim() || null,
        nascimento: nascimento || null,
        cpf: cpf?.trim() || null,
        tipo_pessoa: tipoPessoaValido,
        observacoes: observacoes?.trim() || null,
        ativo: ativo !== false, // default true
      })
      .select("*")
      .single();

    if (error || !data) {
      console.error("Erro Supabase (POST /pessoas):", error);
      return NextResponse.json(
        { error: "Erro ao salvar pessoa.", details: error?.message },
        { status: 500 }
      );
    }

    return NextResponse.json({ data }, { status: 201 });
  } catch (err: any) {
    console.error("Erro inesperado (POST /pessoas):", err);
    return NextResponse.json(
      {
        error: "Erro inesperado ao salvar pessoa.",
        details: err?.message ?? String(err),
      },
      { status: 500 }
    );
  }
}
