"use client";

import { useEffect, useState } from "react";
import { apiJson } from "./pessoasApi";

type Medida = {
  id: number;
  pessoa_id: number;
  categoria: string;
  tamanho: string;
  data_referencia: string | null;
  observacao: string | null;
  created_at: string;
};

export function AbaMedidasDeclaradas({ pessoaId }: { pessoaId: number }) {
  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState<Medida[]>([]);
  const [msg, setMsg] = useState<{ type: "ok" | "err"; text: string } | null>(null);

  const [novo, setNovo] = useState<{ categoria: string; tamanho: string; data_referencia: string; observacao: string }>({
    categoria: "",
    tamanho: "",
    data_referencia: "",
    observacao: "",
  });

  async function reload() {
    const out = await apiJson<{ items: Medida[] }>(`/api/pessoas/${pessoaId}/medidas`);
    setItems(out.items ?? []);
  }

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        setLoading(true);
        setMsg(null);
        if (!mounted) return;
        await reload();
      } catch (e: unknown) {
        const text = e instanceof Error ? e.message : "Erro ao carregar medidas";
        if (mounted) setMsg({ type: "err", text });
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => {
      mounted = false;
    };
  }, [pessoaId]);

  async function add() {
    setMsg(null);
    try {
      await apiJson(`/api/pessoas/${pessoaId}/medidas`, {
        method: "POST",
        body: JSON.stringify({
          categoria: novo.categoria,
          tamanho: novo.tamanho,
          data_referencia: novo.data_referencia || null,
          observacao: novo.observacao || null,
        }),
      });
      setNovo({ categoria: "", tamanho: "", data_referencia: "", observacao: "" });
      await reload();
      setMsg({ type: "ok", text: "Medida adicionada." });
    } catch (e: unknown) {
      const text = e instanceof Error ? e.message : "Erro ao adicionar medida";
      setMsg({ type: "err", text });
    }
  }

  async function del(id: number) {
    setMsg(null);
    try {
      await apiJson(`/api/pessoas/${pessoaId}/medidas?id=${id}`, { method: "DELETE" });
      setItems((prev) => prev.filter((x) => x.id !== id));
      setMsg({ type: "ok", text: "Medida removida." });
    } catch (e: unknown) {
      const text = e instanceof Error ? e.message : "Erro ao remover medida";
      setMsg({ type: "err", text });
    }
  }

  if (loading) return <div className="bg-white border rounded-2xl shadow-sm p-6">Carregando medidas...</div>;

  return (
    <div className="bg-white border rounded-2xl shadow-sm p-6">
      <h3 className="text-base font-semibold">Medidas declaradas</h3>
      <p className="text-sm text-slate-600">Registro manual (historico por data). Futuro: evidencias pela Loja.</p>

      {msg ? (
        <div className={`mt-3 text-sm ${msg.type === "ok" ? "text-emerald-700" : "text-red-700"}`}>{msg.text}</div>
      ) : null}

      <div className="mt-4 grid grid-cols-1 md:grid-cols-4 gap-3 items-end">
        <label className="text-sm">
          <div className="mb-1 font-medium">Categoria</div>
          <input className="w-full border rounded-xl px-3 py-2" value={novo.categoria} onChange={(e) => setNovo({ ...novo, categoria: e.target.value })} />
        </label>
        <label className="text-sm">
          <div className="mb-1 font-medium">Tamanho</div>
          <input className="w-full border rounded-xl px-3 py-2" value={novo.tamanho} onChange={(e) => setNovo({ ...novo, tamanho: e.target.value })} />
        </label>
        <label className="text-sm">
          <div className="mb-1 font-medium">Data referencia</div>
          <input type="date" className="w-full border rounded-xl px-3 py-2" value={novo.data_referencia} onChange={(e) => setNovo({ ...novo, data_referencia: e.target.value })} />
        </label>
        <button className="px-4 py-2 rounded-xl bg-violet-600 text-white text-sm" onClick={add} disabled={!novo.categoria || !novo.tamanho}>
          Adicionar
        </button>

        <label className="text-sm md:col-span-4">
          <div className="mb-1 font-medium">Observacao</div>
          <input className="w-full border rounded-xl px-3 py-2" value={novo.observacao} onChange={(e) => setNovo({ ...novo, observacao: e.target.value })} />
        </label>
      </div>

      <div className="mt-5 flex flex-col gap-3">
        {items.length === 0 ? (
          <div className="text-sm text-slate-600">Nenhuma medida cadastrada.</div>
        ) : (
          items.map((x) => (
            <div key={x.id} className="border rounded-xl p-4 flex items-start justify-between gap-3">
              <div>
                <div className="font-medium">
                  {x.categoria}: {x.tamanho}
                </div>
                <div className="text-xs text-slate-600">
                  {x.data_referencia ? `Referencia: ${x.data_referencia}` : "Sem data de referencia"}
                </div>
                {x.observacao ? <div className="text-sm text-slate-700 mt-1">{x.observacao}</div> : null}
              </div>
              <button className="px-3 py-2 rounded-xl border text-sm" onClick={() => del(x.id)}>
                Remover
              </button>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
