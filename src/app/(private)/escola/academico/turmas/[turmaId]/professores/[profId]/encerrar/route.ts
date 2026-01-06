import { redirect } from "next/navigation";

import { getSupabaseServer } from "@/lib/supabaseServer";

export async function POST(
  _req: Request,
  { params }: { params: { turmaId: string; profId: string } },
) {
  const supabase = getSupabaseServer();

  const { error } = await supabase
    .from("turma_professores")
    .update({
      data_fim: new Date().toISOString().slice(0, 10),
      ativo: false,
      principal: false,
    })
    .eq("id", Number(params.profId));

  if (error) {
    console.error("Erro ao encerrar professor da turma:", error);
  }

  redirect(`/escola/academico/turmas/${params.turmaId}`);
}
