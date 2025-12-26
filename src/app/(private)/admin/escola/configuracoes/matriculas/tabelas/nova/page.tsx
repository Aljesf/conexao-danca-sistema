export const dynamic = "force-dynamic";

import { redirect } from "next/navigation";
import { getSupabaseAdmin } from "@/lib/supabase/server-admin";

type Turma = {
  turma_id: number;
  nome?: string | null;
  curso?: string | null;
  nivel?: string | null;
  turno?: string | null;
  dias_semana?: string[] | string | null;
  ano_referencia?: number | null;
};

function formatDias(dias: Turma["dias_semana"]): string | null {
  if (!dias) return null;
  if (Array.isArray(dias)) {
    return dias.length ? dias.join(", ") : null;
  }
  const trimmed = String(dias).trim();
  return trimmed.length ? trimmed : null;
}

function turmaLabel(t: Turma): string {
  const dias = formatDias(t.dias_semana);
  const partes = [
    t.curso ?? null,
    t.nome ?? null,
    t.nivel ?? null,
    t.turno ?? null,
    dias,
    t.ano_referencia ? `Ano ${t.ano_referencia}` : null,
  ].filter(Boolean);
  const base = partes.length ? partes.join(" - ") : "Turma";
  return `${base} (ID ${t.turma_id})`;
}

export default async function Page() {
  const supabase = getSupabaseAdmin();
  const { data: turmasData, error: turmasErr } = await supabase
    .from("turmas")
    .select("turma_id,nome,curso,nivel,turno,dias_semana,ano_referencia")
    .order("turma_id", { ascending: false });

  const turmas = (turmasData ?? []) as Turma[];

  async function create(formData: FormData): Promise<void> {
    "use server";

    const supabase2 = getSupabaseAdmin();

    const titulo = String(formData.get("titulo") ?? "").trim();
    const produtoTipo = String(formData.get("produto_tipo") ?? "REGULAR").trim().toUpperCase();
    const turmaId = Number(formData.get("turma_id") ?? 0);
    const anoRaw = String(formData.get("ano_referencia") ?? "").trim();
    const anoReferencia = anoRaw ? Number(anoRaw) : null;
    const ativo = formData.get("ativo") === "on";

    if (!titulo) throw new Error("Titulo e obrigatorio.");
    if (!Number.isFinite(turmaId) || turmaId <= 0) throw new Error("Turma invalida.");
    if (!["REGULAR", "CURSO_LIVRE", "PROJETO_ARTISTICO"].includes(produtoTipo)) {
      throw new Error("produto_tipo invalido.");
    }
    if (produtoTipo === "REGULAR" && (anoReferencia === null || !Number.isFinite(anoReferencia))) {
      throw new Error("ano_referencia e obrigatorio para REGULAR.");
    }

    const { data, error } = await supabase2
      .from("matricula_tabelas")
      .insert({
        titulo,
        produto_tipo: produtoTipo,
        referencia_tipo: "TURMA",
        referencia_id: turmaId,
        ano_referencia: anoReferencia,
        ativo,
      })
      .select("id")
      .single();

    if (error || !data) throw new Error(error?.message ?? "Falha ao criar tabela.");

    redirect(`/admin/escola/configuracoes/matriculas/tabelas/${data.id}`);
  }

  return (
    <div className="p-6 space-y-4 max-w-4xl">
      <div>
        <h1 className="text-xl font-semibold">Nova tabela de matricula</h1>
        <p className="text-sm text-muted-foreground">
          Selecione a turma e o ano (REGULAR). Depois, cadastre ao menos MENSALIDADE / RECORRENTE.
        </p>
      </div>

      {turmasErr ? (
        <div className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          Falha ao carregar turmas: {turmasErr.message}
        </div>
      ) : null}

      <form action={create} className="space-y-4 rounded-md border p-4">
        <div className="grid gap-2">
          <label className="text-sm font-medium">Titulo</label>
          <input name="titulo" className="border rounded-md px-3 py-2 text-sm" placeholder="Ex.: Ballet - Turma X / 2026" />
        </div>

        <div className="grid grid-cols-3 gap-3">
          <div className="grid gap-2">
            <label className="text-sm font-medium">Produto</label>
            <select name="produto_tipo" className="border rounded-md px-3 py-2 text-sm" defaultValue="REGULAR">
              <option value="REGULAR">REGULAR</option>
              <option value="CURSO_LIVRE">CURSO_LIVRE</option>
              <option value="PROJETO_ARTISTICO">PROJETO_ARTISTICO</option>
            </select>
          </div>

          <div className="grid gap-2 col-span-2">
            <label className="text-sm font-medium">Turma</label>
            <select name="turma_id" className="border rounded-md px-3 py-2 text-sm" defaultValue="">
              <option value="" disabled>
                Selecione...
              </option>
              {turmas.map((t) => (
                <option key={t.turma_id} value={t.turma_id}>
                  {turmaLabel(t)}
                </option>
              ))}
            </select>
            <p className="text-xs text-muted-foreground">Selecione pelo nome. O ID fica visivel no final.</p>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-3">
          <div className="grid gap-2">
            <label className="text-sm font-medium">Ano (REGULAR)</label>
            <input name="ano_referencia" type="number" className="border rounded-md px-3 py-2 text-sm" placeholder="2026" />
          </div>

          <label className="flex items-center gap-2 text-sm mt-7">
            <input name="ativo" type="checkbox" defaultChecked />
            Ativa
          </label>
        </div>

        <div className="flex justify-end">
          <button className="rounded-md bg-black px-3 py-2 text-sm text-white" type="submit">
            Criar tabela
          </button>
        </div>
      </form>
    </div>
  );
}
