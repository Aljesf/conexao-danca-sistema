import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase/server-admin";

type NivelRow = {
  id: number;
  nome: string;
};

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const rawTurmaId = searchParams.get("turma_id") ?? searchParams.get("turmaId");
    const turmaId = rawTurmaId ? Number(rawTurmaId) : NaN;

    if (!Number.isFinite(turmaId)) {
      return NextResponse.json({ ok: true, niveis: [], message: "turma_id_ausente_ou_invalido" });
    }

    const supabase = getSupabaseAdmin();

    const { data, error } = await supabase
      .from("turma_niveis")
      .select("principal, niveis:nivel_id (id, nome)")
      .eq("turma_id", turmaId);

    if (error) {
      return NextResponse.json({ ok: false, error: error.message, niveis: [] }, { status: 200 });
    }

    const rows = Array.isArray(data) ? data : [];
    const niveis = rows
      .map((row) => {
        const principal = Boolean((row as { principal?: boolean | null }).principal);
        const nivel = (row as { niveis?: NivelRow | null }).niveis;
        if (!nivel || !Number.isFinite(nivel.id)) return null;
        const nome = String(nivel.nome ?? "").trim();
        if (!nome) return null;
        return { principal, id: Number(nivel.id), nome };
      })
      .filter((item): item is { principal: boolean; id: number; nome: string } => !!item)
      .sort((a, b) => {
        if (a.principal !== b.principal) return a.principal ? -1 : 1;
        return a.nome.localeCompare(b.nome, "pt-BR", { sensitivity: "base" });
      })
      .map(({ id, nome }) => ({ id, nome }));

    return NextResponse.json({ ok: true, niveis });
  } catch (e: unknown) {
    return NextResponse.json(
      { ok: false, error: e instanceof Error ? e.message : "erro_interno", niveis: [] },
      { status: 200 },
    );
  }
}
