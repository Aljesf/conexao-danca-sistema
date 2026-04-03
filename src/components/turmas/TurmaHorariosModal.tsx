"use client";

import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/shadcn/ui";
import type { TurmaHorarioDetalhado } from "@/components/turmas/turma-config-types";

type Props = {
  turmaId: number;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSaved?: () => void | Promise<void>;
};

type FormState = {
  id: number | null;
  dia_semana: string;
  hora_inicio: string;
  hora_fim: string;
};

const EMPTY_FORM: FormState = {
  id: null,
  dia_semana: "",
  hora_inicio: "",
  hora_fim: "",
};

function parseErrorMessage(payload: unknown, fallback: string) {
  if (payload && typeof payload === "object") {
    const details = "details" in payload ? (payload as { details?: unknown }).details : null;
    const message = "message" in payload ? (payload as { message?: unknown }).message : null;
    const error = "error" in payload ? (payload as { error?: unknown }).error : null;
    if (typeof details === "string" && details.trim()) return details;
    if (typeof message === "string" && message.trim()) return message;
    if (typeof error === "string" && error.trim()) return error;
  }
  return fallback;
}

export function TurmaHorariosModal({ turmaId, open, onOpenChange, onSaved }: Props) {
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [horarios, setHorarios] = useState<TurmaHorarioDetalhado[]>([]);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);

  useEffect(() => {
    if (!open) return;
    setForm(EMPTY_FORM);

    let active = true;
    async function carregarHorarios() {
      setLoading(true);
      setError(null);
      setSuccess(null);

      try {
        const response = await fetch(`/api/turmas/${turmaId}/horarios`, { method: "GET" });
        const payload = (await response.json().catch(() => null)) as { horarios?: TurmaHorarioDetalhado[] } | null;
        if (!response.ok) {
          throw new Error(parseErrorMessage(payload, "Nao foi possivel carregar os horarios da turma."));
        }
        if (!active) return;
        setHorarios(Array.isArray(payload?.horarios) ? payload.horarios : []);
      } catch (err) {
        if (!active) return;
        setError(err instanceof Error ? err.message : "Nao foi possivel carregar os horarios da turma.");
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    }

    void carregarHorarios();

    return () => {
      active = false;
    };
  }, [open, turmaId]);

  const canSubmit = useMemo(() => {
    return Boolean(form.dia_semana && form.hora_inicio && form.hora_fim && !saving);
  }, [form, saving]);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setError(null);
    setSuccess(null);

    try {
      const method = form.id ? "PUT" : "POST";
      const response = await fetch(`/api/turmas/${turmaId}/horarios`, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: form.id,
          dia_semana: Number(form.dia_semana),
          hora_inicio: form.hora_inicio,
          hora_fim: form.hora_fim,
        }),
      });

      const payload = (await response.json().catch(() => null)) as { horarios?: TurmaHorarioDetalhado[] } | null;
      if (!response.ok) {
        throw new Error(parseErrorMessage(payload, "Nao foi possivel salvar o horario."));
      }

      setHorarios(Array.isArray(payload?.horarios) ? payload.horarios : []);
      setForm(EMPTY_FORM);
      setSuccess(form.id ? "Horario atualizado." : "Horario adicionado.");
      await onSaved?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Nao foi possivel salvar o horario.");
    } finally {
      setSaving(false);
    }
  }

  async function handleRemover(horarioId: number) {
    setSaving(true);
    setError(null);
    setSuccess(null);

    try {
      const response = await fetch(`/api/turmas/${turmaId}/horarios`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ horario_id: horarioId }),
      });
      const payload = (await response.json().catch(() => null)) as { horarios?: TurmaHorarioDetalhado[] } | null;
      if (!response.ok) {
        throw new Error(parseErrorMessage(payload, "Nao foi possivel remover o horario."));
      }

      setHorarios(Array.isArray(payload?.horarios) ? payload.horarios : []);
      if (form.id === horarioId) {
        setForm(EMPTY_FORM);
      }
      setSuccess("Horario removido da grade futura.");
      await onSaved?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Nao foi possivel remover o horario.");
    } finally {
      setSaving(false);
    }
  }

  function preencherEdicao(horario: TurmaHorarioDetalhado) {
    setForm({
      id: horario.id,
      dia_semana: String(horario.dia_semana),
      hora_inicio: horario.hora_inicio,
      hora_fim: horario.hora_fim,
    });
    setError(null);
    setSuccess(null);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl p-0">
        <DialogHeader className="border-b border-slate-200 px-6 py-5">
          <DialogTitle>Editar horarios</DialogTitle>
          <DialogDescription>
            A grade da turma e mantida neste modal. Alteracoes aqui agem apenas de forma prospectiva e nao reescrevem execucoes passadas.
          </DialogDescription>
          {error ? <p className="text-xs font-medium text-rose-600">{error}</p> : null}
          {success ? <p className="text-xs font-medium text-emerald-600">{success}</p> : null}
        </DialogHeader>

        <div className="space-y-6 px-6 py-5">
          <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
            Mudancas de horario nao alteram aulas ja abertas, frequencias ja salvas nem fechamentos anteriores.
          </div>

          <div className="space-y-3">
            <div className="text-sm font-semibold text-slate-900">Horarios atuais</div>
            {loading ? (
              <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-4 py-6 text-sm text-slate-500">
                Carregando horarios...
              </div>
            ) : horarios.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-4 py-6 text-sm text-slate-500">
                Nenhum horario configurado para esta turma.
              </div>
            ) : (
              <div className="grid gap-3 md:grid-cols-2">
                {horarios.map((horario) => (
                  <div key={horario.id} className="rounded-2xl border border-slate-200 bg-white px-4 py-4 shadow-sm">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="text-sm font-semibold text-slate-900">{horario.dia_label}</div>
                        <div className="text-xs text-slate-500">
                          {horario.hora_inicio} - {horario.hora_fim}
                        </div>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        <Button type="button" variant="outline" size="sm" onClick={() => preencherEdicao(horario)} disabled={saving}>
                          Editar
                        </Button>
                        <Button type="button" variant="outline" size="sm" onClick={() => void handleRemover(horario.id)} disabled={saving}>
                          Remover
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <form className="space-y-4 rounded-3xl border border-slate-200 bg-slate-50 p-5" onSubmit={handleSubmit}>
            <div className="flex items-center justify-between gap-3">
              <div>
                <div className="text-sm font-semibold text-slate-900">{form.id ? "Editar horario" : "Adicionar horario"}</div>
                <div className="text-xs text-slate-500">Mantenha a grade organizada sem expandir a tela principal da turma.</div>
              </div>
              {form.id ? (
                <Button type="button" variant="ghost" size="sm" onClick={() => setForm(EMPTY_FORM)} disabled={saving}>
                  Cancelar edicao
                </Button>
              ) : null}
            </div>

            <div className="grid gap-4 md:grid-cols-3">
              <label className="grid gap-1 text-sm text-slate-700">
                <span className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">Dia</span>
                <select
                  value={form.dia_semana}
                  onChange={(event) => setForm((current) => ({ ...current, dia_semana: event.target.value }))}
                  className="rounded-xl border border-slate-200 px-3 py-2 text-sm"
                >
                  <option value="">Selecione</option>
                  <option value="0">Domingo</option>
                  <option value="1">Segunda</option>
                  <option value="2">Terca</option>
                  <option value="3">Quarta</option>
                  <option value="4">Quinta</option>
                  <option value="5">Sexta</option>
                  <option value="6">Sabado</option>
                </select>
              </label>

              <label className="grid gap-1 text-sm text-slate-700">
                <span className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">Hora inicio</span>
                <input
                  type="time"
                  value={form.hora_inicio}
                  onChange={(event) => setForm((current) => ({ ...current, hora_inicio: event.target.value }))}
                  className="rounded-xl border border-slate-200 px-3 py-2 text-sm"
                />
              </label>

              <label className="grid gap-1 text-sm text-slate-700">
                <span className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">Hora fim</span>
                <input
                  type="time"
                  value={form.hora_fim}
                  onChange={(event) => setForm((current) => ({ ...current, hora_fim: event.target.value }))}
                  className="rounded-xl border border-slate-200 px-3 py-2 text-sm"
                />
              </label>
            </div>

            <DialogFooter className="border-t border-slate-200 pt-4">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>
                Fechar
              </Button>
              <Button type="submit" disabled={!canSubmit}>
                {saving ? "Salvando..." : form.id ? "Salvar horario" : "Adicionar horario"}
              </Button>
            </DialogFooter>
          </form>
        </div>
      </DialogContent>
    </Dialog>
  );
}
