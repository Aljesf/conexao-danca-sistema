"use client";

import { useEffect, useState } from "react";
import { apiJson } from "./pessoasApi";

type Item = {
  id: number;
  pessoa_id: number;
  observado_em: string;
  professor_pessoa_id: number | null;
  titulo: string | null;
  descricao: string;
  professor?: { id: number; nome: string };
};

export function AbaObservacoesPedagogicas({ pessoaId }: { pessoaId: number }) {
  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState<Item[]>([]);
  const [msg, setMsg] = useState<{ type: "ok" | "err"; text: string } | null>(null);

  const [novo, setNovo] = useState<{ observado_em: string; professor_pessoa_id: string; titulo: string; descricao: string }>({
    observado_em: "",
    professor_pessoa_id: "",
    titulo: "",
    descricao: "",
  });

  async function reload() {
    const out = await apiJson<{ items: Item[] }>(`/api/pessoas/${pessoaId}/observacoes-pedagogicas`);
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
        const text = e instanceof Error ? e.message : "Erro ao carregar observacoes pedagogicas";
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
      await apiJson(`/api/pessoas/${pessoaId}/observacoes-pedagogicas`, {
        method: "POST",
        body: JSON.stringify({
          observado_em: novo.observado_em || null,
          professor_pessoa_id: novo.professor_pessoa_id ? Number(novo.professor_pessoa_id) : null,
          titulo: novo.titulo || null,
          descricao: novo.descricao,
        }),
      });
      setNovo({ observado_em: "", professor_pessoa_id: "", titulo: "", descricao: "" });
      await reload();
      setMsg({ type: "ok", text: "Observacao pedagogica adicionada." });
    } catch (e: unknown) {
      const text = e instanceof Error ? e.message : "Erro ao adicionar observacao pedagogica";
      setMsg({ type: "err", text });
    }
  }

  async function del(id: number) {
    setMsg(null);
    try {
      await apiJson(`/api/pessoas/${pessoaId}/observacoes-pedagogicas?id=${id}`, { method: "DELETE" });
      setItems((prev) => prev.filter((x) => x.id !== id));
      setMsg({ type: "ok", text: "Observacao removida." });
    } catch (e: unknown) {
      const text = e instanceof Error ? e.message : "Erro ao remover observacao";
      setMsg({ type: "err", text });
    }
  }

  if (loading) return <div className="bg-white border rounded-2xl shadow-sm p-6">Carregando observacoes pedagogicas...</div>;

  return (
    <div className="bg-white border rounded-2xl shadow-sm p-6">
      <h3 className="text-base font-semibold">Observacoes pedagogicas</h3>
      <p className="text-sm text-slate-600">Historico com data e professor (base para diario de classe).</p>

      {msg ? (
        <div className={`mt-3 text-sm ${msg.type === "ok" ? "text-emerald-700" : "text-red-700"}`}>{msg.text}</div>
      ) : null}

      <div className="mt-4 grid grid-cols-1 md:grid-cols-4 gap-3 items-end">
        <label className="text-sm">
          <div className="mb-1 font-medium">Data/hora</div>
          <input
            type="datetime-local"
            className="w-full border rounded-xl px-3 py-2"
            value={novo.observado_em}
            onChange={(e) => setNovo({ ...novo, observado_em: e.target.value })}
          />
        </label>
        <label className="text-sm">
          <div className="mb-1 font-medium">Professor (pessoa_id)</div>
          <input
            type="number"
            className="w-full border rounded-xl px-3 py-2"
            value={novo.professor_pessoa_id}
            onChange={(e) => setNovo({ ...novo, professor_pessoa_id: e.target.value })}
            placeholder="Ex: 45"
          />
          <div className="text-xs text-slate-500 mt-1">Curto prazo: informe o ID.</div>
        </label>
        <label className="text-sm md:col-span-2">
          <div className="mb-1 font-medium">Titulo</div>
          <input
            className="w-full border rounded-xl px-3 py-2"
            value={novo.titulo}
            onChange={(e) => setNovo({ ...novo, titulo: e.target.value })}
          />
        </label>

        <label className="text-sm md:col-span-4">
          <div className="mb-1 font-medium">Descricao</div>
          <textarea
            className="w-full border rounded-xl px-3 py-2 min-h-24"
            value={novo.descricao}
            onChange={(e) => setNovo({ ...novo, descricao: e.target.value })}
          />
        </label>

        <button
          className="px-4 py-2 rounded-xl bg-violet-600 text-white text-sm md:col-span-4"
          onClick={add}
          disabled={!novo.descricao}
        >
          Adicionar observacao
        </button>
      </div>

      <div className="mt-5 flex flex-col gap-3">
        {items.length === 0 ? (
          <div className="text-sm text-slate-600">Nenhuma observacao pedagogica cadastrada.</div>
        ) : (
          items.map((x) => (
            <div key={x.id} className="border rounded-xl p-4 flex items-start justify-between gap-3">
              <div>
                <div className="font-medium">
                  {x.titulo ?? "Observacao"} {x.professor?.nome ? `• ${x.professor.nome}` : x.professor_pessoa_id ? `• Professor #${x.professor_pessoa_id}` : ""}
                </div>
                <div className="text-xs text-slate-600">{x.observado_em}</div>
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
