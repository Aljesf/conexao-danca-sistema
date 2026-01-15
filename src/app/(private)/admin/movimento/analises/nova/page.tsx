"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import SectionCard from "@/components/layout/SectionCard";
import { AseContexto, ASE_PERGUNTAS, filtrarPerguntasPorContexto } from "@/lib/movimento/aseQuestionario";

type Respostas = Record<string, unknown>;

type AseStatus = "RASCUNHO" | "CONCLUIDA" | "REVISADA";

type ResultadoStatus = "NECESSITA_APOIO" | "APOIO_PARCIAL" | "SEM_APOIO";

function isAtivaCondicional(perguntaId: string, respostas: Respostas): boolean {
  const p = ASE_PERGUNTAS.find((x) => x.id === perguntaId);
  if (!p?.condicional) return true;
  const v = respostas[p.condicional.dependeDeId];
  if (typeof v !== "string") return false;
  return p.condicional.valoresQueAtivam.includes(v);
}

export default function AdminMovimentoAseNovaPage() {
  const router = useRouter();
  const [contexto, setContexto] = useState<AseContexto>("ASE_MENOR");
  const [pessoaId, setPessoaId] = useState("");
  const [responsavelId, setResponsavelId] = useState("");
  const [dataAnalise, setDataAnalise] = useState("");
  const [status, setStatus] = useState<AseStatus>("RASCUNHO");
  const [resultado, setResultado] = useState<ResultadoStatus | "">("");
  const [observacao, setObservacao] = useState("");
  const [dataRevisao, setDataRevisao] = useState("");

  const [respostas, setRespostas] = useState<Respostas>({});
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const perguntas = useMemo(() => filtrarPerguntasPorContexto(contexto), [contexto]);

  function setResposta(id: string, value: unknown) {
    setRespostas((prev) => ({ ...prev, [id]: value }));
  }

  async function salvar() {
    setErr(null);

    const pid = Number(pessoaId);
    if (!pid || Number.isNaN(pid)) {
      setErr("Informe pessoa_id (aluno) valido.");
      return;
    }

    if (contexto === "ASE_MENOR") {
      const rid = Number(responsavelId);
      if (!rid || Number.isNaN(rid)) {
        setErr("No contexto ASE_MENOR, informe responsavel_legal_pessoa_id valido.");
        return;
      }
    }

    setSaving(true);
    try {
      const res = await fetch("/api/admin/movimento/analises", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          pessoa_id: Number(pessoaId),
          responsavel_legal_pessoa_id: contexto === "ASE_MENOR" ? Number(responsavelId) : null,
          data_analise: dataAnalise || undefined,
          contexto,
          respostas_json: respostas,
          status,
          resultado_status: resultado || null,
          observacao_institucional: observacao || null,
          data_sugerida_revisao: dataRevisao || null,
        }),
      });

      const json = (await res.json()) as { ok: boolean; data?: { id: string }; error?: string; codigo?: string };
      if (!json.ok) {
        throw new Error(json.error || json.codigo || "Falha ao salvar ASE.");
      }
      router.push(`/admin/movimento/analises/${json.data?.id}`);
    } catch (e: unknown) {
      setErr(e instanceof Error ? e.message : "Erro desconhecido");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="min-h-[calc(100vh-4rem)] bg-gradient-to-b from-slate-50 to-white px-4 py-6">
      <div className="mx-auto flex max-w-6xl flex-col gap-4">
        <SectionCard
          title="Nova ASE - Movimento Conexao Danca"
          description="Preencha o contexto, identifique a pessoa (aluno) e registre todas as respostas do questionario oficial."
        >
          <div className="grid gap-3 md:grid-cols-3">
            <label className="space-y-1">
              <div className="text-sm font-medium">Contexto</div>
              <select
                className="w-full rounded-md border px-3 py-2"
                value={contexto}
                onChange={(e) => setContexto(e.target.value as AseContexto)}
              >
                <option value="ASE_18_PLUS">ASE-18+ (Aluno maior)</option>
                <option value="ASE_MENOR">ASE-MENOR (Menor + responsavel + aluno)</option>
              </select>
            </label>

            <label className="space-y-1">
              <div className="text-sm font-medium">Pessoa (aluno) - pessoa_id</div>
              <input
                className="w-full rounded-md border px-3 py-2"
                value={pessoaId}
                onChange={(e) => setPessoaId(e.target.value)}
                placeholder="Ex.: 123"
              />
              <div className="text-xs text-slate-500">MVP: informe o ID. (Depois conectamos busca por pessoa.)</div>
            </label>

            <label className="space-y-1">
              <div className="text-sm font-medium">Responsavel legal - pessoa_id</div>
              <input
                className="w-full rounded-md border px-3 py-2"
                value={responsavelId}
                onChange={(e) => setResponsavelId(e.target.value)}
                placeholder="Ex.: 456"
                disabled={contexto !== "ASE_MENOR"}
              />
              <div className="text-xs text-slate-500">Obrigatorio apenas no contexto ASE-MENOR.</div>
            </label>

            <label className="space-y-1">
              <div className="text-sm font-medium">Data da analise</div>
              <input
                type="date"
                className="w-full rounded-md border px-3 py-2"
                value={dataAnalise}
                onChange={(e) => setDataAnalise(e.target.value)}
              />
            </label>

            <label className="space-y-1">
              <div className="text-sm font-medium">Status</div>
              <select
                className="w-full rounded-md border px-3 py-2"
                value={status}
                onChange={(e) => setStatus(e.target.value as AseStatus)}
              >
                <option value="RASCUNHO">RASCUNHO</option>
                <option value="CONCLUIDA">CONCLUIDA</option>
                <option value="REVISADA">REVISADA</option>
              </select>
            </label>

            <label className="space-y-1">
              <div className="text-sm font-medium">Resultado institucional</div>
              <select
                className="w-full rounded-md border px-3 py-2"
                value={resultado}
                onChange={(e) => setResultado(e.target.value as ResultadoStatus | "")}
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
                value={observacao}
                onChange={(e) => setObservacao(e.target.value)}
              />
            </label>

            <label className="space-y-1">
              <div className="text-sm font-medium">Data sugerida para revisao</div>
              <input
                type="date"
                className="w-full rounded-md border px-3 py-2"
                value={dataRevisao}
                onChange={(e) => setDataRevisao(e.target.value)}
              />
            </label>
          </div>
        </SectionCard>

        <SectionCard
          title="Questionario oficial"
          description="As perguntas exibidas dependem do contexto selecionado. Campos condicionais so aparecem quando aplicaveis."
        >
          <div className="space-y-4">
            {perguntas.map((p) => {
              if (p.condicional && !isAtivaCondicional(p.id, respostas)) return null;

              return (
                <div key={p.id} className="rounded-lg border bg-white p-3">
                  <div className="flex flex-wrap items-baseline justify-between gap-2">
                    <div className="font-medium">
                      {p.id} - {p.pergunta}
                    </div>
                    <div className="text-xs text-slate-500">
                      Autor: <b>{p.autor}</b> - Obrig.: <b>{p.obrigatoriedade[contexto]}</b>
                    </div>
                  </div>

                  <div className="mt-2">
                    {p.tipo === "OPCOES" && p.opcoes ? (
                      <select
                        className="w-full rounded-md border px-3 py-2"
                        value={typeof respostas[p.id] === "string" ? (respostas[p.id] as string) : ""}
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
                          const arr = Array.isArray(respostas[p.id]) ? (respostas[p.id] as string[]) : [];
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
                        value={typeof respostas[p.id] === "string" ? (respostas[p.id] as string) : ""}
                        onChange={(e) => setResposta(p.id, e.target.value)}
                        placeholder="Digite a resposta..."
                      />
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {err ? <div className="mt-3 text-sm text-red-600">{err}</div> : null}

          <div className="mt-4 flex flex-wrap gap-2">
            <button
              onClick={() => void salvar()}
              disabled={saving}
              className="rounded-md bg-violet-600 px-4 py-2 text-sm font-medium text-white hover:bg-violet-700 disabled:opacity-50"
            >
              {saving ? "Salvando..." : "Salvar ASE"}
            </button>
            <button
              onClick={() => router.push("/admin/movimento/analises")}
              className="rounded-md border px-4 py-2 text-sm font-medium hover:bg-slate-50"
            >
              Cancelar
            </button>
          </div>
        </SectionCard>
      </div>
    </div>
  );
}
