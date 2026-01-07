"use client";

import { useEffect, useState } from "react";
import { apiJson } from "./pessoasApi";

type Obs = {
  id: number;
  pessoa_id: number;
  natureza: string;
  titulo: string | null;
  descricao: string;
  data_referencia: string | null;
  created_at: string;
};

export function AbaObservacoesGerais({ pessoaId }: { pessoaId: number }) {
  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState<Obs[]>([]);
  const [msg, setMsg] = useState<{ type: "ok" | "err"; text: string } | null>(null);

  const [novo, setNovo] = useState<{ natureza: string; titulo: string; descricao: string; data_referencia: string }>({
    natureza: "",
    titulo: "",
    descricao: "",
    data_referencia: "",
  });

  async function reload() {
    const out = await apiJson<{ items: Obs[] }>(`/api/pessoas/${pessoaId}/observacoes`);
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
        const text = e instanceof Error ? e.message : "Erro ao carregar observacoes";
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
      await apiJson(`/api/pessoas/${pessoaId}/observacoes`, {
        method: "POST",
        body: JSON.stringify({
          natureza: novo.natureza,
          titulo: novo.titulo || null,
          descricao: novo.descricao,
          data_referencia: novo.data_referencia || null,
        }),
      });
      setNovo({ natureza: "", titulo: "", descricao: "", data_referencia: "" });
      await reload();
      setMsg({ type: "ok", text: "Observacao adicionada." });
    } catch (e: unknown) {
      const text = e instanceof Error ? e.message : "Erro ao adicionar observacao";
      setMsg({ type: "err", text });
    }
  }

  async function del(id: number) {
    setMsg(null);
    try {
      await apiJson(`/api/pessoas/${pessoaId}/observacoes?id=${id}`, { method: "DELETE" });
      setItems((prev) => prev.filter((x) => x.id !== id));
      setMsg({ type: "ok", text: "Observacao removida." });
    } catch (e: unknown) {
      const text = e instanceof Error ? e.message : "Erro ao remover observacao";
      setMsg({ type: "err", text });
    }
  }

  if (loading) return <div className="bg-white border rounded-2xl shadow-sm p-6">Carregando observacoes...</div>;

  return (
    <div className="bg-white border rounded-2xl shadow-sm p-6">
      <h3 className="text-base font-semibold">Observacoes gerais</h3>
      <p className="text-sm text-slate-600">Registros tabelados por natureza (nao e "textao" unico).</p>

      {msg ? (
        <div className={`mt-3 text-sm ${msg.type === "ok" ? "text-emerald-700" : "text-red-700"}`}>{msg.text}</div>
      ) : null}

      <div className="mt-4 grid grid-cols-1 md:grid-cols-4 gap-3 items-end">
        <label className="text-sm">
          <div className="mb-1 font-medium">Natureza</div>
          <input className="w-full border rounded-xl px-3 py-2" value={novo.natureza} onChange={(e) => setNovo({ ...novo, natureza: e.target.value })} />
        </label>
        <label className="text-sm">
          <div className="mb-1 font-medium">Titulo</div>
          <input className="w-full border rounded-xl px-3 py-2" value={novo.titulo} onChange={(e) => setNovo({ ...novo, titulo: e.target.value })} />
        </label>
        <label className="text-sm">
          <div className="mb-1 font-medium">Data referencia</div>
          <input type="date" className="w-full border rounded-xl px-3 py-2" value={novo.data_referencia} onChange={(e) => setNovo({ ...novo, data_referencia: e.target.value })} />
        </label>
        <button className="px-4 py-2 rounded-xl bg-violet-600 text-white text-sm" onClick={add} disabled={!novo.natureza || !novo.descricao}>
          Adicionar
        </button>

        <label className="text-sm md:col-span-4">
          <div className="mb-1 font-medium">Descricao</div>
          <textarea className="w-full border rounded-xl px-3 py-2 min-h-20" value={novo.descricao} onChange={(e) => setNovo({ ...novo, descricao: e.target.value })} />
        </label>
      </div>

      <div className="mt-5 flex flex-col gap-3">
        {items.length === 0 ? (
          <div className="text-sm text-slate-600">Nenhuma observacao cadastrada.</div>
        ) : (
          items.map((x) => (
            <div key={x.id} className="border rounded-xl p-4 flex items-start justify-between gap-3">
              <div>
                <div className="font-medium">
                  {x.natureza}
                  {x.titulo ? ` • ${x.titulo}` : ""}
                </div>
                <div className="text-xs text-slate-600">{x.data_referencia ? `Data: ${x.data_referencia}` : "Sem data"}</div>
                <div className="text-sm text-slate-700 mt-2 whitespace-pre-wrap">{x.descricao}</div>
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
