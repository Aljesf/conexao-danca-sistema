import { CoreografiaEstilosPageClient } from "@/components/escola/eventos/CoreografiaEstilosPageClient";
import type { CoreografiaEstiloResumo } from "@/components/escola/eventos/types";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

async function carregarEstilos(): Promise<CoreografiaEstiloResumo[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("coreografia_estilos")
    .select("*")
    .order("ativo", { ascending: false })
    .order("ordem_exibicao", { ascending: true })
    .order("nome", { ascending: true });

  if (error || !data) {
    return [];
  }

  return data as CoreografiaEstiloResumo[];
}

export default async function CoreografiaEstilosPage() {
  const estilos = await carregarEstilos();

  return <CoreografiaEstilosPageClient estilos={estilos} />;
}
