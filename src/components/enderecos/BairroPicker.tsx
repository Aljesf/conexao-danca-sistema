"use client";

import { useEffect, useState } from "react";
import { EnderecoModal } from "./EnderecoModal";

type Item = { id: number; nome: string; cidade_id: number };

export function BairroPicker({
  cidadeId,
  valueId,
  valueItem,
  onChange,
}: {
  cidadeId: number | null;
  valueId: number | null;
  valueItem?: Item | null;
  onChange: (id: number | null, item?: Item | null) => void;
}) {
  const [q, setQ] = useState("");
  const [items, setItems] = useState<Item[]>([]);
  const [open, setOpen] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const [createNome, setCreateNome] = useState("");
  const [creating, setCreating] = useState(false);
  const [createMsg, setCreateMsg] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    const t = setTimeout(async () => {
      if (!cidadeId) {
        if (mounted) setItems([]);
        return;
      }
      const res = await fetch(`/api/enderecos/bairros?cidade_id=${cidadeId}&q=${encodeURIComponent(q)}`, {
        credentials: "include",
      });
      const json = (await res.json()) as { items: Item[] };
      if (mounted) setItems(json.items ?? []);
    }, 250);
    return () => {
      mounted = false;
      clearTimeout(t);
    };
  }, [cidadeId, q]);

  const selected = valueItem ?? items.find((x) => x.id === valueId) ?? null;
  const canCreate = Boolean(cidadeId) && q.trim() !== "" && items.length === 0;

  useEffect(() => {
    setItems([]);
    setQ("");
    setOpen(false);
    setCreateOpen(false);
    setCreateMsg(null);
  }, [cidadeId]);

  async function handleCreate() {
    if (!cidadeId) {
      setCreateMsg("Selecione uma cidade primeiro.");
      return;
    }
    const nome = createNome.trim();
    if (!nome) {
      setCreateMsg("Informe o nome do bairro.");
      return;
    }

    try {
      setCreating(true);
      setCreateMsg(null);
      const res = await fetch("/api/enderecos/bairros", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ cidade_id: cidadeId, nome }),
      });
      const json = (await res.json().catch(() => null)) as { item?: Item; error?: string } | null;
      if (!res.ok) {
        throw new Error(json?.error ?? "Erro ao cadastrar bairro.");
      }
      if (!json?.item?.id) {
        throw new Error("Resposta invalida ao cadastrar bairro.");
      }
      onChange(json.item.id, json.item);
      setCreateOpen(false);
      setOpen(false);
      setQ("");
      setCreateNome("");
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Erro ao cadastrar bairro.";
      setCreateMsg(msg);
    } finally {
      setCreating(false);
    }
  }

  return (
    <div className="relative">
      <input
        className="w-full border rounded-xl px-3 py-2 disabled:bg-slate-50"
        value={selected ? selected.nome : q}
        onChange={(e) => {
          setQ(e.target.value);
          setOpen(true);
          onChange(null, null);
        }}
        onFocus={() => setOpen(true)}
        placeholder={cidadeId ? "Digite o bairro" : "Selecione a cidade primeiro"}
        disabled={!cidadeId}
      />
      {open && cidadeId ? (
        <div className="absolute z-20 mt-2 w-full bg-white border rounded-xl shadow-sm max-h-64 overflow-auto">
          {items.length === 0 ? (
            canCreate ? (
              <button
                type="button"
                className="w-full text-left px-3 py-2 text-sm text-violet-600 hover:bg-slate-50"
                onClick={() => {
                  setCreateNome(q.trim());
                  setCreateMsg(null);
                  setCreateOpen(true);
                  setOpen(false);
                }}
              >
                Criar novo bairro: {q.trim()}
              </button>
            ) : (
              <div className="px-3 py-2 text-sm text-slate-600">Nenhum bairro encontrado.</div>
            )
          ) : (
            items.map((it) => (
              <button
                type="button"
                key={it.id}
                className="w-full text-left px-3 py-2 text-sm hover:bg-slate-50"
                onClick={() => {
                  onChange(it.id, it);
                  setQ("");
                  setOpen(false);
                }}
              >
                {it.nome}
              </button>
            ))
          )}
        </div>
      ) : null}
      <EnderecoModal open={createOpen} title="Cadastrar bairro" onClose={() => setCreateOpen(false)}>
        <div className="space-y-4">
          {createMsg ? <div className="text-sm text-rose-600">{createMsg}</div> : null}
          <div className="text-sm text-slate-600">Cidade ID: {cidadeId ?? "-"}</div>
          <label className="text-sm">
            <div className="mb-1 font-medium">Nome do bairro</div>
            <input
              className="w-full border rounded-xl px-3 py-2"
              value={createNome}
              onChange={(e) => setCreateNome(e.target.value)}
              placeholder="Ex: Centro"
            />
          </label>
          <div className="flex justify-end">
            <button
              type="button"
              className="rounded-xl bg-violet-600 px-4 py-2 text-sm text-white disabled:opacity-60"
              onClick={handleCreate}
              disabled={creating}
            >
              {creating ? "Salvando..." : "Salvar bairro"}
            </button>
          </div>
        </div>
      </EnderecoModal>
    </div>
  );
}
