export const dynamic = "force-dynamic";

import { redirect } from "next/navigation";
import { getSupabaseAdmin } from "@/lib/supabase/server-admin";
import { FinanceHelpCard } from "@/components/FinanceHelpCard";
import { TabelaMatriculaNovaForm } from "./TabelaMatriculaNovaForm";

type TurmaRow = {
  turma_id: number;
  nome?: string | null;
  curso?: string | null;
  nivel?: string | null;
  ano_referencia?: number | null;
};

type TurmaOption = {
  id: number;
  label: string;
  anoRef: number | null;
};

function turmaLabel(t: TurmaRow): string {
  const partes = [t.curso ?? null, t.nome ?? null, t.nivel ?? null, t.ano_referencia ? `Ano ${t.ano_referencia}` : null].filter(
    Boolean
  ) as string[];
  const base = partes.length ? partes.join(" - ") : "Turma";
  return `${base} (ID ${t.turma_id})`;
}

export default async function Page() {
  const supabase = getSupabaseAdmin();

  const { data, error } = await supabase
    .from("turmas")
    .select("turma_id,nome,curso,nivel,ano_referencia")
    .order("turma_id", { ascending: false });

  const turmas = (data ?? []) as TurmaRow[];
  const turmaOptions: TurmaOption[] = turmas.map((t) => ({
    id: t.turma_id,
    label: turmaLabel(t),
    anoRef: t.ano_referencia ?? null,
  }));

  async function create(formData: FormData): Promise<void> {
    "use server";
    const supabase2 = getSupabaseAdmin();

    const titulo = String(formData.get("titulo") ?? "").trim();
    const produto_tipo = String(formData.get("produto_tipo") ?? "REGULAR").trim();
    const turma_id = Number(formData.get("turma_id") ?? 0);
    const anoRaw = String(formData.get("ano_referencia") ?? "").trim();
    const ano = anoRaw ? Number(anoRaw) : null;
    const ativo = formData.get("ativo") === "on";

    if (!titulo) throw new Error("Titulo e obrigatorio.");
    if (!Number.isFinite(turma_id) || turma_id <= 0) throw new Error("Turma invalida.");
    if (![("REGULAR"), ("CURSO_LIVRE"), ("PROJETO_ARTISTICO")].includes(produto_tipo)) {
      throw new Error("produto_tipo invalido.");
    }
    if (produto_tipo === "REGULAR" && (ano === null || !Number.isFinite(ano))) {
      throw new Error("ano_referencia e obrigatorio para REGULAR.");
    }

    const { data: created, error: insertErr } = await supabase2
      .from("matricula_tabelas")
      .insert({
        titulo,
        produto_tipo,
        referencia_tipo: "TURMA",
        referencia_id: turma_id,
        ano_referencia: ano,
        ativo,
      })
      .select("id")
      .single();

    if (insertErr || !created) throw new Error(insertErr?.message ?? "Falha ao criar tabela.");

    redirect(`/admin/escola/configuracoes/matriculas/tabelas/${created.id}`);
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white px-4 py-6">
      <div className="mx-auto flex max-w-6xl flex-col gap-4">
        <div className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div>
              <h1 className="text-xl font-semibold text-slate-800">Nova tabela de matricula</h1>
              <p className="text-sm text-slate-600">
                Escolha a turma pelo nome e cadastre o ano. Depois, crie os itens (MENSALIDADE/RECORRENTE).
              </p>
            </div>
          </div>
        </div>

        <FinanceHelpCard
          subtitle="Entenda esta tela"
          items={[
            "A tabela vale para uma turma e um ano (REGULAR).",
            "Sem MENSALIDADE/RECORRENTE ativa, a matricula falha com 409.",
            "Titulo e ano podem ser sugeridos automaticamente pela turma.",
          ]}
        />

        {error ? (
          <div className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">
            Falha ao carregar turmas: {error.message}
          </div>
        ) : null}

        <TabelaMatriculaNovaForm turmas={turmaOptions} action={create} />
      </div>
    </div>
  );
}
