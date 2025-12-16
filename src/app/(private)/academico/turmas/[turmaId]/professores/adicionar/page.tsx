"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getSupabaseBrowser } from "@/lib/supabaseBrowser";

type Professor = { id: number; nome: string };

export default function AdicionarProfessorTurmaPage({
  params,
}: {
  params: { turmaId: string };
}) {
  const router = useRouter();
  const turmaId = Number(params.turmaId);
  const supabase = getSupabaseBrowser();

  const [professores, setProfessores] = useState<Professor[]>([]);
  const [colaboradorId, setColaboradorId] = useState("");
  const [funcao, setFuncao] = useState<string>("");
  const [principal, setPrincipal] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    async function carregar() {
      const { data } = await supabase.from("vw_professores").select("id, nome").order("nome");
      setProfessores(data ?? []);
    }
    void carregar();
  }, [supabase]);

  async function salvar() {
    try {
      setSaving(true);
      setErro(null);

      const { error } = await supabase.from("turma_professores").insert({
        turma_id: turmaId,
        colaborador_id: Number(colaboradorId),
        funcao_id: funcao ? Number(funcao) : null, // TODO: integrar funcoes_colaborador se necessário
        principal,
      });

      if (error) throw error;

      router.push(`/academico/turmas/${turmaId}`);
    } catch (e: unknown) {
      console.error(e);
      const message = e instanceof Error ? e.message : "Erro ao adicionar professor na turma.";
      setErro(message);
      setSaving(false);
    }
  }

  return (
    <div className="px-4 py-6">
      <div className="mx-auto max-w-md space-y-4">
        <h1 className="text-xl font-semibold text-slate-900">Adicionar professor à turma</h1>

        {erro && (
          <div className="rounded-xl border border-rose-100 bg-rose-50 px-3 py-2 text-sm text-rose-700">
            {erro}
          </div>
        )}

        <div className="space-y-3">
          <div>
            <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">Professor</label>
            <select
              className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm"
              value={colaboradorId}
              onChange={(e) => setColaboradorId(e.target.value)}
            >
              <option value="">Selecione...</option>
              {professores.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.nome}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">Função na turma</label>
            <input
              className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm"
              value={funcao}
              onChange={(e) => setFuncao(e.target.value)}
              placeholder="Opcional (ligar a funcoes_colaborador futuramente)"
            />
            <p className="mt-1 text-[11px] text-slate-500">TODO: usar funcoes_colaborador ao vincular auxiliares/principal.</p>
          </div>

          <label className="inline-flex items-center gap-2 text-sm text-slate-700">
            <input type="checkbox" checked={principal} onChange={(e) => setPrincipal(e.target.checked)} />
            <span>Marcar como professor principal da turma</span>
          </label>

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={() => router.push(`/academico/turmas/${turmaId}`)}
              className="rounded-full border border-slate-200 bg-white px-4 py-2 text-sm text-slate-700 hover:bg-slate-50"
              disabled={saving}
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={salvar}
              disabled={saving || !colaboradorId}
              className="rounded-full bg-violet-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-violet-700 disabled:opacity-60"
            >
              {saving ? "Salvando..." : "Salvar"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
