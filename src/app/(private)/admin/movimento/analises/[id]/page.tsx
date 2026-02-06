"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import SectionCard from "@/components/layout/SectionCard";
import { AseContexto, ASE_PERGUNTAS, filtrarPerguntasPorContexto } from "@/lib/movimento/aseQuestionario";

type AseRow = {
  id: string;
  pessoa_id: number;
  responsavel_legal_pessoa_id: number | null;
  data_analise: string;
  contexto: AseContexto;
  status: "RASCUNHO" | "CONCLUIDA" | "REVISADA";
  respostas_json: Record<string, unknown>;
  resultado_status: "NECESSITA_APOIO" | "APOIO_PARCIAL" | "SEM_APOIO" | null;
  observacao_institucional: string | null;
  data_sugerida_revisao: string | null;
};

function isAtivaCondicional(perguntaId: string, respostas: Record<string, unknown>): boolean {
  const p = ASE_PERGUNTAS.find((x) => x.id === perguntaId);
  if (!p?.condicional) return true;
  const v = respostas[p.condicional.dependeDeId];
  if (typeof v !== "string") return false;
  return p.condicional.valoresQueAtivam.includes(v);
}

export default function AdminMovimentoAseDetalhePage() {
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const id = params?.id;

  const [row, setRow] = useState<AseRow | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    if (!id) return () => undefined;

    setLoading(true);
    setErr(null);

    fetch(`/api/admin/movimento/analises/${id}`, { cache: "no-store" })
      .then(async (res) => ({ ok: res.ok, json: await res.json() }))
      .then(({ ok, json }) => {
        if (!alive) return;
        if (!ok || json.ok === false) {
          setErr(json?.codigo || json?.error || "Falha ao carregar.");
          return;
        }
        setRow((json.data ?? null) as AseRow | null);
      })
      .catch((error: unknown) => {
        if (!alive) return;
        setErr(error instanceof Error ? error.message : "Erro desconhecido");
      })
      .finally(() => {
        if (!alive) return;
        setLoading(false);
      });

    return () => {
      alive = false;
    };
  }, [id]);

  const perguntas = useMemo(() => {
    if (!row) return [];
    return filtrarPerguntasPorContexto(row.contexto);
  }, [row]);

  function setResposta(pid: string, value: unknown) {
    setRow((prev) => {
      if (!prev) return prev;
      return { ...prev, respostas_json: { ...prev.respostas_json, [pid]: value } };
    });
  }

  async function salvar() {
    if (!row) return;
    setSaving(true);
    setErr(null);
    setMsg(null);
    try {
      const res = await fetch(`/api/admin/movimento/analises/${row.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          responsavel_legal_pessoa_id: row.responsavel_legal_pessoa_id,
          data_analise: row.data_analise,
          contexto: row.contexto,
          status: row.status,
          respostas_json: row.respostas_json,
          resultado_status: row.resultado_status,
          observacao_institucional: row.observacao_institucional,
          data_sugerida_revisao: row.data_sugerida_revisao,
        }),
      });
      const json = (await res.json()) as { ok: boolean; error?: string; codigo?: string };
      if (!json.ok) throw new Error(json.error || json.codigo || "Falha ao salvar.");
      setMsg("Salvo com sucesso.");
    } catch (e: unknown) {
      setErr(e instanceof Error ? e.message : "Erro desconhecido");
    } finally {
      setSaving(false);
    }
  }

  async function cadastrarBeneficiario() {
    if (!row) return;
    setSaving(true);
    setErr(null);
    setMsg(null);
    try {
      const res = await fetch("/api/admin/movimento/beneficiarios", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          analise_id: row.id,
          pessoa_id: row.pessoa_id,
        }),
      });
      const json = (await res.json()) as
        | {
            ok?: boolean;
            error?: string;
            codigo?: string;
            message?: string;
            details?: unknown;
          }
        | null;
      if (!json?.ok) {
        const details =
          typeof json?.details === "string"
            ? json.details
            : json?.details
              ? JSON.stringify(json.details)
              : null;
        const msgBase =
          json?.message ?? json?.error ?? json?.codigo ?? "Falha ao cadastrar beneficiario.";
        throw new Error(details ? `${msgBase} (${details})` : msgBase);
      }
      setMsg("Beneficiario cadastrado com sucesso.");
    } catch (e: unknown) {
      setErr(e instanceof Error ? e.message : "Erro desconhecido");
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="min-h-[calc(100vh-4rem)] bg-gradient-to-b from-slate-50 to-white px-4 py-6">
        <div className="mx-auto max-w-6xl text-sm text-slate-600">Carregando...</div>
      </div>
    );
  }

  if (!row) {
    return (
      <div className="min-h-[calc(100vh-4rem)] bg-gradient-to-b from-slate-50 to-white px-4 py-6">
        <div className="mx-auto max-w-6xl text-sm text-red-600">{err ?? "Nao encontrado."}</div>
      </div>
    );
  }

  return (
    <div className="min-h-[calc(100vh-4rem)] bg-gradient-to-b from-slate-50 to-white px-4 py-6">
      <div className="mx-auto flex max-w-6xl flex-col gap-4">
        <SectionCard
          title={`ASE - ${row.id}`}
          description="Edite as respostas e finalize a analise. Para cadastrar beneficiario, e recomendado que a ASE esteja CONCLUIDA."
        >
          <div className="grid gap-3 md:grid-cols-3">
            <div className="text-sm text-slate-600">
              Aluno (pessoa_id): <b>{row.pessoa_id}</b>
            </div>
            <div className="text-sm text-slate-600">
              Responsavel legal: <b>{row.responsavel_legal_pessoa_id ?? "-"}</b>
            </div>
            <div className="text-sm text-slate-600">
              Contexto: <b>{row.contexto}</b>
            </div>
          </div>

          <div className="mt-3 grid gap-3 md:grid-cols-3">
            <label className="space-y-1">
              <div className="text-sm font-medium">Data</div>
              <input
                type="date"
                className="w-full rounded-md border px-3 py-2"
                value={row.data_analise ?? ""}
                onChange={(e) => setRow({ ...row, data_analise: e.target.value })}
              />
            </label>

            <label className="space-y-1">
              <div className="text-sm font-medium">Status</div>
              <select
                className="w-full rounded-md border px-3 py-2"
                value={row.status}
                onChange={(e) => setRow({ ...row, status: e.target.value as AseRow["status"] })}
              >
                <option value="RASCUNHO">RASCUNHO</option>
                <option value="CONCLUIDA">CONCLUIDA</option>
                <option value="REVISADA">REVISADA</option>
              </select>
            </label>

            <label className="space-y-1">
              <div className="text-sm font-medium">Resultado</div>
              <select
                className="w-full rounded-md border px-3 py-2"
                value={row.resultado_status ?? ""}
                onChange={(e) =>
                  setRow({
                    ...row,
                    resultado_status: (e.target.value || null) as AseRow["resultado_status"],
                  })
                }
              >
                <option value="">(nao definido)</option>
                <option value="NECESSITA_APOIO">NECESSITA_APOIO</option>
                <option value="APOIO_PARCIAL">APOIO_PARCIAL</option>
                <option value="SEM_APOIO">SEM_APOIO</option>
              </select>
            </label>
          </div>

          <div className="mt-3 grid gap-3 md:grid-cols-2">
            <label className="space-y-1">
              <div className="text-sm font-medium">Observacao institucional</div>
              <textarea
                className="min-h-[96px] w-full rounded-md border px-3 py-2"
                value={row.observacao_institucional ?? ""}
                onChange={(e) => setRow({ ...row, observacao_institucional: e.target.value })}
              />
            </label>

            <label className="space-y-1">
              <div className="text-sm font-medium">Data sugerida para revisao</div>
              <input
                type="date"
                className="w-full rounded-md border px-3 py-2"
                value={row.data_sugerida_revisao ?? ""}
                onChange={(e) => setRow({ ...row, data_sugerida_revisao: e.target.value })}
              />
            </label>
          </div>

          {err ? <div className="mt-3 text-sm text-red-600">{err}</div> : null}
          {msg ? <div className="mt-3 text-sm text-emerald-700">{msg}</div> : null}

          <div className="mt-4 flex flex-wrap gap-2">
            <button
              onClick={() => void salvar()}
              disabled={saving}
              className="rounded-md bg-violet-600 px-4 py-2 text-sm font-medium text-white hover:bg-violet-700 disabled:opacity-50"
            >
              {saving ? "Salvando..." : "Salvar"}
            </button>
            <button
              onClick={() => void cadastrarBeneficiario()}
              disabled={saving}
              className="rounded-md bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-50"
              title="Recomendado: ASE em status CONCLUIDA"
            >
              Cadastrar Beneficiario
            </button>
            <button
              onClick={() => router.push("/admin/movimento/analises")}
              className="rounded-md border px-4 py-2 text-sm font-medium hover:bg-slate-50"
            >
              Voltar
            </button>
          </div>
        </SectionCard>

        <SectionCard title="Respostas" description="Questionario completo conforme o contexto.">
          <div className="space-y-4">
            {perguntas.map((p) => {
              if (p.condicional && !isAtivaCondicional(p.id, row.respostas_json)) return null;

              const val = row.respostas_json[p.id];

              return (
                <div key={p.id} className="rounded-lg border bg-white p-3">
                  <div className="flex flex-wrap items-baseline justify-between gap-2">
                    <div className="font-medium">
                      {p.id} - {p.pergunta}
                    </div>
                    <div className="text-xs text-slate-500">
                      Autor: <b>{p.autor}</b> - Obrig.: <b>{p.obrigatoriedade[row.contexto]}</b>
                    </div>
                  </div>

                  <div className="mt-2">
                    {p.tipo === "OPCOES" && p.opcoes ? (
                      <select
                        className="w-full rounded-md border px-3 py-2"
                        value={typeof val === "string" ? val : ""}
                        onChange={(e) => setResposta(p.id, e.target.value)}
                      >
                        <option value="">Selecione...</option>
                        {p.opcoes.map((op) => (
                          <option key={op} value={op}>
                            {op}
                          </option>
                        ))}
                      </select>
                    ) : p.tipo === "MULTI_CHECK" && p.opcoes ? (
                      <div className="space-y-2">
                        {p.opcoes.map((op) => {
                          const arr = Array.isArray(val) ? (val as string[]) : [];
                          const checked = arr.includes(op);
                          return (
                            <label key={op} className="flex items-center gap-2 text-sm">
                              <input
                                type="checkbox"
                                checked={checked}
                                onChange={(e) => {
                                  const next = e.target.checked
                                    ? Array.from(new Set([...arr, op]))
                                    : arr.filter((x) => x !== op);
                                  setResposta(p.id, next);
                                }}
                              />
                              <span>{op}</span>
                            </label>
                          );
                        })}
                      </div>
                    ) : (
                      <textarea
                        className="min-h-[88px] w-full rounded-md border px-3 py-2"
                        value={typeof val === "string" ? val : ""}
                        onChange={(e) => setResposta(p.id, e.target.value)}
                        placeholder="Digite a resposta..."
                      />
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </SectionCard>
      </div>
    </div>
  );
}
