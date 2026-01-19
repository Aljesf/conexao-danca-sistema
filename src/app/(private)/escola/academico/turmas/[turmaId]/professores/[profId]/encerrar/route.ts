import { redirect } from "next/navigation";

import { getSupabaseServer } from "@/lib/supabaseServer";

export async function POST(
  _req: Request,
  { params }: { params: Promise<{ turmaId: string; profId: string }> },
) {
  const supabase = getSupabaseServer();
  const { turmaId, profId } = await params;

  const { error } = await supabase
    .from("turma_professores")
    .update({
      data_fim: new Date().toISOString().slice(0, 10),
      ativo: false,
      principal: false,
    })
    .eq("id", Number(profId));

  if (error) {
    console.error("Erro ao encerrar professor da turma:", error);
  }

  redirect(`/escola/academico/turmas/${turmaId}`);
}
