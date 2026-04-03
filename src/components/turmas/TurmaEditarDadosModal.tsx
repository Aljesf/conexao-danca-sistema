"use client";

import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/shadcn/ui";
import type { TurmaResumoEditable } from "@/components/turmas/turma-config-types";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  turma: TurmaResumoEditable;
  onSaved?: () => void | Promise<void>;
};

type FormState = {
  nome: string;
  tipo_turma: string;
  curso: string;
  nivel: string;
  turno: string;
  ano_referencia: string;
  capacidade: string;
  data_inicio: string;
  data_fim: string;
  status: string;
  encerramento_automatico: boolean;
  periodo_letivo_id: string;
  carga_horaria_prevista: string;
  frequencia_minima_percentual: string;
  observacoes: string;
};

function toFormState(turma: TurmaResumoEditable): FormState {
  return {
    nome: turma.nome ?? "",
    tipo_turma: turma.tipo_turma ?? "REGULAR",
    curso: turma.curso ?? "",
    nivel: turma.nivel ?? "",
    turno: turma.turno ?? "",
    ano_referencia: turma.ano_referencia ? String(turma.ano_referencia) : "",
    capacidade: turma.capacidade ? String(turma.capacidade) : "",
    data_inicio: turma.data_inicio ?? "",
    data_fim: turma.data_fim ?? "",
    status: turma.status ?? "ATIVA",
    encerramento_automatico: Boolean(turma.encerramento_automatico),
    periodo_letivo_id: turma.periodo_letivo_id ? String(turma.periodo_letivo_id) : "",
    carga_horaria_prevista: turma.carga_horaria_prevista ? String(turma.carga_horaria_prevista) : "",
    frequencia_minima_percentual: turma.frequencia_minima_percentual ? String(turma.frequencia_minima_percentual) : "",
    observacoes: turma.observacoes ?? "",
  };
}

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

