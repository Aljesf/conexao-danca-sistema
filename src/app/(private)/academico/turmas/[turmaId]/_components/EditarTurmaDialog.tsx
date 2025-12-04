"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

import { Button, Dialog, DialogClose, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "shadcn/ui";
import { getSupabaseBrowser } from "@/lib/supabaseBrowser";
import type { Turma } from "@/types/turmas";

type Props = {
  turma: Turma;
  onUpdated?: () => void;
};

export function EditarTurmaDialog({ turma, onUpdated }: Props) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const supabase = getSupabaseBrowser();
    const formData = new FormData(event.currentTarget);
    const turmaId = turma.turma_id ?? turma.id;

    const nome = (formData.get("nome") as string).trim();
    if (!nome) {
      setErro("Informe o nome da turma.");
      return;
    }

    setSaving(true);
    setErro(null);

    const payload = {
      nome,
      curso: (formData.get("curso") as string) || null,
      nivel: (formData.get("nivel") as string) || null,
      tipo_turma: (formData.get("tipo_turma") as string) || null,
      turno: (formData.get("turno") as string) || null,
      ano_referencia: formData.get("ano_referencia") ? Number(formData.get("ano_referencia")) : null,
      status: (formData.get("status") as string) || turma.status || null,
      data_inicio: (formData.get("data_inicio") as string) || null,
      data_fim: (formData.get("data_fim") as string) || null,
      carga_horaria_prevista: formData.get("carga_horaria_prevista") ? Number(formData.get("carga_horaria_prevista")) : null,
      frequencia_minima_percentual: formData.get("frequencia_minima_percentual")
        ? Number(formData.get("frequencia_minima_percentual"))
        : null,
      observacoes: (formData.get("observacoes") as string) || null,
    };

    const { error } = await supabase.from("turmas").update(payload).eq("turma_id", turmaId);

    if (error) {
      console.error("Erro ao atualizar turma:", error);
      setErro(error.message);
      setSaving(false);
      return;
    }

    setSaving(false);
    setOpen(false);
    onUpdated?.();
    router.refresh();
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="md">Editar turma</Button>
      </DialogTrigger>

      <DialogContent className="max-w-3xl p-6">
        <DialogHeader>
          <DialogTitle>Editar turma</DialogTitle>
          {erro && <p className="text-xs text-rose-600">{erro}</p>}
        </DialogHeader>

        <form id="editar-turma-form" onSubmit={handleSubmit} className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">Nome</label>
              <input
                name="nome"
                defaultValue={turma.nome ?? turma.nome_turma ?? ""}
                className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm"
                required
              />
            </div>
            <div>
              <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">Curso</label>
              <input
                name="curso"
                defaultValue={turma.curso ?? ""}
                className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm"
              />
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-3">
            <div>
              <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">Nivel</label>
              <input
                name="nivel"
                defaultValue={turma.nivel ?? ""}
                className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">Tipo</label>
              <select
                name="tipo_turma"
                defaultValue={turma.tipo_turma ?? "REGULAR"}
                className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm"
              >
                <option value="REGULAR">REGULAR</option>
                <option value="CURSO_LIVRE">CURSO_LIVRE</option>
                <option value="ENSAIO">ENSAIO</option>
              </select>
            </div>
            <div>
              <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">Turno</label>
              <select
                name="turno"
                defaultValue={turma.turno ?? ""}
                className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm"
              >
                <option value="">-</option>
                <option value="MANHA">MANHA</option>
                <option value="TARDE">TARDE</option>
                <option value="NOITE">NOITE</option>
                <option value="INTEGRAL">INTEGRAL</option>
              </select>
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-3">
            <div>
              <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">Ano de referencia</label>
              <input
                type="number"
                name="ano_referencia"
                defaultValue={turma.ano_referencia ?? ""}
                className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">Status</label>
              <select
                name="status"
                defaultValue={turma.status ?? "EM_PREPARACAO"}
                className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm"
              >
                <option value="EM_PREPARACAO">EM_PREPARACAO</option>
                <option value="ATIVA">ATIVA</option>
                <option value="ENCERRADA">ENCERRADA</option>
                <option value="CANCELADA">CANCELADA</option>
              </select>
            </div>
            <div>
              <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">Frequencia minima (%)</label>
              <input
                type="number"
                name="frequencia_minima_percentual"
                defaultValue={turma.frequencia_minima_percentual ?? ""}
                className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm"
              />
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-3">
            <div>
              <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">Data inicio</label>
              <input
                type="date"
                name="data_inicio"
                defaultValue={turma.data_inicio ?? ""}
                className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">Data fim</label>
              <input
                type="date"
                name="data_fim"
                defaultValue={turma.data_fim ?? ""}
                className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">Carga horaria prevista</label>
              <input
                type="number"
                name="carga_horaria_prevista"
                defaultValue={turma.carga_horaria_prevista ?? ""}
                className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm"
              />
            </div>
          </div>

          <div>
            <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">Observacoes</label>
            <textarea
              name="observacoes"
              defaultValue={turma.observacoes ?? ""}
              rows={3}
              className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm"
            />
          </div>
        </form>

        <DialogFooter>
          <DialogClose asChild>
            <Button variant="outline">Cancelar</Button>
          </DialogClose>
          <Button type="submit" form="editar-turma-form" disabled={saving}>
            {saving ? "Salvando..." : "Salvar"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
