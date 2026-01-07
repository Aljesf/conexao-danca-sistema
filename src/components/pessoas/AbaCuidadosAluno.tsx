"use client";

import { useEffect, useMemo, useState } from "react";
import { apiJson } from "./pessoasApi";
import { PessoaPicker } from "./PessoaPicker";

type Cuidados = {
  id: number;
  pessoa_id: number;

  historico_lesoes: string | null;
  restricoes_fisicas: string | null;
  condicoes_neuro: string | null;
  tipo_sanguineo: string | null;

  alergias_alimentares: string | null;
  alergias_medicamentos: string | null;
  alergias_produtos: string | null;

  pode_consumir_acucar: string | null;
  pode_consumir_refrigerante: string | null;
  restricoes_alimentares_observacoes: string | null;

  tipo_autorizacao_saida: string | null;

  contato_emergencia_pessoa_id: number | null;
  contato_emergencia_relacao: string | null;
  contato_emergencia_observacao: string | null;
};

type Autorizado = {
  id: number;
  pessoa_cuidados_id: number;
  pessoa_autorizada_id: number;
  parentesco: string | null;
  observacoes: string | null;
  pessoa_autorizada?: { id: number; nome: string; telefone: string | null; email: string | null };
};

const TIPOS_SAIDA = [
  { value: "", label: "Nao informado" },
  { value: "APENAS_RESPONSAVEL_LEGAL", label: "Apenas responsavel legal" },
  { value: "APENAS_PESSOAS_AUTORIZADAS", label: "Apenas pessoas autorizadas" },
  { value: "QUALQUER_PESSOA_AUTORIZADA_POR_SENHA", label: "Qualquer pessoa autorizada por senha" },
  { value: "PODE_SAIR_SOZINHO", label: "Pode sair sozinho" },
];

const SIM_NAO_COND = [
  { value: "", label: "Nao informado" },
  { value: "PODE", label: "Pode" },
  { value: "EVITAR", label: "Evitar" },
  { value: "NAO_PODE", label: "Nao pode" },
];

