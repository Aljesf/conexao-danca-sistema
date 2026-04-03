"use client";

import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/shadcn/ui";
import type {
  TurmaFuncaoOption,
  TurmaProfessorOption,
  TurmaProfessorVinculo,
} from "@/components/turmas/turma-config-types";

type Props = {
  turmaId: number;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSaved?: () => void | Promise<void>;
};

type FormState = {
  vinculo_id: number | null;
  colaborador_id: string;
  funcao_id: string;
  principal: boolean;
  data_inicio: string;
  data_fim: string;
  observacoes: string;
  ativo: boolean;
};

type ProfessoresPayload = {
  atuais?: TurmaProfessorVinculo[];
  historico?: TurmaProfessorVinculo[];
  colaboradores_disponiveis?: TurmaProfessorOption[];
  funcoes_disponiveis?: TurmaFuncaoOption[];
};

const EMPTY_FORM: FormState = {
  vinculo_id: null,
  colaborador_id: "",
  funcao_id: "",
  principal: false,
  data_inicio: "",
  data_fim: "",
  observacoes: "",
  ativo: true,
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

function toEditForm(vinculo: TurmaProfessorVinculo): FormState {
  return {
    vinculo_id: vinculo.id,
    colaborador_id: String(vinculo.colaborador_id),
    funcao_id: String(vinculo.funcao_id),
    principal: vinculo.principal,
    data_inicio: vinculo.data_inicio ?? "",
    data_fim: vinculo.data_fim ?? "",
    observacoes: vinculo.observacoes ?? "",
    ativo: vinculo.ativo,
  };
}

function normalizeColaboradoresDisponiveis(payload: unknown): TurmaProfessorOption[] {
  if (!Array.isArray(payload)) return [];

  return payload.flatMap((item) => {
    if (!item || typeof item !== "object") return [];

    const rawId = "colaborador_id" in item ? (item as { colaborador_id?: unknown }).colaborador_id : null;
    const rawNome = "nome" in item ? (item as { nome?: unknown }).nome : null;
    const dedupeKey = rawId == null ? "" : String(rawId).trim();
    const colaboradorId = Number(dedupeKey);
    const nome = typeof rawNome === "string" ? rawNome.trim() : "";

    if (!dedupeKey || !Number.isFinite(colaboradorId) || !nome) {
      return [];
    }

    return [{ colaborador_id: colaboradorId, nome }];
  });
}

export function TurmaProfessoresModal({ turmaId, open, onOpenChange, onSaved }: Props) {
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [atuais, setAtuais] = useState<TurmaProfessorVinculo[]>([]);
  const [historico, setHistorico] = useState<TurmaProfessorVinculo[]>([]);
  const [colaboradores, setColaboradores] = useState<TurmaProfessorOption[]>([]);
  const [funcoes, setFuncoes] = useState<TurmaFuncaoOption[]>([]);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);

  useEffect(() => {
    if (!open) return;
    setForm(EMPTY_FORM);

    let active = true;
    async function carregarDados() {
      setLoading(true);
      setError(null);
      setSuccess(null);

      try {
        const response = await fetch(`/api/turmas/${turmaId}/professores`, { method: "GET" });
        const payload = (await response.json().catch(() => null)) as ProfessoresPayload | null;
        if (!response.ok) {
          throw new Error(parseErrorMessage(payload, "Nao foi possivel carregar os professores da turma."));
        }
        if (!active) return;

        setAtuais(Array.isArray(payload?.atuais) ? payload.atuais : []);
        setHistorico(Array.isArray(payload?.historico) ? payload.historico : []);
        setColaboradores(normalizeColaboradoresDisponiveis(payload?.colaboradores_disponiveis));
        setFuncoes(Array.isArray(payload?.funcoes_disponiveis) ? payload.funcoes_disponiveis : []);
      } catch (err) {
        if (!active) return;
        setError(err instanceof Error ? err.message : "Nao foi possivel carregar os professores da turma.");
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    }

    void carregarDados();

    return () => {
      active = false;
    };
  }, [open, turmaId]);

  const canSubmit = useMemo(() => {
    return Boolean(form.colaborador_id && form.funcao_id && form.data_inicio && !saving);
  }, [form, saving]);

  const colaboradoresUnicos = useMemo(() => {
    const unicos = new Map<string, TurmaProfessorOption>();

    for (const item of colaboradores) {
      if (!item || typeof item !== "object") continue;

      const dedupeKey = String(item.colaborador_id ?? "").trim();
      if (!dedupeKey || unicos.has(dedupeKey)) continue;

      unicos.set(dedupeKey, {
        colaborador_id: Number(dedupeKey),
        nome: item.nome,
      });
    }

    return Array.from(unicos.values());
  }, [colaboradores]);

  async function refreshAfterMutation(message: string, payload?: ProfessoresPayload | null) {
    setSuccess(message);
    if (payload?.atuais) setAtuais(payload.atuais);
    if (payload?.historico) setHistorico(payload.historico);
    await onSaved?.();
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setError(null);
    setSuccess(null);

    try {
      const method = form.vinculo_id ? "PUT" : "POST";
      const response = await fetch(`/api/turmas/${turmaId}/professores`, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          vinculo_id: form.vinculo_id,
          colaborador_id: form.colaborador_id || null,
          funcao_id: form.funcao_id || null,
          principal: form.principal,
          data_inicio: form.data_inicio || null,
          data_fim: form.vinculo_id ? form.data_fim || null : null,
          observacoes: form.observacoes || null,
          ativo: form.vinculo_id ? form.ativo : true,
        }),
      });

      const payload = (await response.json().catch(() => null)) as ProfessoresPayload | null;
      if (!response.ok) {
        throw new Error(parseErrorMessage(payload, "Nao foi possivel salvar o vinculo."));
      }

      await refreshAfterMutation(form.vinculo_id ? "Vinculo atualizado." : "Professor vinculado.", payload);
      setForm(EMPTY_FORM);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Nao foi possivel salvar o vinculo.");
    } finally {
      setSaving(false);
    }
  }

  async function handleDefinirPrincipal(vinculoId: number) {
    setSaving(true);
    setError(null);
    setSuccess(null);

    try {
      const response = await fetch(`/api/turmas/${turmaId}/professores`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "definir_principal", vinculo_id: vinculoId }),
      });

      const payload = (await response.json().catch(() => null)) as ProfessoresPayload | null;
      if (!response.ok) {
        throw new Error(parseErrorMessage(payload, "Nao foi possivel definir o professor principal."));
      }

      await refreshAfterMutation("Professor principal atualizado.", payload);
      if (form.vinculo_id === vinculoId) {
        setForm((current) => ({ ...current, principal: true }));
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Nao foi possivel definir o professor principal.");
    } finally {
      setSaving(false);
    }
  }

  async function handleEncerrar(vinculoId: number) {
    setSaving(true);
    setError(null);
    setSuccess(null);

    try {
      const response = await fetch(`/api/turmas/${turmaId}/professores`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "encerrar", vinculo_id: vinculoId }),
      });

      const payload = (await response.json().catch(() => null)) as ProfessoresPayload | null;
      if (!response.ok) {
        throw new Error(parseErrorMessage(payload, "Nao foi possivel encerrar o vinculo."));
      }

      await refreshAfterMutation("Vinculo encerrado.", payload);
      if (form.vinculo_id === vinculoId) {
        setForm(EMPTY_FORM);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Nao foi possivel encerrar o vinculo.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-6xl p-0">
        <DialogHeader className="border-b border-slate-200 px-6 py-5">
          <DialogTitle>Professores da turma</DialogTitle>
          <DialogDescription>
            Mantenha os vinculos atuais e o historico da turma sem perder quem entrou, saiu ou assumiu como principal.
          </DialogDescription>
          {error ? <p className="text-xs font-medium text-rose-600">{error}</p> : null}
          {success ? <p className="text-xs font-medium text-emerald-600">{success}</p> : null}
        </DialogHeader>

        <div className="space-y-6 px-6 py-5">
          <div className="rounded-2xl border border-sky-200 bg-sky-50 px-4 py-3 text-sm text-sky-900">
            O principal atual continua sincronizado com <code>turmas.professor_id</code>, mas o historico oficial permanece em <code>turma_professores</code>.
          </div>

          <div className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
            <div className="space-y-6">
              <section className="space-y-3">
                <div className="text-sm font-semibold text-slate-900">Vinculos atuais</div>
                {loading ? (
                  <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-4 py-6 text-sm text-slate-500">
                    Carregando vinculos atuais...
                  </div>
                ) : atuais.length === 0 ? (
                  <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-4 py-6 text-sm text-slate-500">
                    Nenhum professor ou estagiario vinculado no momento.
                  </div>
                ) : (
                  <div className="space-y-3">
                    {atuais.map((vinculo) => (
                      <div key={vinculo.id} className="rounded-2xl border border-slate-200 bg-white px-4 py-4 shadow-sm">
                        <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                          <div className="space-y-1">
                            <div className="flex flex-wrap items-center gap-2">
                              <div className="text-sm font-semibold text-slate-900">{vinculo.colaborador_nome}</div>
                              {vinculo.principal ? (
                                <span className="rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-[11px] font-semibold text-emerald-700">
                                  Principal
                                </span>
                              ) : null}
                            </div>
                            <div className="text-xs text-slate-500">
                              {vinculo.funcao_nome} • desde {vinculo.data_inicio ?? "sem data"}
                            </div>
                            {vinculo.observacoes ? <div className="text-xs text-slate-600">{vinculo.observacoes}</div> : null}
                          </div>
                          <div className="flex flex-wrap gap-2">
                            <Button type="button" variant="outline" size="sm" disabled={saving} onClick={() => setForm(toEditForm(vinculo))}>
                              Editar
                            </Button>
                            {!vinculo.principal ? (
                              <Button type="button" variant="outline" size="sm" disabled={saving} onClick={() => void handleDefinirPrincipal(vinculo.id)}>
                                Tornar principal
                              </Button>
                            ) : null}
                            <Button type="button" variant="outline" size="sm" disabled={saving} onClick={() => void handleEncerrar(vinculo.id)}>
                              Encerrar vinculo
                            </Button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </section>

              <section className="space-y-3">
                <div className="text-sm font-semibold text-slate-900">Historico</div>
                {loading ? (
                  <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-4 py-6 text-sm text-slate-500">
                    Carregando historico...
                  </div>
                ) : historico.length === 0 ? (
                  <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-4 py-6 text-sm text-slate-500">
                    Nenhum historico encerrado registrado nesta turma.
                  </div>
                ) : (
                  <div className="space-y-3">
                    {historico.map((vinculo) => (
                      <div key={vinculo.id} className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4">
                        <div className="text-sm font-semibold text-slate-900">{vinculo.colaborador_nome}</div>
                        <div className="mt-1 text-xs text-slate-500">
                          {vinculo.funcao_nome} • {vinculo.data_inicio ?? "sem data"} ate {vinculo.data_fim ?? "sem encerramento"}
                        </div>
                        {vinculo.observacoes ? <div className="mt-1 text-xs text-slate-600">{vinculo.observacoes}</div> : null}
                      </div>
                    ))}
                  </div>
                )}
              </section>
            </div>

            <form className="space-y-4 rounded-3xl border border-slate-200 bg-slate-50 p-5" onSubmit={handleSubmit}>
              <div className="flex items-center justify-between gap-3">
                <div>
                  <div className="text-sm font-semibold text-slate-900">{form.vinculo_id ? "Editar vinculo" : "Adicionar professor ou estagiario"}</div>
                  <div className="text-xs text-slate-500">A troca de principal nao apaga o historico anterior.</div>
                </div>
                {form.vinculo_id ? (
                  <Button type="button" variant="ghost" size="sm" onClick={() => setForm(EMPTY_FORM)} disabled={saving}>
                    Cancelar edicao
                  </Button>
                ) : null}
              </div>

              <label className="grid gap-1 text-sm text-slate-700">
                <span className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">Colaborador</span>
                <select
                  value={form.colaborador_id}
                  onChange={(event) => setForm((current) => ({ ...current, colaborador_id: event.target.value }))}
                  className="rounded-xl border border-slate-200 px-3 py-2 text-sm"
                  disabled={Boolean(form.vinculo_id)}
                >
                  <option value="">{colaboradoresUnicos.length === 0 ? "Nenhum colaborador disponivel" : "Selecione"}</option>
                  {colaboradoresUnicos.map((item) => (
                    <option key={`colaborador-${item.colaborador_id}`} value={item.colaborador_id}>
                      {item.nome}
                    </option>
                  ))}
                </select>
              </label>

              <label className="grid gap-1 text-sm text-slate-700">
                <span className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">Funcao na turma</span>
                <select
                  value={form.funcao_id}
                  onChange={(event) => setForm((current) => ({ ...current, funcao_id: event.target.value }))}
                  className="rounded-xl border border-slate-200 px-3 py-2 text-sm"
                >
                  <option value="">Selecione</option>
                  {funcoes.map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.nome}
                    </option>
                  ))}
                </select>
              </label>

              <div className="grid gap-4 md:grid-cols-2">
                <label className="grid gap-1 text-sm text-slate-700">
                  <span className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">Data inicio</span>
                  <input
                    type="date"
                    value={form.data_inicio}
                    onChange={(event) => setForm((current) => ({ ...current, data_inicio: event.target.value }))}
                    className="rounded-xl border border-slate-200 px-3 py-2 text-sm"
                  />
                </label>

                {form.vinculo_id ? (
                  <label className="grid gap-1 text-sm text-slate-700">
                    <span className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">Data fim</span>
                    <input
                      type="date"
                      value={form.data_fim}
                      onChange={(event) => setForm((current) => ({ ...current, data_fim: event.target.value, ativo: event.target.value ? false : current.ativo }))}
                      className="rounded-xl border border-slate-200 px-3 py-2 text-sm"
                    />
                  </label>
                ) : null}
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

              <label className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700">
                <input
                  type="checkbox"
                  checked={form.principal}
                  onChange={(event) => setForm((current) => ({ ...current, principal: event.target.checked }))}
                  className="h-4 w-4"
                />
                <span>Definir como principal atual</span>
              </label>

              {form.vinculo_id ? (
                <label className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700">
                  <input
                    type="checkbox"
                    checked={form.ativo}
                    onChange={(event) => setForm((current) => ({ ...current, ativo: event.target.checked, data_fim: event.target.checked ? "" : current.data_fim }))}
                    className="h-4 w-4"
                  />
                  <span>Vinculo ativo</span>
                </label>
              ) : null}

              <DialogFooter className="border-t border-slate-200 pt-4">
                <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>
                  Fechar
                </Button>
                <Button type="submit" disabled={!canSubmit}>
                  {saving ? "Salvando..." : form.vinculo_id ? "Salvar vinculo" : "Adicionar vinculo"}
                </Button>
              </DialogFooter>
            </form>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