export function TurmaEditarDadosModal({ open, onOpenChange, turma, onSaved }: Props) {
  const [form, setForm] = useState<FormState>(() => toFormState(turma));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      setForm(toFormState(turma));
      setError(null);
      setSuccess(null);
    }
  }, [open, turma]);

  const canSubmit = useMemo(() => form.nome.trim().length > 0 && !saving, [form.nome, saving]);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setError(null);
    setSuccess(null);

    try {
      const response = await fetch(`/api/turmas/${turma.turma_id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          nome: form.nome,
          tipo_turma: form.tipo_turma || null,
          curso: form.curso || null,
          nivel: form.nivel || null,
          turno: form.turno || null,
          ano_referencia: form.ano_referencia || null,
          capacidade: form.capacidade || null,
          data_inicio: form.data_inicio || null,
          data_fim: form.data_fim || null,
          status: form.status || null,
          encerramento_automatico: form.encerramento_automatico,
          periodo_letivo_id: form.periodo_letivo_id || null,
          carga_horaria_prevista: form.carga_horaria_prevista || null,
          frequencia_minima_percentual: form.frequencia_minima_percentual || null,
          observacoes: form.observacoes || null,
        }),
      });

      const payload = (await response.json().catch(() => null)) as unknown;
      if (!response.ok) {
        throw new Error(parseErrorMessage(payload, "Nao foi possivel atualizar os dados da turma."));
      }

      setSuccess("Dados-base atualizados.");
      await onSaved?.();
      onOpenChange(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Nao foi possivel atualizar os dados da turma.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl p-0">
        <DialogHeader className="border-b border-slate-200 px-6 py-5">
          <DialogTitle>Editar dados da turma</DialogTitle>
          <DialogDescription>Atualize apenas os campos-base da turma. Os demais blocos seguem separados.</DialogDescription>
          {error ? <p className="text-xs font-medium text-rose-600">{error}</p> : null}
          {success ? <p className="text-xs font-medium text-emerald-600">{success}</p> : null}
        </DialogHeader>

        <form className="space-y-5 px-6 py-5" onSubmit={handleSubmit}>
          <div className="grid gap-4 md:grid-cols-2">
            <label className="grid gap-1 text-sm text-slate-700">
              <span className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">Nome</span>
              <input
                value={form.nome}
                onChange={(event) => setForm((current) => ({ ...current, nome: event.target.value }))}
                className="rounded-xl border border-slate-200 px-3 py-2 text-sm"
                required
              />
            </label>

            <label className="grid gap-1 text-sm text-slate-700">
              <span className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">Tipo da turma</span>
              <select
                value={form.tipo_turma}
                onChange={(event) => setForm((current) => ({ ...current, tipo_turma: event.target.value }))}
                className="rounded-xl border border-slate-200 px-3 py-2 text-sm"
              >
                <option value="REGULAR">REGULAR</option>
                <option value="CURSO_LIVRE">CURSO_LIVRE</option>
                <option value="ENSAIO">ENSAIO</option>
                <option value="PROJETO_ARTISTICO">PROJETO_ARTISTICO</option>
              </select>
            </label>
          </div>

          <div className="grid gap-4 md:grid-cols-4">
            <label className="grid gap-1 text-sm text-slate-700">
              <span className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">Curso</span>
              <input
                value={form.curso}
                onChange={(event) => setForm((current) => ({ ...current, curso: event.target.value }))}
                className="rounded-xl border border-slate-200 px-3 py-2 text-sm"
              />
            </label>
            <label className="grid gap-1 text-sm text-slate-700">
              <span className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">Nivel</span>
              <input
                value={form.nivel}
                onChange={(event) => setForm((current) => ({ ...current, nivel: event.target.value }))}
                className="rounded-xl border border-slate-200 px-3 py-2 text-sm"
              />
            </label>
            <label className="grid gap-1 text-sm text-slate-700">
              <span className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">Turno</span>
              <select
                value={form.turno}
                onChange={(event) => setForm((current) => ({ ...current, turno: event.target.value }))}
                className="rounded-xl border border-slate-200 px-3 py-2 text-sm"
              >
                <option value="">Nao informado</option>
                <option value="MANHA">MANHA</option>
                <option value="TARDE">TARDE</option>
                <option value="NOITE">NOITE</option>
                <option value="INTEGRAL">INTEGRAL</option>
              </select>
            </label>
            <label className="grid gap-1 text-sm text-slate-700">
              <span className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">Ano</span>
              <input
                type="number"
                value={form.ano_referencia}
                onChange={(event) => setForm((current) => ({ ...current, ano_referencia: event.target.value }))}
                className="rounded-xl border border-slate-200 px-3 py-2 text-sm"
              />
            </label>
          </div>

          <div className="grid gap-4 md:grid-cols-4">
            <label className="grid gap-1 text-sm text-slate-700">
              <span className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">Capacidade</span>
              <input
                type="number"
                value={form.capacidade}
                onChange={(event) => setForm((current) => ({ ...current, capacidade: event.target.value }))}
                className="rounded-xl border border-slate-200 px-3 py-2 text-sm"
              />
            </label>
            <label className="grid gap-1 text-sm text-slate-700">
              <span className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">Periodo letivo</span>
              <input
                type="number"
                value={form.periodo_letivo_id}
                onChange={(event) => setForm((current) => ({ ...current, periodo_letivo_id: event.target.value }))}
                className="rounded-xl border border-slate-200 px-3 py-2 text-sm"
              />
            </label>
            <label className="grid gap-1 text-sm text-slate-700">
              <span className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">Carga horaria</span>
              <input
                type="number"
                value={form.carga_horaria_prevista}
                onChange={(event) => setForm((current) => ({ ...current, carga_horaria_prevista: event.target.value }))}
                className="rounded-xl border border-slate-200 px-3 py-2 text-sm"
              />
            </label>
            <label className="grid gap-1 text-sm text-slate-700">
              <span className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">Frequencia minima (%)</span>
              <input
                type="number"
                value={form.frequencia_minima_percentual}
                onChange={(event) => setForm((current) => ({ ...current, frequencia_minima_percentual: event.target.value }))}
                className="rounded-xl border border-slate-200 px-3 py-2 text-sm"
              />
            </label>
          </div>

          <div className="grid gap-4 md:grid-cols-4">
            <label className="grid gap-1 text-sm text-slate-700">
              <span className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">Data inicio</span>
              <input
                type="date"
                value={form.data_inicio}
                onChange={(event) => setForm((current) => ({ ...current, data_inicio: event.target.value }))}
                className="rounded-xl border border-slate-200 px-3 py-2 text-sm"
              />
            </label>
            <label className="grid gap-1 text-sm text-slate-700">
              <span className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">Data fim</span>
              <input
                type="date"
                value={form.data_fim}
                onChange={(event) => setForm((current) => ({ ...current, data_fim: event.target.value }))}
                className="rounded-xl border border-slate-200 px-3 py-2 text-sm"
              />
            </label>
            <label className="grid gap-1 text-sm text-slate-700">
              <span className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">Status</span>
              <select
                value={form.status}
                onChange={(event) => setForm((current) => ({ ...current, status: event.target.value }))}
                className="rounded-xl border border-slate-200 px-3 py-2 text-sm"
              >
                <option value="EM_PREPARACAO">EM_PREPARACAO</option>
                <option value="ATIVA">ATIVA</option>
                <option value="ENCERRADA">ENCERRADA</option>
                <option value="CANCELADA">CANCELADA</option>
              </select>
            </label>
            <label className="flex items-center gap-3 rounded-2xl border border-slate-200 px-4 py-3 text-sm text-slate-700">
              <input
                type="checkbox"
                checked={form.encerramento_automatico}
                onChange={(event) => setForm((current) => ({ ...current, encerramento_automatico: event.target.checked }))}
                className="h-4 w-4"
              />
              <span>Encerramento automatico</span>
            </label>
          </div>

          <label className="grid gap-1 text-sm text-slate-700">
            <span className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">Observacoes</span>
            <textarea
              rows={4}
              value={form.observacoes}
              onChange={(event) => setForm((current) => ({ ...current, observacoes: event.target.value }))}
              className="rounded-2xl border border-slate-200 px-3 py-2 text-sm"
            />
          </label>

          <DialogFooter className="border-t border-slate-200 pt-4">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>
              Cancelar
            </Button>
            <Button type="submit" disabled={!canSubmit}>
              {saving ? "Salvando..." : "Salvar dados da turma"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
