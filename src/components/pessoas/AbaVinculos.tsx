"use client";

import { useCallback, useEffect, useState } from "react";
import { apiJson } from "./pessoasApi";
import { PessoaPicker } from "./PessoaPicker";

type Vinculo = {
  id: number;
  aluno_id: number;
  responsavel_id: number;
  parentesco: string | null;
  is_responsavel_financeiro?: boolean;
  is_responsavel_principal?: boolean;
  responsavel?: { id: number; nome: string; email: string | null; telefone: string | null };
};

export function AbaVinculos({ pessoaId }: { pessoaId: number }) {
  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState<Vinculo[]>([]);
  const [msg, setMsg] = useState<{ type: "ok" | "err"; text: string } | null>(null);
  const [novo, setNovo] = useState<{
    responsavel_id: number | null;
    parentesco: string;
    is_responsavel_financeiro: boolean;
    is_responsavel_principal: boolean;
  }>({
    responsavel_id: null,
    parentesco: "",
    is_responsavel_financeiro: false,
    is_responsavel_principal: false,
  });

  const reload = useCallback(async () => {
    const out = await apiJson<{ items: Vinculo[] }>(`/api/pessoas/${pessoaId}/responsaveis`);
    setItems(out.items ?? []);
  }, [pessoaId]);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        setLoading(true);
        setMsg(null);
        if (!mounted) return;
        await reload();
      } catch (e: unknown) {
        const text = e instanceof Error ? e.message : "Erro ao carregar vinculos";
        if (mounted) setMsg({ type: "err", text });
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => {
      mounted = false;
    };
  }, [reload]);

  async function add() {
    setMsg(null);
    try {
      if (!novo.responsavel_id) throw new Error("Selecione um responsavel.");

      await apiJson(`/api/pessoas/${pessoaId}/responsaveis`, {
        method: "POST",
        body: JSON.stringify({
          responsavel_id: novo.responsavel_id,
          parentesco: novo.parentesco || null,
          is_responsavel_financeiro: novo.is_responsavel_financeiro,
          is_responsavel_principal: novo.is_responsavel_principal,
        }),
      });

      setNovo({
        responsavel_id: null,
        parentesco: "",
        is_responsavel_financeiro: false,
        is_responsavel_principal: false,
      });
      await reload();
      setMsg({ type: "ok", text: "Vinculo adicionado." });
    } catch (e: unknown) {
      const text = e instanceof Error ? e.message : "Erro ao adicionar vinculo";
      setMsg({ type: "err", text });
    }
  }

  async function save(v: Vinculo) {
    setMsg(null);
    try {
      await apiJson(`/api/pessoas/${pessoaId}/responsaveis`, {
        method: "PUT",
        body: JSON.stringify({
          vinculo_id: v.id,
          parentesco: v.parentesco,
          is_responsavel_financeiro: v.is_responsavel_financeiro ?? false,
          is_responsavel_principal: v.is_responsavel_principal ?? false,
        }),
      });
      setMsg({ type: "ok", text: "Vinculo atualizado." });
      await reload();
    } catch (e: unknown) {
      const text = e instanceof Error ? e.message : "Erro ao atualizar vinculo";
      setMsg({ type: "err", text });
    }
  }

  async function del(id: number) {
    setMsg(null);
    try {
      await apiJson(`/api/pessoas/${pessoaId}/responsaveis?vinculo_id=${id}`, { method: "DELETE" });
      setItems((prev) => prev.filter((x) => x.id !== id));
      setMsg({ type: "ok", text: "Vinculo removido." });
    } catch (e: unknown) {
      const text = e instanceof Error ? e.message : "Erro ao remover vinculo";
      setMsg({ type: "err", text });
    }
  }

  if (loading) return <div className="bg-white border rounded-2xl shadow-sm p-6">Carregando vinculos...</div>;

  return (
    <div className="bg-white border rounded-2xl shadow-sm p-6">
      <h3 className="text-base font-semibold">Vinculos</h3>
      <p className="text-sm text-slate-600">Responsaveis/familiares e marcacao de financeiro/principal.</p>

      {msg ? <div className={`mt-3 text-sm ${msg.type === "ok" ? "text-emerald-700" : "text-red-700"}`}>{msg.text}</div> : null}

      <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-3 items-end">
        <div className="md:col-span-2">
          <PessoaPicker
            label="Responsavel"
            valueId={novo.responsavel_id}
            onChangeId={(id) => setNovo((prev) => ({ ...prev, responsavel_id: id }))}
            allowCreate={true}
            placeholder="Digite o nome, CPF ou telefone"
          />
        </div>

        <label className="text-sm">
          <div className="mb-1 font-medium">Parentesco</div>
          <input
            className="w-full border rounded-xl px-3 py-2"
            value={novo.parentesco}
            onChange={(e) => setNovo({ ...novo, parentesco: e.target.value })}
            placeholder="Ex: mae, pai, avo"
          />
        </label>

        <div className="md:col-span-3 flex flex-wrap gap-4 text-sm">
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={novo.is_responsavel_financeiro}
              onChange={(e) => setNovo({ ...novo, is_responsavel_financeiro: e.target.checked })}
            />
            Responsavel financeiro (contrato)
          </label>

          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={novo.is_responsavel_principal}
              onChange={(e) => setNovo({ ...novo, is_responsavel_principal: e.target.checked })}
            />
            Responsavel principal
          </label>
        </div>

        <button
          className="px-4 py-2 rounded-xl bg-violet-600 text-white text-sm md:col-span-3 disabled:opacity-60"
          onClick={add}
          disabled={!novo.responsavel_id}
        >
          Adicionar vinculo
        </button>
      </div>

      <div className="mt-5 flex flex-col gap-3">
        {items.length === 0 ? (
          <div className="text-sm text-slate-600">Nenhum vinculo cadastrado.</div>
        ) : (
          items.map((v) => (
            <div key={v.id} className="border rounded-xl p-4">
              <div className="font-medium">{v.responsavel?.nome ?? `Pessoa #${v.responsavel_id}`}</div>
              <div className="text-xs text-slate-600">
                {v.responsavel?.telefone ?? ""} {v.responsavel?.email ? ` - ${v.responsavel.email}` : ""}
              </div>

              <div className="mt-3 grid grid-cols-1 md:grid-cols-2 gap-3 items-end">
                <label className="text-sm">
                  <div className="mb-1 font-medium">Parentesco</div>
                  <input
                    className="w-full border rounded-xl px-3 py-2"
                    value={v.parentesco ?? ""}
                    onChange={(e) =>
                      setItems((prev) => prev.map((x) => (x.id === v.id ? { ...x, parentesco: e.target.value || null } : x)))
                    }
                  />
                </label>

                <div className="flex flex-wrap gap-4 text-sm">
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={Boolean(v.is_responsavel_financeiro)}
                      onChange={(e) =>
                        setItems((prev) =>
                          prev.map((x) => (x.id === v.id ? { ...x, is_responsavel_financeiro: e.target.checked } : x)),
                        )
                      }
                    />
                    Responsavel financeiro (contrato)
                  </label>

                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={Boolean(v.is_responsavel_principal)}
                      onChange={(e) =>
                        setItems((prev) =>
                          prev.map((x) => (x.id === v.id ? { ...x, is_responsavel_principal: e.target.checked } : x)),
                        )
                      }
                    />
                    Responsavel principal
                  </label>
                </div>

                <div className="md:col-span-2 flex gap-2">
                  <button className="px-3 py-2 rounded-xl bg-slate-900 text-white text-sm" onClick={() => save(v)}>
                    Salvar
                  </button>
                  <button className="px-3 py-2 rounded-xl border text-sm" onClick={() => del(v.id)}>
                    Remover
                  </button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
