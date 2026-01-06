"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import { Button, Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "shadcn/ui";
import { getSupabaseBrowser } from "@/lib/supabaseBrowser";

type VincularProfessorDialogProps = {
  turmaId: number;
  onLinked?: () => void;
};

type ProfessorOption = { id: number; nome: string };
type FuncaoOption = { id: number; nome: string; codigo?: string | null };

export function VincularProfessorDialog({ turmaId, onLinked }: VincularProfessorDialogProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  const [professores, setProfessores] = useState<ProfessorOption[]>([]);
  const [funcoes, setFuncoes] = useState<FuncaoOption[]>([]);

  const [professorId, setProfessorId] = useState("");
  const [funcaoId, setFuncaoId] = useState("");
  const [principal, setPrincipal] = useState(false);
  const [dataInicio, setDataInicio] = useState("");
  const [observacoes, setObservacoes] = useState("");

  useEffect(() => {
    const supabase = getSupabaseBrowser();

    async function carregarProfessores() {
      const { data, error } = await supabase.from("vw_professores").select("id, nome").eq("ativo", true).order("nome");
      if (error) {
        console.error("Erro ao carregar professores:", error);
        return;
      }
      setProfessores(data ?? []);
    }

    async function carregarFuncoes() {
      const { data, error } = await supabase
        .from("funcoes_colaborador")
        .select("id, nome, codigo, ativo")
        .eq("ativo", true)
        .order("nome");
      if (error) {
        console.error("Erro ao carregar funcoes:", error);
        return;
      }
      setFuncoes(
        (data ?? []).map((f) => {
          if (!f || typeof f !== "object") {
            return { id: 0, nome: "Funcao", codigo: null };
          }
          const funcao = f as { id?: number; nome?: string; codigo?: string | null };
          return { id: funcao.id ?? 0, nome: funcao.nome ?? "Funcao", codigo: funcao.codigo ?? null };
        }),
      );
    }

    void carregarProfessores();
    void carregarFuncoes();
  }, []);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setErro(null);

    const profIdNum = Number(professorId);
    const funcaoIdNum = Number(funcaoId);
    if (!profIdNum) {
      setErro("Escolha um professor.");
      return;
    }
    if (!funcaoIdNum) {
      setErro("Escolha a funcao na turma.");
      return;
    }

    const supabase = getSupabaseBrowser();
    setLoading(true);

    const payload = {
      turma_id: turmaId,
      colaborador_id: profIdNum,
      funcao_id: funcaoIdNum,
      principal,
      data_inicio: dataInicio || null,
      observacoes: observacoes.trim() || null,
    };

    const { error } = await supabase.from("turma_professores").insert(payload);
    if (error) {
      console.error("Erro ao vincular professor:", error);
      setErro(error.message);
      setLoading(false);
      return;
    }

    if (principal) {
      const { error: errUpdate } = await supabase.from("turmas").update({ professor_id: profIdNum }).eq("turma_id", turmaId);
      if (errUpdate) {
        console.error("Erro ao atualizar professor principal na turma:", errUpdate);
      }
    }

    setLoading(false);
    setOpen(false);
    setProfessorId("");
    setFuncaoId("");
    setPrincipal(false);
    setDataInicio("");
    setObservacoes("");
    onLinked?.();
    router.refresh();
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm">Vincular professor</Button>
      </DialogTrigger>

      <DialogContent className="max-w-lg p-6">
        <DialogHeader>
          <DialogTitle>Vincular professor a turma</DialogTitle>
          {erro && <p className="text-xs text-rose-600">{erro}</p>}
        </DialogHeader>

        <form className="space-y-4" onSubmit={handleSubmit}>
          <div className="space-y-1">
            <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">Professor</label>
            <select
              className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm"
              value={professorId}
              onChange={(e) => setProfessorId(e.target.value)}
            >
              <option value="">Selecione...</option>
              {professores.map((prof) => (
                <option key={`prof-${prof.id}`} value={prof.id}>
                  {prof.nome}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-1">
            <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">Funcao na turma</label>
            <select
              className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm"
              value={funcaoId}
              onChange={(e) => setFuncaoId(e.target.value)}
            >
              <option value="">Selecione...</option>
              {funcoes.map((f) => (
                <option key={`func-${f.id}`} value={f.id}>
                  {f.nome}
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-2">
            <input
              id="principal"
              type="checkbox"
              className="h-4 w-4"
              checked={principal}
              onChange={(e) => setPrincipal(e.target.checked)}
            />
            <label htmlFor="principal" className="text-sm text-slate-700">
              Professor principal
            </label>
          </div>

          <div className="grid gap-3 md:grid-cols-2">
            <div className="space-y-1">
              <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">Data inicio</label>
              <input
                type="date"
                className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm"
                value={dataInicio}
                onChange={(e) => setDataInicio(e.target.value)}
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">Observacoes</label>
              <textarea
                className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm"
                rows={2}
                value={observacoes}
                onChange={(e) => setObservacoes(e.target.value)}
              />
            </div>
          </div>

          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? "Salvando..." : "Salvar"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