export function AbaCuidadosAluno({ pessoaId }: { pessoaId: number }) {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [cuidados, setCuidados] = useState<Cuidados | null>(null);
  const [autorizados, setAutorizados] = useState<Autorizado[]>([]);

  const [msg, setMsg] = useState<{ type: "ok" | "err"; text: string } | null>(null);

  const showAutorizados = useMemo(() => {
    const t = cuidados?.tipo_autorizacao_saida ?? "";
    return t === "APENAS_PESSOAS_AUTORIZADAS" || t === "QUALQUER_PESSOA_AUTORIZADA_POR_SENHA";
  }, [cuidados?.tipo_autorizacao_saida]);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        setLoading(true);
        setMsg(null);

        const c = await apiJson<{ cuidados: Cuidados | null }>(`/api/pessoas/${pessoaId}/cuidados`);
        const a = await apiJson<{ items: Autorizado[] }>(`/api/pessoas/${pessoaId}/cuidados/autorizados`);

        if (!mounted) return;
        setCuidados(
          c.cuidados ?? {
            id: 0,
            pessoa_id: pessoaId,
            historico_lesoes: null,
            restricoes_fisicas: null,
            condicoes_neuro: null,
            tipo_sanguineo: null,
            alergias_alimentares: null,
            alergias_medicamentos: null,
            alergias_produtos: null,
            pode_consumir_acucar: null,
            pode_consumir_refrigerante: null,
            restricoes_alimentares_observacoes: null,
            tipo_autorizacao_saida: null,
            contato_emergencia_pessoa_id: null,
            contato_emergencia_relacao: null,
            contato_emergencia_observacao: null,
          }
        );
        setAutorizados(a.items ?? []);
      } catch (e: unknown) {
        const text = e instanceof Error ? e.message : "Erro ao carregar cuidados";
        if (mounted) setMsg({ type: "err", text });
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => {
      mounted = false;
    };
  }, [pessoaId]);

  async function salvarCuidados() {
    if (!cuidados) return;
    setSaving(true);
    setMsg(null);
    try {
      const out = await apiJson<{ cuidados: Cuidados }>(`/api/pessoas/${pessoaId}/cuidados`, {
        method: "PUT",
        body: JSON.stringify({
          historico_lesoes: cuidados.historico_lesoes,
          restricoes_fisicas: cuidados.restricoes_fisicas,
          condicoes_neuro: cuidados.condicoes_neuro,
          tipo_sanguineo: cuidados.tipo_sanguineo,

          alergias_alimentares: cuidados.alergias_alimentares,
          alergias_medicamentos: cuidados.alergias_medicamentos,
          alergias_produtos: cuidados.alergias_produtos,

          pode_consumir_acucar: cuidados.pode_consumir_acucar,
          pode_consumir_refrigerante: cuidados.pode_consumir_refrigerante,
          restricoes_alimentares_observacoes: cuidados.restricoes_alimentares_observacoes,

          tipo_autorizacao_saida: cuidados.tipo_autorizacao_saida,

          contato_emergencia_pessoa_id: cuidados.contato_emergencia_pessoa_id,
          contato_emergencia_relacao: cuidados.contato_emergencia_relacao,
          contato_emergencia_observacao: cuidados.contato_emergencia_observacao,
        }),
      });
      setCuidados(out.cuidados);
      setMsg({ type: "ok", text: "Cuidados salvos com sucesso." });
    } catch (e: unknown) {
      const text = e instanceof Error ? e.message : "Erro ao salvar cuidados";
      setMsg({ type: "err", text });
    } finally {
      setSaving(false);
    }
  }

  async function adicionarAutorizado(pessoaAutorizadaId: number) {
    setMsg(null);
    try {
      await apiJson<{ item: Autorizado }>(`/api/pessoas/${pessoaId}/cuidados/autorizados`, {
        method: "POST",
        body: JSON.stringify({ pessoa_autorizada_id: pessoaAutorizadaId }),
      });
      const a = await apiJson<{ items: Autorizado[] }>(`/api/pessoas/${pessoaId}/cuidados/autorizados`);
      setAutorizados(a.items ?? []);
      setMsg({ type: "ok", text: "Autorizado adicionado." });
    } catch (e: unknown) {
      const text = e instanceof Error ? e.message : "Erro ao adicionar autorizado";
      setMsg({ type: "err", text });
    }
  }

  async function salvarAutorizado(item: Autorizado) {
    setMsg(null);
    try {
      await apiJson<{ item: Autorizado }>(`/api/pessoas/${pessoaId}/cuidados/autorizados`, {
        method: "PUT",
        body: JSON.stringify({ id: item.id, parentesco: item.parentesco, observacoes: item.observacoes }),
      });
      setMsg({ type: "ok", text: "Autorizado atualizado." });
    } catch (e: unknown) {
      const text = e instanceof Error ? e.message : "Erro ao atualizar autorizado";
      setMsg({ type: "err", text });
    }
  }

  async function removerAutorizado(id: number) {
    setMsg(null);
    try {
      await apiJson<{ ok: true }>(`/api/pessoas/${pessoaId}/cuidados/autorizados?id=${id}`, { method: "DELETE" });
      setAutorizados((prev) => prev.filter((x) => x.id !== id));
      setMsg({ type: "ok", text: "Autorizado removido." });
    } catch (e: unknown) {
      const text = e instanceof Error ? e.message : "Erro ao remover autorizado";
      setMsg({ type: "err", text });
    }
  }

  if (loading) {
    return <div className="bg-white border rounded-2xl shadow-sm p-6">Carregando cuidados...</div>;
  }

  if (!cuidados) {
    return <div className="bg-white border rounded-2xl shadow-sm p-6">Nao foi possivel carregar os cuidados.</div>;
  }

  return (
    <div className="bg-white border rounded-2xl shadow-sm p-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h3 className="text-base font-semibold">Cuidados do aluno</h3>
          <p className="text-sm text-slate-600">Ficha de saude, saida e emergencias (com historico operacional).</p>
          {msg ? (
            <div className={`mt-3 text-sm ${msg.type === "ok" ? "text-emerald-700" : "text-red-700"}`}>{msg.text}</div>
          ) : null}
        </div>
        <button
          className="px-4 py-2 rounded-xl bg-violet-600 text-white text-sm disabled:opacity-60"
          onClick={salvarCuidados}
          disabled={saving}
        >
          {saving ? "Salvando..." : "Salvar"}
        </button>
      </div>

      <div className="mt-5 grid grid-cols-1 md:grid-cols-2 gap-4">
        <label className="text-sm md:col-span-2">
          <div className="mb-1 font-medium">Historico de lesoes</div>
          <textarea
            className="w-full border rounded-xl px-3 py-2 min-h-20"
            value={cuidados.historico_lesoes ?? ""}
            onChange={(e) => setCuidados({ ...cuidados, historico_lesoes: e.target.value || null })}
          />
        </label>

        <label className="text-sm md:col-span-2">
          <div className="mb-1 font-medium">Restricoes fisicas</div>
          <textarea
            className="w-full border rounded-xl px-3 py-2 min-h-20"
            value={cuidados.restricoes_fisicas ?? ""}
            onChange={(e) => setCuidados({ ...cuidados, restricoes_fisicas: e.target.value || null })}
          />
        </label>

        <label className="text-sm md:col-span-2">
          <div className="mb-1 font-medium">Condicoes neurologicas</div>
          <textarea
            className="w-full border rounded-xl px-3 py-2 min-h-20"
            value={cuidados.condicoes_neuro ?? ""}
            onChange={(e) => setCuidados({ ...cuidados, condicoes_neuro: e.target.value || null })}
          />
        </label>

        <label className="text-sm">
          <div className="mb-1 font-medium">Tipo sanguineo</div>
          <input
            className="w-full border rounded-xl px-3 py-2"
            value={cuidados.tipo_sanguineo ?? ""}
            onChange={(e) => setCuidados({ ...cuidados, tipo_sanguineo: e.target.value || null })}
            placeholder="Ex: O+, A-"
          />
        </label>

        <div />

        <label className="text-sm">
          <div className="mb-1 font-medium">Pode consumir acucar?</div>
          <select
            className="w-full border rounded-xl px-3 py-2"
            value={cuidados.pode_consumir_acucar ?? ""}
            onChange={(e) => setCuidados({ ...cuidados, pode_consumir_acucar: e.target.value || null })}
          >
            {SIM_NAO_COND.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </label>

        <label className="text-sm">
          <div className="mb-1 font-medium">Pode consumir refrigerante?</div>
          <select
            className="w-full border rounded-xl px-3 py-2"
            value={cuidados.pode_consumir_refrigerante ?? ""}
            onChange={(e) => setCuidados({ ...cuidados, pode_consumir_refrigerante: e.target.value || null })}
          >
            {SIM_NAO_COND.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </label>

        <label className="text-sm md:col-span-2">
          <div className="mb-1 font-medium">Restricoes alimentares (observacoes)</div>
          <textarea
            className="w-full border rounded-xl px-3 py-2 min-h-20"
            value={cuidados.restricoes_alimentares_observacoes ?? ""}
            onChange={(e) => setCuidados({ ...cuidados, restricoes_alimentares_observacoes: e.target.value || null })}
          />
        </label>

        <label className="text-sm md:col-span-2">
          <div className="mb-1 font-medium">Alergias alimentares</div>
          <textarea
            className="w-full border rounded-xl px-3 py-2 min-h-16"
            value={cuidados.alergias_alimentares ?? ""}
            onChange={(e) => setCuidados({ ...cuidados, alergias_alimentares: e.target.value || null })}
          />
        </label>

        <label className="text-sm md:col-span-2">
          <div className="mb-1 font-medium">Alergias medicamentos</div>
          <textarea
            className="w-full border rounded-xl px-3 py-2 min-h-16"
            value={cuidados.alergias_medicamentos ?? ""}
            onChange={(e) => setCuidados({ ...cuidados, alergias_medicamentos: e.target.value || null })}
          />
        </label>

        <label className="text-sm md:col-span-2">
          <div className="mb-1 font-medium">Alergias produtos</div>
          <textarea
            className="w-full border rounded-xl px-3 py-2 min-h-16"
            value={cuidados.alergias_produtos ?? ""}
            onChange={(e) => setCuidados({ ...cuidados, alergias_produtos: e.target.value || null })}
          />
        </label>

        <div className="md:col-span-2 border-t pt-4 mt-2">
          <div className="text-sm font-semibold">Saida e emergencia</div>
        </div>

        <label className="text-sm md:col-span-2">
          <div className="mb-1 font-medium">Tipo de autorizacao de saida</div>
          <select
            className="w-full border rounded-xl px-3 py-2"
            value={cuidados.tipo_autorizacao_saida ?? ""}
            onChange={(e) => setCuidados({ ...cuidados, tipo_autorizacao_saida: e.target.value || null })}
          >
            {TIPOS_SAIDA.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </label>

        <div className="text-sm">
          <PessoaPicker
            label="Contato de emergencia"
            valueId={cuidados.contato_emergencia_pessoa_id ?? null}
            onChangeId={(id) => setCuidados({ ...cuidados, contato_emergencia_pessoa_id: id })}
            allowCreate={true}
            placeholder="Digite o nome, CPF ou telefone"
          />
        </div>

        <label className="text-sm">
          <div className="mb-1 font-medium">Relacao</div>
          <input
            className="w-full border rounded-xl px-3 py-2"
            value={cuidados.contato_emergencia_relacao ?? ""}
            onChange={(e) => setCuidados({ ...cuidados, contato_emergencia_relacao: e.target.value || null })}
            placeholder="Ex: mae, pai, tio"
          />
        </label>

        <label className="text-sm md:col-span-2">
          <div className="mb-1 font-medium">Observacao (emergencia)</div>
          <input
            className="w-full border rounded-xl px-3 py-2"
            value={cuidados.contato_emergencia_observacao ?? ""}
            onChange={(e) => setCuidados({ ...cuidados, contato_emergencia_observacao: e.target.value || null })}
          />
        </label>
      </div>

      {showAutorizados ? (
        <div className="mt-6 border-t pt-5">
          <div className="flex items-center justify-between gap-3">
            <div>
              <div className="text-sm font-semibold">Pessoas autorizadas a buscar</div>
              <div className="text-xs text-slate-600">Lista usada apenas quando o tipo de saida exige.</div>
            </div>
            <AdicionarAutorizado onAdd={adicionarAutorizado} />
          </div>

          <div className="mt-3 flex flex-col gap-3">
            {autorizados.length === 0 ? (
              <div className="text-sm text-slate-600">Nenhuma pessoa autorizada cadastrada.</div>
            ) : (
              autorizados.map((a) => (
                <div key={a.id} className="border rounded-xl p-4">
                  <div className="font-medium">
                    {a.pessoa_autorizada?.nome ?? `Pessoa #${a.pessoa_autorizada_id}`}
                  </div>
                  <div className="text-xs text-slate-600">
                    {a.pessoa_autorizada?.telefone ?? ""} {a.pessoa_autorizada?.email ? `- ${a.pessoa_autorizada.email}` : ""}
                  </div>

                  <div className="mt-3 grid grid-cols-1 md:grid-cols-2 gap-3 items-end">
                    <label className="text-sm">
                      <div className="mb-1 font-medium">Parentesco</div>
                      <input
                        className="w-full border rounded-xl px-3 py-2"
                        value={a.parentesco ?? ""}
                        onChange={(e) =>
                          setAutorizados((prev) => prev.map((x) => (x.id === a.id ? { ...x, parentesco: e.target.value || null } : x)))
                        }
                      />
                    </label>

                    <label className="text-sm">
                      <div className="mb-1 font-medium">Observacoes</div>
                      <input
                        className="w-full border rounded-xl px-3 py-2"
                        value={a.observacoes ?? ""}
                        onChange={(e) =>
                          setAutorizados((prev) => prev.map((x) => (x.id === a.id ? { ...x, observacoes: e.target.value || null } : x)))
                        }
                      />
                    </label>

                    <div className="md:col-span-2 flex gap-2">
                      <button
                        className="px-3 py-2 rounded-xl bg-slate-900 text-white text-sm"
                        onClick={() => salvarAutorizado(a)}
                      >
                        Salvar
                      </button>
                      <button
                        className="px-3 py-2 rounded-xl border text-sm"
                        onClick={() => removerAutorizado(a.id)}
                      >
                        Remover
                      </button>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      ) : null}
    </div>
  );
}

function AdicionarAutorizado({ onAdd }: { onAdd: (id: number) => void }) {
  const [selecionadoId, setSelecionadoId] = useState<number | null>(null);

  return (
    <div className="grid gap-2">
      <PessoaPicker
        label="Pessoa autorizada"
        valueId={selecionadoId}
        onChangeId={(id) => setSelecionadoId(id)}
        allowCreate={true}
        placeholder="Digite o nome, CPF ou telefone"
      />
      <button
        className="px-3 py-2 rounded-xl bg-violet-600 text-white text-sm disabled:opacity-60"
        disabled={!selecionadoId}
        onClick={() => {
          if (!selecionadoId) return;
          onAdd(selecionadoId);
          setSelecionadoId(null);
        }}
      >
        Adicionar
      </button>
    </div>
  );
}
