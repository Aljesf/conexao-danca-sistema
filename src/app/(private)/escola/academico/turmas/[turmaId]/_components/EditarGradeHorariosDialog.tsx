"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

import { Button, Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "shadcn/ui";
import { TurmaGradeHorariosForm, type TurmaHorarioFormValue } from "@/components/turmas/TurmaGradeHorariosForm";

type Props = {
  turmaId: number;
  onSaved?: () => void;
};

export function EditarGradeHorariosDialog({ turmaId, onSaved }: Props) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [horarios, setHorarios] = useState<TurmaHorarioFormValue[]>([]);

  async function loadHorarios() {
    setErro(null);
    setLoading(true);
    try {
      const res = await fetch(`/api/turmas/${turmaId}/horarios`, { method: "GET" });
      const json = (await res.json()) as { horarios?: TurmaHorarioFormValue[]; error?: string; details?: string };
      if (!res.ok) {
        throw new Error(json.details ?? json.error ?? "Falha ao carregar horarios.");
      }
      setHorarios(Array.isArray(json.horarios) ? json.horarios : []);
    } catch (e) {
      setErro(e instanceof Error ? e.message : "Falha ao carregar horarios.");
      setHorarios([]);
    } finally {
      setLoading(false);
    }
  }

  async function salvarHorarios() {
    setErro(null);
    setSaving(true);
    try {
      const res = await fetch(`/api/turmas/${turmaId}/horarios`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ horarios }),
      });
      const json = (await res.json()) as { ok?: boolean; error?: string; details?: string };
      if (!res.ok || !json.ok) {
        throw new Error(json.details ?? json.error ?? "Falha ao salvar horarios.");
      }
      setOpen(false);
      onSaved?.();
      router.refresh();
    } catch (e) {
      setErro(e instanceof Error ? e.message : "Falha ao salvar horarios.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (next) {
          void loadHorarios();
        }
      }}
    >
      <DialogTrigger asChild>
        <Button size="sm" variant="outline">
          Editar grade de horarios
        </Button>
      </DialogTrigger>

      <DialogContent className="max-w-5xl p-6">
        <DialogHeader>
          <DialogTitle>Editar grade de horarios</DialogTitle>
          {erro ? <p className="text-xs text-rose-600">{erro}</p> : null}
        </DialogHeader>

        {loading ? (
          <div className="text-sm text-slate-500">Carregando horarios...</div>
        ) : (
          <TurmaGradeHorariosForm value={horarios} onChange={setHorarios} />
        )}

        <DialogFooter className="pt-2">
          <Button variant="outline" onClick={() => setOpen(false)} disabled={saving}>
            Cancelar
          </Button>
          <Button onClick={salvarHorarios} disabled={saving || loading}>
            {saving ? "Salvando..." : "Salvar"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
